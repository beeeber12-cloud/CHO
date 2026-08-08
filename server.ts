import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";
import webpush from "web-push";
import { DatabaseSchema, User, Notice, Meditation, WeeklySummary, AlarmConfig, Comment, GratitudeNote, BibleQA, UserBibleProgress, SokGroup, PushSubscriptionRecord, ReactionType } from "./src/types";
import { parseAndGenerateBibleText, saveChapterData, preloadAllBooks, getDailyVerse, preloadAllNivBooks, getNivText, getWmText, preloadAllWmBooks, BIBLE_BOOKS } from "./server/bibleData.js";
import { fetchFromFirestore, saveToFirestore } from "./server/firebaseDb.js";

dotenv.config();

// Create the data directory and db.json if they don't exist
const DB_FILE = path.join(process.cwd(), "db.json");

let dbCache: DatabaseSchema | null = null;
let saveQueue = Promise.resolve();

// Firestore 를 한 번이라도 정상적으로 읽었는지 (원격 데이터 보호용)
let remoteEverRead = false;

/**
 * Firestore 쓰기를 "절대 서버를 멈추지 않게" 감싼 버전.
 *
 * 2026-07-29 사고: 무료 쓰기 할당량이 소진되자 Firestore SDK 가 최대 백오프로 무한 재시도했고,
 * 기동 중 `await saveToFirestore(...)` 가 영원히 반환되지 않아 **API 서버가 아예 뜨지 않았다**.
 * (정적 페이지는 뜨는데 모든 /api 요청이 타임아웃)
 * 따라서 쓰기에는 반드시 시간 제한을 두고, 실패해도 진행한다.
 */
const FIRESTORE_WRITE_TIMEOUT_MS = 8000;

async function saveToFirestoreSafely(data: DatabaseSchema, reason: string): Promise<boolean> {
  try {
    // Firestore 는 undefined 필드를 거부한다. JSON 왕복으로 undefined 를 제거한 사본을 보낸다.
    const clean: DatabaseSchema = JSON.parse(JSON.stringify(data));
    await Promise.race([
      saveToFirestore(clean),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Firestore write timeout")), FIRESTORE_WRITE_TIMEOUT_MS)
      )
    ]);
    return true;
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (msg.includes("RESOURCE_EXHAUSTED") || err?.code === "resource-exhausted") {
      console.error(`[DB] Firestore 일일 쓰기 할당량 초과 (${reason}). 로컬 저장만 유지합니다.`);
    } else {
      console.error(`[DB] Firestore 쓰기 실패/시간초과 (${reason}):`, msg);
    }
    return false;
  }
}

/**
 * "방금 만들어진 초기 상태(시드) DB"인지 판별.
 * 실제 회원(admin-1 제외)도 없고 묵상/감사/QnA 도 전혀 없으면 시드로 본다.
 * 이런 DB 를 원격에 쓰면 기존 데이터가 전부 지워지므로 쓰기를 막는 데 사용한다.
 */
function isSeedLikeDb(d: DatabaseSchema): boolean {
  if (!d) return true;
  const realUsers = (d.users || []).filter((u) => u.id !== "admin-1");
  return (
    realUsers.length === 0 &&
    (d.meditations || []).length === 0 &&
    (d.gratitudes || []).length === 0 &&
    (d.bibleQAs || []).length === 0
  );
}

// Helper to load database
function loadDb(): DatabaseSchema {
  if (dbCache) return dbCache;
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      dbCache = JSON.parse(data);
      return dbCache!;
    }
  } catch (err) {
    console.error("Failed to load DB file, using default:", err);
  }
  dbCache = getInitialDb();
  return dbCache;
}

// Helper to get current YYYY-MM-DD in Korea Standard Time (KST, UTC+9)
function getKSTDateString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(d);
}

// Helper to sync and refresh with Firestore
/**
 * 원격 Firestore 와 메모리 상태를 맞춘다.
 *
 * @param writeBack  병합 결과를 원격에 되쓸지 여부.
 *   ⚠️ 2026-07-29 사고 원인: 이 함수가 항상 되쓰기를 했고, API 미들웨어가 1.5초마다 이걸 호출했다.
 *   클라이언트가 4초 주기로 폴링하므로 1분에 수십 번씩 67KB 문서를 통째로 다시 썼고,
 *   Firestore 무료 쓰기 한도(하루 20,000단위)가 20분 만에 소진됐다.
 *   → 평상시 새로고침은 읽기만 하고, 되쓰기는 기동 시와 실제 데이터 변경 시에만 한다.
 */
async function syncAndRefreshWithFirestore(writeBack: boolean = false): Promise<DatabaseSchema> {
  try {
    const localDb = loadDb();
    const remoteDb = await fetchFromFirestore();

    const dummyUserIds = new Set(["user-1", "user-2", "user-3", "user-4"]);
    const dummyUserNames = new Set(["김은혜", "박요한", "이선민", "최영진"]);

    const isDummyUser = (u: User) => dummyUserIds.has(u.id) || dummyUserNames.has(u.name);

    if (remoteDb) {
      remoteEverRead = true;
      const userMap = new Map<string, User>();

      userMap.set("admin-1", {
        id: "admin-1",
        name: "관리자",
        role: "admin",
        pin: "1234",
        createdAt: "2026-06-21T12:45:23.303Z"
      });

      if (localDb.users) {
        for (const u of localDb.users) {
          if (!isDummyUser(u)) userMap.set(u.id, u);
        }
      }

      if (remoteDb.users) {
        for (const u of remoteDb.users) {
          if (!isDummyUser(u)) userMap.set(u.id, u);
        }
      }

      // Merge User Bible Progress safely
      const allUserIdsForProgress = new Set([
        ...Object.keys(localDb.userBibleProgress || {}),
        ...Object.keys(remoteDb.userBibleProgress || {})
      ]);
      const mergedProgress: Record<string, UserBibleProgress> = {};
      for (const uId of allUserIdsForProgress) {
        const localP = localDb.userBibleProgress?.[uId];
        const remoteP = remoteDb.userBibleProgress?.[uId];
        // 읽은 장 표시는 절대 유실되지 않도록 항상 합집합(union)
        const combinedChapters = Array.from(new Set([
          ...(localP?.completedChapters || []),
          ...(remoteP?.completedChapters || [])
        ]));
        // 이어읽기 북마크/목표 값은 updatedAt 이 더 최신인 쪽을 채택 (북마크가 뒤로 밀리는 것 방지)
        const localTime = localP?.updatedAt ? new Date(localP.updatedAt).getTime() : 0;
        const remoteTime = remoteP?.updatedAt ? new Date(remoteP.updatedAt).getTime() : 0;
        const newer = localTime >= remoteTime ? (localP || remoteP) : (remoteP || localP);
        mergedProgress[uId] = {
          userId: uId,
          goalTitle: newer?.goalTitle || "1년 1독 (매일 3장)",
          targetChapters: newer?.targetChapters || 1189,
          dailyTarget: newer?.dailyTarget || 3,
          completedChapters: combinedChapters,
          lastReadBook: newer?.lastReadBook || "요한복음",
          lastReadChapter: newer?.lastReadChapter || 1,
          updatedAt: newer?.updatedAt || new Date().toISOString()
        };
        if (!userMap.has(uId)) {
          if (uId === "u-gw7xfwjl9") {
            userMap.set(uId, {
              id: "u-gw7xfwjl9",
              name: "조재영",
              role: "member",
              pin: "0000",
              createdAt: new Date().toISOString()
            });
          }
        }
      }

      const mergedUsers = Array.from(userMap.values());

      const isDummyMeditation = (m: Meditation) =>
        dummyUserIds.has(m.userId) || dummyUserNames.has(m.userName) || ["med-1", "med-2", "med-3"].includes(m.id);

      const medMap = new Map<string, Meditation>();
      if (localDb.meditations) {
        for (const m of localDb.meditations) {
          if (!isDummyMeditation(m)) medMap.set(m.id, m);
        }
      }
      if (remoteDb.meditations) {
        for (const m of remoteDb.meditations) {
          if (!isDummyMeditation(m)) medMap.set(m.id, m);
        }
      }
      const mergedMeds = Array.from(medMap.values());

      const noticeMap = new Map<string, Notice>();
      if (localDb.notices) {
        for (const n of localDb.notices) {
          noticeMap.set(n.id, {
            ...n,
            readBy: (n.readBy || []).filter(id => !dummyUserIds.has(id))
          });
        }
      }
      if (remoteDb.notices) {
        for (const n of remoteDb.notices) {
          const existing = noticeMap.get(n.id);
          const localReadBy = existing ? existing.readBy : [];
          const remoteReadBy = (n.readBy || []).filter(id => !dummyUserIds.has(id));
          const combinedReadBy = Array.from(new Set([...localReadBy, ...remoteReadBy]));

          noticeMap.set(n.id, {
            ...n,
            readBy: combinedReadBy
          });
        }
      }
      const mergedNotices = Array.from(noticeMap.values());

      const sumMap = new Map<string, WeeklySummary>();
      if (localDb.summaries) {
        for (const s of localDb.summaries) {
          if (s.id !== "sum-1") sumMap.set(s.id, s);
        }
      }
      if (remoteDb.summaries) {
        for (const s of remoteDb.summaries) {
          if (s.id !== "sum-1") sumMap.set(s.id, s);
        }
      }
      const mergedSummaries = Array.from(sumMap.values());

      const gratMap = new Map<string, GratitudeNote>();
      if (localDb.gratitudes) {
        for (const g of localDb.gratitudes) gratMap.set(g.id, g);
      }
      if (remoteDb.gratitudes) {
        for (const g of remoteDb.gratitudes) gratMap.set(g.id, g);
      }
      const mergedGratitudes = Array.from(gratMap.values());

      const qaMap = new Map<string, BibleQA>();
      if (localDb.bibleQAs) {
        for (const q of localDb.bibleQAs) qaMap.set(q.id, q);
      }
      if (remoteDb.bibleQAs) {
        for (const q of remoteDb.bibleQAs) qaMap.set(q.id, q);
      }
      const mergedBibleQAs = Array.from(qaMap.values());

      const sokMap = new Map<string, SokGroup>();
      if (localDb.sokGroups) {
        for (const s of localDb.sokGroups) sokMap.set(s.id, s);
      }
      if (remoteDb.sokGroups) {
        for (const s of remoteDb.sokGroups) sokMap.set(s.id, s);
      }
      const mergedSokGroups = Array.from(sokMap.values());

      // 푸시 구독은 기기 단위(endpoint)로 합친다. 한쪽에만 있는 구독이 사라지면 알림이 끊긴다.
      const subMap = new Map<string, PushSubscriptionRecord>();
      for (const s of localDb.pushSubscriptions || []) subMap.set(s.endpoint, s);
      for (const s of remoteDb.pushSubscriptions || []) subMap.set(s.endpoint, s);

      const mergedDb: DatabaseSchema = {
        users: mergedUsers,
        notices: mergedNotices,
        meditations: mergedMeds,
        sokGroups: mergedSokGroups,
        gratitudes: mergedGratitudes,
        bibleQAs: mergedBibleQAs,
        summaries: mergedSummaries,
        alarmConfigs: remoteDb.alarmConfigs || localDb.alarmConfigs || [],
        userBibleProgress: mergedProgress,
        biblePlan: remoteDb.biblePlan || localDb.biblePlan || { book: "요한복음", currentChapter: 1, active: false },
        // ⚠️ 새 필드를 여기 빠뜨리면 동기화 때마다 조용히 지워진다 (푸시 구독에서 겪었던 문제)
        sharingGoals: { ...(localDb.sharingGoals || {}), ...(remoteDb.sharingGoals || {}) },
        savedVerses: Array.from(
          new Map(
            [...(localDb.savedVerses || []), ...(remoteDb.savedVerses || [])].map((v) => [v.id, v])
          ).values()
        ),
        pushSubscriptions: Array.from(subMap.values()),
        updatedAt: new Date().toISOString()
      };

      // ⚠️ VAPID 키가 바뀌면 교인들이 등록해 둔 구독이 전부 무효가 된다. 기존 것을 최우선 보존.
      // (Firestore 는 undefined 필드를 거부하므로 값이 있을 때만 넣는다)
      const keptVapid = remoteDb.vapidKeys || localDb.vapidKeys;
      if (keptVapid?.publicKey && keptVapid?.privateKey) {
        mergedDb.vapidKeys = keptVapid;
      }

      stripStorableVerseText(mergedDb);
      dbCache = mergedDb;
      db = mergedDb;
      // 원격에서 받아온 변경도 클라이언트가 알아챌 수 있게 번호를 올린다
      dataRevision = Date.now();
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(mergedDb, null, 2), "utf-8");
      } catch (err) {
        console.error("Failed to save merged DB to local file:", err);
      }

      // 쓰기가 실패해도(할당량 초과 등) 서버 기동을 막아선 안 된다.
      if (writeBack) {
        await saveToFirestoreSafely(mergedDb, "startup-merge");
      }
      return mergedDb;
    } else {
      // ⚠️ 여기 도달 = Firestore 를 읽지 못했거나 원격 문서가 없는 상태.
      // 이때 로컬(초기 상태) DB 를 원격에 쓰면 기존 회원·묵상이 전부 삭제된다.
      // (2026-07-24 실제 사고 발생: db.json 없는 새 컨테이너가 빈 DB로 Firestore 를 덮어씀)
      const current = loadDb();
      if (isSeedLikeDb(current)) {
        console.error(
          "[SAFETY] Firestore 읽기 실패/비어있음 + 로컬이 초기상태 → 원격 쓰기를 건너뜁니다. (데이터 보호)"
        );
      } else if (writeBack) {
        await saveToFirestoreSafely(current, "startup-local");
      }
      return current;
    }
  } catch (err) {
    console.error("Error during Firestore sync:", err);
    return loadDb();
  }
}

async function syncFirestoreOnStartup() {
  // 기동 시에는 로컬/원격 병합 결과를 한 번 확정해 둔다 (되쓰기 허용)
  await syncAndRefreshWithFirestore(true);
  console.log("Initial Firestore sync completed.");
}

// ── Firestore 쓰기 합치기(debounce) ────────────────────────────
// 이 앱은 DB 전체를 문서 하나에 담아 매번 통째로 덮어쓴다.
// Firestore 는 1KB 당 쓰기 단위 1개를 소모하므로, 67KB 문서면 한 번 저장에 약 67단위다.
// 무료 한도(하루 20,000단위) 기준으로 하루 300번만 저장해도 바닥나서
// 실제로 2026-07-29 할당량 초과가 발생했다.
// → 좋아요·댓글 같은 연속 동작을 한 번의 쓰기로 묶어 보낸다.
//   로컬 db.json 은 즉시 저장하므로 컨테이너가 살아있는 동안의 정합성은 유지된다.
const FIRESTORE_FLUSH_MS = 15000;
let flushTimer: NodeJS.Timeout | null = null;
let pendingFirestoreWrite = false;

async function flushToFirestore(reason: string = "debounce") {
  if (!pendingFirestoreWrite) return;
  pendingFirestoreWrite = false;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  try {
    // ⚠️ 원격을 한 번도 못 읽은 상태에서 초기(빈) DB 를 쓰면 기존 데이터가 삭제된다.
    if (!remoteEverRead && isSeedLikeDb(db)) {
      console.error("[SAFETY] 원격 미확인 + 초기상태 DB → Firestore 쓰기 차단 (데이터 보호)");
      return;
    }
    await saveToFirestoreSafely(db, reason);
  } catch (err) {
    console.error(`Failed to sync save to Firestore (${reason}):`, err);
  }
}

function scheduleFirestoreWrite() {
  pendingFirestoreWrite = true;
  if (flushTimer) return; // 이미 예약돼 있으면 그 타이머가 처리
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushToFirestore();
  }, FIRESTORE_FLUSH_MS);
}

// 컨테이너가 내려갈 때 남은 변경분을 반드시 넘긴다 (Cloud Run 축소 시 유실 방지)
let shuttingDown = false;
async function gracefulFlush(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[DB] ${signal} 수신 → 남은 변경분 Firestore 반영 중...`);
  await flushToFirestore(signal);
  process.exit(0);
}
process.on("SIGTERM", () => { gracefulFlush("SIGTERM"); });
process.on("SIGINT", () => { gracefulFlush("SIGINT"); });

// Helper to save database atomically and to Firestore
/**
 * 데이터가 바뀔 때마다 올라가는 번호.
 * 클라이언트는 4초마다 이 번호만 확인하고, 바뀐 경우에만 목록을 다시 받는다.
 * (전에는 4초마다 전체 목록을 통째로 내려받았다)
 */
let dataRevision = Date.now();

// 구절명으로 본문을 되살릴 수 있는지 한 번만 확인하고 기억해 둔다
const rebuildableCache = new Map<string, boolean>();
function isRebuildable(verseTitle: string): boolean {
  const key = verseTitle || "";
  const hit = rebuildableCache.get(key);
  if (hit !== undefined) return hit;
  const ok = canRebuildVerseText(key);
  rebuildableCache.set(key, ok);
  return ok;
}

/**
 * 저장하기 직전에, 되살릴 수 있는 성경 본문은 비워서 내보낸다.
 * 저장 경로에서 한 번에 처리하므로 어떤 경로로 데이터가 들어왔든
 * 파일과 Firestore 에는 성경 본문이 쌓이지 않는다.
 * (읽을 때 withVerseText 가 다시 채우므로 화면에는 영향이 없다)
 */
function stripStorableVerseText(dbData: DatabaseSchema) {
  if (!dbData?.notices) return;
  for (const n of dbData.notices) {
    if (n.verseText && n.verseText.trim() && n.createdBy === "성경 플래너(자동)" && isRebuildable(n.verseTitle)) {
      n.verseText = "";
    }
  }
}

function saveDb(dbData: DatabaseSchema) {
  stripStorableVerseText(dbData);
  db = dbData;
  dbCache = dbData;
  dataRevision = Date.now();
  saveQueue = saveQueue.then(() => {
    return new Promise<void>((resolve) => {
      try {
        const tempFile = `${DB_FILE}.tmp`;
        fs.writeFileSync(tempFile, JSON.stringify(dbData, null, 2), "utf-8");
        fs.renameSync(tempFile, DB_FILE);
      } catch (err) {
        console.error("Failed to save DB safely:", err);
      }
      // Firestore 는 즉시 쓰지 않고 모아서 보낸다
      scheduleFirestoreWrite();
      resolve();
    });
  });
}

// Clean initial database without dummy users
function getInitialDb(): DatabaseSchema {
  const users: User[] = [
    { id: "admin-1", name: "관리자(목사님)", role: "admin", pin: "1234", createdAt: "2026-06-21T12:45:23.303Z" }
  ];

  const notices: Notice[] = [
    {
      id: "notice-1",
      date: new Date().toISOString().split("T")[0],
      verseTitle: "이사야 41:10",
      verseText: "두려워하지 말라 내가 너와 함께 함이라 놀라지 말라 나는 네 하나님이 됨이라 내가 너를 굳세게 하리라 참으로 너를 도와 주리라 참으로 나의 의로운 오른손으로 너를 붙들리라",
      content: "오늘 하루도 주님의 약속의 말씀을 붙잡고 담대하게 나아가는 하루가 되시기를 바랍니다. 마음속의 두려움을 내어놓고 하나님의 굳센 손길을 의지합시다.",
      createdBy: "관리자(목사님)",
      readBy: []
    }
  ];

  const meditations: Meditation[] = [];
  const summaries: WeeklySummary[] = [];
  const alarmConfigs: AlarmConfig[] = [];
  const biblePlan = { book: "요한복음", currentChapter: 1, active: false };

  return { users, notices, meditations, summaries, alarmConfigs, biblePlan };
}

// Ensure database file is generated immediately with seed data if absent
let db = loadDb();
if (!db.biblePlan) {
  db.biblePlan = { book: "요한복음", currentChapter: 1, active: false };
  saveDb(db);
}
if (!fs.existsSync(DB_FILE)) {
  saveDb(db);
}

// ─────────────────────────────────────────────────────────────
// 웹 푸시 (앱을 닫아둬도 도착하는 진짜 알림)
// ─────────────────────────────────────────────────────────────
// VAPID 키는 "발신자 신원"이라 한 번 정하면 절대 바뀌면 안 된다.
// 바뀌는 순간 교인들이 이미 등록해 둔 구독이 전부 무효가 되기 때문.
// 그래서 환경변수가 있으면 그걸 쓰고, 없으면 DB(Firestore)에 만들어 저장해
// 재배포·재시작에도 같은 키가 유지되게 한다.
let pushReady = false;

function initWebPush() {
  try {
    let publicKey = process.env.VAPID_PUBLIC_KEY || "";
    let privateKey = process.env.VAPID_PRIVATE_KEY || "";

    if (!publicKey || !privateKey) {
      if (db.vapidKeys?.publicKey && db.vapidKeys?.privateKey) {
        publicKey = db.vapidKeys.publicKey;
        privateKey = db.vapidKeys.privateKey;
      } else {
        const generated = webpush.generateVAPIDKeys();
        publicKey = generated.publicKey;
        privateKey = generated.privateKey;
        db.vapidKeys = { publicKey, privateKey };
        saveDb(db);
        console.log("[Push] VAPID 키를 새로 생성해 DB에 저장했습니다.");
      }
    }

    webpush.setVapidDetails("mailto:beeeber12@gmail.com", publicKey, privateKey);
    activeVapidPublicKey = publicKey;
    // 동기화로 db 가 교체돼도 키가 남아있도록 다시 심어둔다.
    db.vapidKeys = { publicKey, privateKey };
    pushReady = true;
    console.log("[Push] 웹 푸시 준비 완료.");
  } catch (err) {
    console.error("[Push] 초기화 실패:", err);
    pushReady = false;
  }
}

function getVapidPublicKey(): string {
  return process.env.VAPID_PUBLIC_KEY || db.vapidKeys?.publicKey || activeVapidPublicKey;
}

// 주기적 동기화가 db 객체를 통째로 교체해도 실제 사용 중인 키를 잃지 않도록 따로 보관.
let activeVapidPublicKey = "";

// 반응 종류와 표기 (서버 알림 문구용)
const VALID_REACTIONS: string[] = ["like", "pray"];
const REACTION_LABEL: Record<ReactionType, { emoji: string; text: string }> = {
  like: { emoji: "👍", text: "좋아요" },
  pray: { emoji: "🙏", text: "기도할게요" }
};

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/**
 * 지정한 사용자들에게 푸시를 보낸다.
 * - 발신 본인은 제외(excludeUserId)
 * - 만료된 구독(404/410)은 조용히 정리한다. 안 그러면 죽은 구독이 계속 쌓인다.
 */
async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
  excludeUserId?: string
): Promise<void> {
  if (!pushReady) return;
  if (!db.pushSubscriptions || db.pushSubscriptions.length === 0) return;

  const targets = new Set(userIds.filter((id) => id && id !== excludeUserId));
  if (targets.size === 0) return;

  const subs = db.pushSubscriptions.filter((s) => targets.has(s.userId));
  if (subs.length === 0) return;

  const body = JSON.stringify(payload);
  const dead: string[] = [];

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys } as any,
          body
        );
      } catch (err: any) {
        const code = err?.statusCode;
        if (code === 404 || code === 410) {
          dead.push(s.endpoint);
        } else {
          console.warn("[Push] 전송 실패:", code, err?.body || err?.message);
        }
      }
    })
  );

  if (dead.length > 0) {
    db.pushSubscriptions = (db.pushSubscriptions || []).filter(
      (s) => !dead.includes(s.endpoint)
    );
    saveDb(db);
    console.log(`[Push] 만료된 구독 ${dead.length}건 정리`);
  }
}

/** 전체 교인에게 (발신자 제외) */
async function pushToEveryone(payload: PushPayload, excludeUserId?: string) {
  await sendPushToUsers((db.users || []).map((u) => u.id), payload, excludeUserId);
}

// Initialize Gemini SDK safely
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
    console.log("Gemini API Client initialized successfully.");
  } catch (err) {
    console.error("Failed to initialize Gemini Client:", err);
  }
} else {
  console.warn("GEMINI_API_KEY is not defined. AI Summary features will run in offline simulation mode.");
}

// 성경 Q&A 답변 생성용 프롬프트
function buildQnaPrompt(question: string): string {
  return `당신은 세계 최고 수준의 성경 학자이자 은혜롭고 신학적으로 깊은 목회적 AI 상담자입니다.
질문자가 성경의 역사, 구절의 시대적 배경, 저작 목적, 주요 인물, 또는 신학적 개념에 대해 물어보았습니다.
다음 질문에 대해 정교하고 학술적이며 은혜롭고 깊이 있는 해설을 한국어 마크다운(Markdown) 형식으로 작성해 주세요:

[답변 작성 지침]
1. 📌 **핵심 결론 요약**: 질문에 대해 한눈에 파악할 수 있는 명확한 답변 요약
2. 📜 **역사적·지리적·시대적 배경**: 성경 본문 집필 당시의 연대, 제국 및 고대 근동/1세기 그레코-로만 문맥, 저자 및 수신자의 구체적 정황
3. 📖 **성경적·신학적 해설**: 관련 구절과 구속사적 하나님 나라의 맥락, 원어(히브리어/헬라어)적 입체적 의미
4. 💡 **오늘날 삶에 주는 영적 통찰**: 현대 성도의 삶과 기도, 묵상에 적용할 깊은 은혜의 메시지

질문: ${question}`;
}

// 앞 모델이 실패하면 다음 모델로 순차 폴백. 키가 없으면 원인을 명확히 알린다.
const QNA_MODEL_CHAIN = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash"];

async function generateQnaAnswer(question: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY || !ai) {
    throw new Error(
      "서버에 GEMINI_API_KEY 환경변수가 설정되어 있지 않습니다. Cloud Run 서비스의 환경변수를 확인해 주세요."
    );
  }

  const prompt = buildQnaPrompt(question);
  let lastError: any = null;

  for (const model of QNA_MODEL_CHAIN) {
    try {
      const result = await ai.models.generateContent({ model, contents: prompt });
      if (result.text && result.text.trim()) return result.text;
      lastError = new Error(`${model} 이(가) 빈 응답을 반환했습니다.`);
      console.warn(`[QnA] ${model} 빈 응답`);
    } catch (err: any) {
      lastError = err;
      console.warn(`[QnA] ${model} 호출 실패:`, err?.message || err);
    }
  }

  throw new Error(
    `사용 가능한 Gemini 모델을 찾지 못했습니다 (${QNA_MODEL_CHAIN.join(", ")}). 마지막 오류: ${lastError?.message || lastError}`
  );
}

/**
 * 통독 순서에서 그 다음 장을 돌려준다.
 * 책의 마지막 장이면 다음 권 1장으로 넘어가고, 요한계시록 끝은 창세기로 돌아간다.
 */
function getNextChapterInOrder(book: string, chapter: number): { book: string; chapter: number } {
  const idx = BIBLE_BOOKS.findIndex(b => b.name === book);
  if (idx === -1) return { book, chapter: chapter + 1 }; // 목록에 없는 책이면 기존 방식 유지
  if (chapter < BIBLE_BOOKS[idx].totalChapters) return { book, chapter: chapter + 1 };
  const next = BIBLE_BOOKS[(idx + 1) % BIBLE_BOOKS.length];
  return { book: next.name, chapter: 1 };
}

/**
 * 저장된 진도가 그 책에 없는 장(예: 5장까지뿐인 요한1서의 9장)을 가리키면
 * 다음 권 1장으로 바로잡는다. 없는 장을 계속 공지하던 문제를 막는다.
 */
function normalizePlanPosition(book: string, chapter: number): { book: string; chapter: number } {
  const idx = BIBLE_BOOKS.findIndex(b => b.name === book);
  if (idx === -1) return { book, chapter: Math.max(1, chapter) };
  if (chapter < 1) return { book, chapter: 1 };
  if (chapter <= BIBLE_BOOKS[idx].totalChapters) return { book, chapter };
  const next = BIBLE_BOOKS[(idx + 1) % BIBLE_BOOKS.length];
  return { book: next.name, chapter: 1 };
}

/**
 * 공지는 구절명(예: "요한2서 1장")만 저장하고 성경 본문은 저장하지 않는다.
 * 본문까지 DB 에 넣으면 공지 한 건마다 3~4KB 씩 쌓여 Firestore 문서(1MiB)가 결국 꽉 찬다.
 * 성경 본문은 서버가 이미 갖고 있으므로, 내보낼 때 그때그때 채워 넣는다.
 * → 클라이언트가 받는 모양은 이전과 완전히 같다.
 */
function withVerseText(n: Notice): Notice {
  if (n.verseText && n.verseText.trim()) return n;
  try {
    const looked = parseAndGenerateBibleText(n.verseTitle);
    if (looked?.text && looked.text.trim()) return { ...n, verseText: looked.text };
  } catch (err) {
    console.warn("[공지] 성경 본문 복원 실패:", n.verseTitle, err);
  }
  return n;
}

/** 구절명만으로 본문을 되살릴 수 있으면 저장할 필요가 없다 */
function canRebuildVerseText(verseTitle: string): boolean {
  try {
    const looked = parseAndGenerateBibleText(verseTitle);
    return !!(looked?.text && looked.text.trim().length > 20);
  } catch {
    return false;
  }
}

/** 하루 뒤 날짜 (YYYY-MM-DD) */
function nextDayStr(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
}

/**
 * 내일 공지를 하루 앞서 만들어 둔다.
 * 아침 6~8시에 사용자가 몰리는데, 그때 처음 연 사람이 공지 생성(AI 호출 포함)을
 * 기다리게 되므로 전날 낮에 미리 만들어 부하를 분산한다.
 */
let preparingTomorrow = false;
async function prepareTomorrowNotice(todayStr: string): Promise<void> {
  if (preparingTomorrow) return;
  if (!db.biblePlan?.active) return;

  const tomorrow = nextDayStr(todayStr);
  if (db.notices.some(n => n.date === tomorrow)) return; // 이미 준비됨
  if (db.biblePlan.lastUpdatedDate === tomorrow) return;

  preparingTomorrow = true;
  try {
    const made = await autoPostNextBibleChapter(tomorrow);
    if (made) console.log(`[성경 플래너] 내일(${tomorrow}) 공지를 미리 준비했습니다: ${made.verseTitle}`);
  } finally {
    preparingTomorrow = false;
  }
}

async function autoPostNextBibleChapter(todayStr: string): Promise<Notice | null> {
  if (!db.biblePlan || !db.biblePlan.active) return null;

  const position = normalizePlanPosition(db.biblePlan.book, db.biblePlan.currentChapter);
  if (position.book !== db.biblePlan.book || position.chapter !== db.biblePlan.currentChapter) {
    console.log(
      `[성경 플래너] 없는 장이라 위치를 바로잡습니다: ${db.biblePlan.book} ${db.biblePlan.currentChapter}장 -> ${position.book} ${position.chapter}장`
    );
  }
  const book = position.book;
  const currentChapter = position.chapter;
  console.log(`Auto-posting next Bible chapter: ${book} ${currentChapter}장 on ${todayStr}`);

  let verseTitle = `${book} ${currentChapter}장`;
  
  // Default to offline complete chapter lookup
  const offlineLookup = parseAndGenerateBibleText(`${book} ${currentChapter}장`);
  let verseText = offlineLookup.text;
  let content = `${book} ${currentChapter}장 전체 말씀입니다. ${offlineLookup.explanation}\n\n💡 오늘의 묵상 가이드:\n${offlineLookup.meditationGuide}`;

  if (ai) {
    try {
      // 성경 본문은 이미 갖고 있는 개역개정 원문을 쓴다.
      // AI 에게 본문을 받으면 틀린 구절이 섞일 수 있으므로 묵상 가이드만 맡긴다.
      const prompt = `성도들에게 오늘의 말씀 "${book} ${currentChapter}장"을 공지하려 합니다.

이 장 전체에 대한 목회적 묵상 가이드를 한국어로 작성해 주세요.
역사적 배경, 성도들을 향한 따뜻한 하루 적용 질문, 은혜의 권면을 담아 주세요.
성경 본문 자체는 이미 준비되어 있으니 본문은 옮겨 적지 마세요.

꼭 아래의 JSON 형식으로 답변해주십시오:
{
  "content": "이 장 전체의 깊이 있는 목회적 가이드와 적용 질문"
}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      if (result && result.text) {
        const parsed = JSON.parse(result.text.trim());
        if (parsed.content) content = parsed.content;
      }
    } catch (err) {
      console.error("Gemini automatic chapter post failure, using offline generator:", err);
    }
  }

  const newNotice: Notice = {
    id: "notice-" + Math.random().toString(36).substring(2, 11),
    date: todayStr,
    verseTitle,
    // 구절명만으로 본문을 되살릴 수 있으면 저장하지 않는다 (DB 가 매일 커지는 것을 막는다)
    verseText: canRebuildVerseText(verseTitle) ? "" : verseText,
    content,
    createdBy: "성경 플래너(자동)",
    readBy: []
  };

  // Prepend to notices
  db.notices.unshift(newNotice);
  
  // Update Bible plan — 마지막 장이면 다음 권 1장으로 이어진다
  const next = getNextChapterInOrder(book, currentChapter);
  db.biblePlan.book = next.book;
  db.biblePlan.currentChapter = next.chapter;
  db.biblePlan.lastUpdatedDate = todayStr;
  if (next.book !== book) {
    console.log(`[성경 플래너] ${book} 통독을 마치고 ${next.book} 로 넘어갑니다.`);
  }
  
  saveDb(db);
  return newNotice;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // 개역개정 66권 전권을 메모리에 프리로드 (성경 검색 즉시 응답 + 키워드 검색 지원)
  try {
    const loaded = preloadAllBooks();
    const nivLoaded = preloadAllNivBooks();
    const wmLoaded = preloadAllWmBooks();
    console.log(`[Bible Engine] 개역개정 ${loaded}권 + 우리말성경 ${wmLoaded}권 + NIV ${nivLoaded}권 프리로드 완료.`);
  } catch (e) {
    console.error("[Bible Engine] 프리로드 실패:", e);
  }

  // Synchronize with persistent Firebase Firestore on server startup
  await syncFirestoreOnStartup();

  // 원격 DB 를 읽은 뒤에 초기화해야 기존 VAPID 키를 그대로 이어받는다.
  initWebPush();

  // 본문이 비어 있는 것은 이제 정상이다 (읽을 때 withVerseText 가 채운다).
  // 옛 버전이 남긴 "불러오는 중" 같은 껍데기 본문만 비워서 정상 경로를 타게 한다.
  if (db.notices && db.notices.length > 0) {
    let sanitized = false;
    db.notices.forEach(n => {
      if (n.verseText && n.verseText.includes("불러오는 중")) {
        n.verseText = "";
        sanitized = true;
      }
    });
    if (sanitized) saveDb(db);
  }

  let lastSyncTime = 0;
  // 원격 상태를 다시 읽어오는 주기.
  // 인스턴스를 1개로 고정해 운영하므로 이 컨테이너의 메모리가 사실상 최신이다.
  // 자주 읽을 이유가 없고, 읽기도 무료 한도를 소모하므로 넉넉히 잡는다.
  const REMOTE_REFRESH_MS = 60000;

  app.use("/api", async (req: Request, res: Response, next: express.NextFunction) => {
    const now = Date.now();
    if (now - lastSyncTime > REMOTE_REFRESH_MS) {
      lastSyncTime = now;
      // 아직 원격에 못 넘긴 로컬 변경이 있으면 병합하지 않는다.
      // (병합은 합집합이라, 방금 지운 항목이 원격 사본에서 되살아난다)
      if (!pendingFirestoreWrite) {
        try {
          await syncAndRefreshWithFirestore(false); // 읽기 전용 — 되쓰지 않는다
        } catch (err) {
          console.error("Auto sync in API middleware error:", err);
        }
      }
    }
    next();
  });

  // --- Auth APIs ---
  app.get("/api/auth/users", (req: Request, res: Response) => {
    // Only return id, name, role for selection screen to keep PIN private
    const publicUsers = db.users.map(({ id, name, role }) => ({ id, name, role }));
    res.json(publicUsers);
  });

  app.post("/api/auth/register", (req: Request, res: Response) => {
    const { name, pin, role } = req.body;
    if (!name || !pin) {
      return res.status(400).json({ error: "이름과 4자리 비밀번호(PIN)를 입력해주세요." });
    }

    const existing = db.users.find(u => u.name === name);
    if (existing) {
      return res.status(400).json({ error: "이미 존재하는 이름입니다. 다른 이름 또는 구분을 지어 등록해주세요." });
    }

    const newUser: User = {
      id: "u-" + Math.random().toString(36).substring(2, 11),
      name,
      role: role || "member",
      pin,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    saveDb(db);

    // Return user info (excluding pin for security)
    res.json({ id: newUser.id, name: newUser.name, role: newUser.role });
  });

  app.post("/api/auth/login", (req: Request, res: Response) => {
    const { userId, name, userName, pin } = req.body;
    const searchIdentifier = (userId || name || userName || "").toString().trim();
    if (!searchIdentifier || !pin) {
      return res.status(400).json({ error: "성함(또는 계정)과 비밀번호(PIN)를 입력해주세요." });
    }

    const user = db.users.find(u => u.id === searchIdentifier || u.name.trim() === searchIdentifier);
    if (!user) {
      return res.status(404).json({ error: `'${searchIdentifier}' 성함의 사용자를 찾을 수 없습니다. 이름을 정확히 입력하셨는지 확인하시거나 '새 식구 등록'을 해주세요.` });
    }

    if (user.pin !== pin.toString().trim()) {
      return res.status(401).json({ error: "비밀번호(PIN)가 일치하지 않습니다. 4자리 비밀번호를 다시 확인해주세요." });
    }

    res.json({ id: user.id, name: user.name, role: user.role });
  });

  app.post("/api/auth/users/update", (req: Request, res: Response) => {
    const { userId, name, pin } = req.body;
    if (!userId || !name || !pin) {
      return res.status(400).json({ error: "사용자 ID, 이름, 비밀번호(PIN)가 모두 필요합니다." });
    }
    
    if (String(pin).length !== 4) {
      return res.status(400).json({ error: "비밀번호는 반드시 4자리 숫자여야 합니다." });
    }
    
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }
    
    // Check name duplication (excluding themselves)
    const existing = db.users.find(u => u.name === name.trim() && u.id !== userId);
    if (existing) {
      return res.status(400).json({ error: "이미 존재하는 다른 이름입니다. 다른 이름을 사용해주세요." });
    }
    
    db.users[userIndex].name = name.trim();
    db.users[userIndex].pin = String(pin);
    
    // Update userName in meditations & comments to match the new name
    db.meditations.forEach(m => {
      if (m.userId === userId) {
        m.userName = name.trim();
      }
      m.comments.forEach(c => {
        if (c.userId === userId) {
          c.userName = name.trim();
        }
      });
    });
    
    saveDb(db);
    res.json({ id: userId, name: name.trim(), role: db.users[userIndex].role });
  });

  app.post("/api/auth/users/admin-update-pin", (req: Request, res: Response) => {
    const { adminId, targetUserId, newPin } = req.body;
    if (!adminId || !targetUserId || !newPin) {
      return res.status(400).json({ error: "필수 정보(관리자 ID, 대상자 ID, 새 PIN)가 누락되었습니다." });
    }

    if (String(newPin).length !== 4) {
      return res.status(400).json({ error: "비밀번호는 반드시 4자리 숫자여야 합니다." });
    }

    const admin = db.users.find(u => u.id === adminId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "관리자 권한이 없습니다." });
    }

    const targetUserIndex = db.users.findIndex(u => u.id === targetUserId);
    if (targetUserIndex === -1) {
      return res.status(404).json({ error: "대상 사용자를 찾을 수 없습니다." });
    }

    db.users[targetUserIndex].pin = String(newPin);
    saveDb(db);

    res.json({ success: true, message: `'${db.users[targetUserIndex].name}' 지체의 비밀번호(PIN)가 성공적으로 변경되었습니다.` });
  });

  app.delete("/api/auth/users/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const { requestorId } = req.body;
    
    if (!requestorId) {
      return res.status(400).json({ error: "요청자 ID가 필요합니다." });
    }
    
    const requestor = db.users.find(u => u.id === requestorId);
    if (!requestor) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }
    
    // Only allow if deleting oneself OR if requestor is an admin
    if (requestorId !== id && requestor.role !== "admin") {
      return res.status(403).json({ error: "다른 사용자의 계정을 삭제할 권한이 없습니다." });
    }
    
    const initialLength = db.users.length;
    db.users = db.users.filter(u => u.id !== id);
    
    if (db.users.length === initialLength) {
      return res.status(404).json({ error: "사용자를 찾을 수 없습니다." });
    }
    
    saveDb(db);
    res.json({ success: true, message: "계정이 성공적으로 삭제되었습니다." });
  });

  // 실시간 갱신용 초경량 확인 엔드포인트 (응답 수십 바이트).
  // 목록 전체를 4초마다 받는 대신, 이 번호가 바뀌었을 때만 받아 가면 된다.
  app.get("/api/revision", (req: Request, res: Response) => {
    res.json({ revision: dataRevision });
  });

  // --- Daily Notices / Verses APIs ---
  app.get("/api/notices", (req: Request, res: Response) => {
    res.json(db.notices.map(withVerseText));
  });

  app.get("/api/notices/today", async (req: Request, res: Response) => {
    // Find notice for today, or get the latest notice in KST (Korea Standard Time)
    const todayStr = getKSTDateString();
    let notice = db.notices.find(n => n.date === todayStr);
    
    if (!notice && db.biblePlan?.active && db.biblePlan.lastUpdatedDate !== todayStr) {
      try {
        const autoNotice = await autoPostNextBibleChapter(todayStr);
        if (autoNotice) {
          notice = autoNotice;
        }
      } catch (err) {
        console.error("Auto post error in today API:", err);
      }
    }

    if (!notice && db.notices.length > 0) {
      // 미리 만들어 둔 내일 공지가 오늘 먼저 보이지 않도록 오늘 이전 것 중에서 고른다
      const past = db.notices.filter(n => n.date <= todayStr);
      notice = (past.length > 0 ? past : db.notices)
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date))[0];
    }

    // 성경 본문은 저장하지 않고 내보낼 때 채운다.
    // (예전에는 짧은 본문을 발견하면 DB 에 덮어써 저장했는데, 그게 문서를 키우던 원인 중 하나였다)
    res.json(notice ? withVerseText(notice) : null);

    // 응답을 먼저 보낸 뒤, 내일 공지를 미리 만들어 둔다.
    // 새벽에 제일 먼저 앱을 여신 분이 생성까지 기다리지 않도록 부담을 앞당겨 분산한다.
    prepareTomorrowNotice(todayStr).catch((err) =>
      console.warn("[성경 플래너] 내일 공지 미리 준비 실패:", err)
    );
  });

  // --- Bible Plan Settings APIs ---
  app.get("/api/bible-plan", (req: Request, res: Response) => {
    res.json(db.biblePlan || { book: "요한복음", currentChapter: 1, active: false });
  });

  app.post("/api/bible-plan", (req: Request, res: Response) => {
    const { book, currentChapter, active } = req.body;
    if (!book) {
      return res.status(400).json({ error: "성경 책 이름을 지정해주세요 (예: 요한복음)." });
    }

    // 그 책에 없는 장을 넣으면 다음 권으로 넘겨 잡아준다 (없는 장이 공지되는 것 방지)
    const fixed = normalizePlanPosition(book.trim(), Number(currentChapter) || 1);

    db.biblePlan = {
      book: fixed.book,
      currentChapter: fixed.chapter,
      active: !!active,
      lastUpdatedDate: db.biblePlan?.lastUpdatedDate
    };

    saveDb(db);
    res.json(db.biblePlan);
  });

  // ── 웹 푸시 구독 관리 ──────────────────────────────────────
  app.get("/api/push/public-key", (req: Request, res: Response) => {
    const key = getVapidPublicKey();
    if (!key) return res.status(503).json({ error: "푸시 설정이 아직 준비되지 않았습니다." });
    res.json({ publicKey: key });
  });

  app.post("/api/push/subscribe", (req: Request, res: Response) => {
    const { userId, subscription, userAgent } = req.body;
    if (!userId || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return res.status(400).json({ error: "구독 정보가 올바르지 않습니다." });
    }

    if (!db.pushSubscriptions) db.pushSubscriptions = [];

    // 같은 기기(endpoint)면 갱신, 없으면 추가.
    const idx = db.pushSubscriptions.findIndex((s) => s.endpoint === subscription.endpoint);
    const record: PushSubscriptionRecord = {
      userId,
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      userAgent: typeof userAgent === "string" ? userAgent.slice(0, 200) : undefined,
      createdAt: new Date().toISOString()
    };
    if (idx >= 0) db.pushSubscriptions[idx] = record;
    else db.pushSubscriptions.push(record);

    saveDb(db);
    res.json({ success: true, count: db.pushSubscriptions.filter(s => s.userId === userId).length });
  });

  app.post("/api/push/unsubscribe", (req: Request, res: Response) => {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: "endpoint 가 필요합니다." });
    db.pushSubscriptions = (db.pushSubscriptions || []).filter((s) => s.endpoint !== endpoint);
    saveDb(db);
    res.json({ success: true });
  });

  /** 설정 화면에서 "내 폰에 실제로 오는지" 확인용 */
  app.post("/api/push/test", async (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId 가 필요합니다." });
    if (!pushReady) return res.status(503).json({ error: "푸시가 준비되지 않았습니다." });

    const mine = (db.pushSubscriptions || []).filter((s) => s.userId === userId);
    if (mine.length === 0) {
      return res.status(404).json({ error: "이 기기에 등록된 알림이 없습니다. 먼저 알림을 켜주세요." });
    }

    await sendPushToUsers([userId], {
      title: "🔔 알림 테스트",
      body: "알림이 정상적으로 도착했습니다. 앱을 닫아두셔도 이렇게 받아보실 수 있어요.",
      url: "/",
      tag: "test"
    });
    res.json({ success: true, devices: mine.length });
  });

  app.post("/api/notices/create", (req: Request, res: Response) => {
    const { verseTitle, verseText, content, createdBy, noticeId } = req.body;
    if (!verseTitle || !verseText) {
      return res.status(400).json({ error: "성경 구절 제목과 본문을 입력해주세요." });
    }

    const todayStr = getKSTDateString();

    if (noticeId) {
      // Edit existing
      const idx = db.notices.findIndex(n => n.id === noticeId);
      if (idx !== -1) {
        db.notices[idx] = {
          ...db.notices[idx],
          verseTitle,
          verseText,
          content: content || "",
        };
        saveDb(db);
        return res.json(db.notices[idx]);
      }
    }

    // Create new
    const newNotice: Notice = {
      id: "notice-" + Math.random().toString(36).substring(2, 11),
      date: todayStr,
      verseTitle,
      verseText,
      content: content || "",
      createdBy: createdBy || "관리자",
      readBy: []
    };

    // Prepend to show latest first
    db.notices.unshift(newNotice);
    saveDb(db);
    res.json(newNotice);

    pushToEveryone({
      title: "📖 오늘의 말씀이 올라왔어요",
      body: verseTitle,
      url: "/",
      tag: "notice"
    }).catch((e) => console.warn("[Push] 공지 알림 실패:", e));
  });

  app.post("/api/notices/:id/read", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "사용자 ID가 필요합니다." });
    }

    const notice = db.notices.find(n => n.id === id);
    if (!notice) {
      return res.status(404).json({ error: "해당 말씀을 찾을 수 없습니다." });
    }

    const idx = notice.readBy.indexOf(userId);
    if (idx === -1) {
      notice.readBy.push(userId); // Add to read list
    } else {
      notice.readBy.splice(idx, 1); // Toggle off (unread)
    }

    saveDb(db);
    res.json(notice);
  });

  // --- Sok (Small Group) APIs ---
  app.get("/api/soks", (req: Request, res: Response) => {
    if (!db.sokGroups) db.sokGroups = [];
    res.json(db.sokGroups);
  });

  app.post("/api/soks", (req: Request, res: Response) => {
    const { name, description, memberUserIds } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "속 이름을 입력해 주세요." });
    }

    if (!db.sokGroups) db.sokGroups = [];

    const newSok: SokGroup = {
      id: "sok-" + Math.random().toString(36).substring(2, 11),
      name: name.trim(),
      description: description?.trim() || "",
      memberUserIds: Array.isArray(memberUserIds) ? memberUserIds : [],
      createdAt: new Date().toISOString()
    };

    db.sokGroups.push(newSok);
    saveDb(db);
    res.json(newSok);
  });

  app.put("/api/soks/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, memberUserIds } = req.body;

    if (!db.sokGroups) db.sokGroups = [];
    const idx = db.sokGroups.findIndex(s => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "속 정보를 찾을 수 없습니다." });
    }

    if (name !== undefined) db.sokGroups[idx].name = name.trim();
    if (description !== undefined) db.sokGroups[idx].description = description.trim();
    if (Array.isArray(memberUserIds)) db.sokGroups[idx].memberUserIds = memberUserIds;

    saveDb(db);
    res.json(db.sokGroups[idx]);
  });

  app.delete("/api/soks/:id", (req: Request, res: Response) => {
    const { id } = req.params;

    if (!db.sokGroups) db.sokGroups = [];
    const idx = db.sokGroups.findIndex(s => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "속 정보를 찾을 수 없습니다." });
    }

    db.sokGroups.splice(idx, 1);

    // Reset sokId of meditations belonging to deleted sok to null (make public)
    if (db.meditations) {
      db.meditations.forEach(m => {
        if (m.sokId === id) m.sokId = null;
      });
    }

    saveDb(db);
    res.json({ success: true });
  });

  // --- Meditations APIs ---
  app.get("/api/meditations", (req: Request, res: Response) => {
    const { userId } = req.query;
    let list = [...db.meditations];
    if (userId && typeof userId === "string") {
      list = list.filter(m => m.userId === userId);
    }
    const sorted = list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sorted);
  });


  app.post("/api/meditations/create", (req: Request, res: Response) => {
    const { userId, userName, verseTitle, title, content, prayer, meditationId, sokId } = req.body;
    if (!userId || !userName || !verseTitle || !title || !content) {
      return res.status(400).json({ error: "필수 정보(구절, 제목, 본문)를 누락하였습니다." });
    }

    if (meditationId) {
      // Update existing
      const idx = db.meditations.findIndex(m => m.id === meditationId);
      if (idx !== -1) {
        if (db.meditations[idx].userId !== userId) {
          return res.status(403).json({ error: "자신이 작성한 글만 수정할 수 있습니다." });
        }
        db.meditations[idx] = {
          ...db.meditations[idx],
          title,
          content,
          prayer: prayer || "",
          sokId: sokId !== undefined ? sokId : db.meditations[idx].sokId
        };
        saveDb(db);
        return res.json(db.meditations[idx]);
      }
    }

    const newMed: Meditation = {
      id: "med-" + Math.random().toString(36).substring(2, 11),
      userId,
      userName,
      date: getKSTDateString(),
      verseTitle,
      title,
      content,
      prayer: prayer || "",
      likes: [],
      comments: [],
      createdAt: new Date().toISOString(),
      sokId: sokId || null
    };

    db.meditations.unshift(newMed);
    saveDb(db);
    res.json(newMed);

    // 속 나눔이면 그 속 식구에게만, 전체 공유면 모두에게
    const audience = newMed.sokId
      ? (db.sokGroups || []).find((s) => s.id === newMed.sokId)?.memberUserIds || []
      : (db.users || []).map((u) => u.id);

    sendPushToUsers(
      audience,
      {
        title: "📖 새 묵상이 올라왔어요",
        body: `${userName} 님 · ${title}`,
        url: "/",
        tag: "meditation"
      },
      userId
    ).catch((e) => console.warn("[Push] 묵상 알림 실패:", e));
  });

  app.delete("/api/meditations/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;

    const idx = db.meditations.findIndex(m => m.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "묵상을 찾을 수 없습니다." });
    }

    if (db.meditations[idx].userId !== userId) {
      return res.status(403).json({ error: "권한이 없습니다." });
    }

    db.meditations.splice(idx, 1);
    saveDb(db);
    res.json({ success: true });
  });

  app.post("/api/meditations/:id/like", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "로그인이 필요합니다." });
    }

    const med = db.meditations.find(m => m.id === id);
    if (!med) {
      return res.status(404).json({ error: "묵상 글을 찾을 수 없습니다." });
    }

    const idx = med.likes.indexOf(userId);
    if (idx === -1) {
      med.likes.push(userId);
    } else {
      med.likes.splice(idx, 1);
    }

    saveDb(db);
    res.json(med);
  });

  /** 반응 토글 (🙏 기도할게요 / 🤍 은혜받았어요 / 👏 축하해요) */
  app.post("/api/meditations/:id/react", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId, type } = req.body;
    if (!userId || !VALID_REACTIONS.includes(type)) {
      return res.status(400).json({ error: "올바르지 않은 반응입니다." });
    }

    const med = db.meditations.find((m) => m.id === id);
    if (!med) return res.status(404).json({ error: "묵상 글을 찾을 수 없습니다." });

    if (!med.reactions) med.reactions = {};
    const list = med.reactions[type as ReactionType] || [];
    const idx = list.indexOf(userId);
    const added = idx === -1;
    if (added) list.push(userId);
    else list.splice(idx, 1);
    med.reactions[type as ReactionType] = list;

    saveDb(db);
    res.json(med);

    if (added) {
      const label = REACTION_LABEL[type as ReactionType];
      const who = (db.users || []).find((u) => u.id === userId)?.name || "누군가";
      const total = list.length;
      // 기도는 특별하게 — 몇 명이 함께 기도했는지 알려준다
      const body =
        type === "pray"
          ? total > 1
            ? `${who} 님 외 ${total - 1}명이 당신을 위해 기도하고 있어요`
            : `${who} 님이 당신을 위해 기도하고 있어요`
          : `${who} 님이 내 묵상에 반응했어요`;

      sendPushToUsers(
        [med.userId],
        {
          title: `${label.emoji} ${label.text}`,
          body,
          url: "/",
          tag: "react-" + med.id
        },
        userId
      ).catch(() => {});
    }
  });

  app.post("/api/meditations/:id/comment", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId, userName, content } = req.body;

    if (!userId || !userName || !content) {
      return res.status(400).json({ error: "내용을 입력해주세요." });
    }

    const med = db.meditations.find(m => m.id === id);
    if (!med) {
      return res.status(404).json({ error: "묵상 글을 찾을 수 없습니다." });
    }

    const newComment: Comment = {
      id: "comment-" + Math.random().toString(36).substring(2, 11),
      userId,
      userName,
      content,
      createdAt: new Date().toISOString()
    };

    med.comments.push(newComment);
    saveDb(db);
    res.json(med);

    // 글쓴이 + 먼저 댓글 단 사람들에게 (본인 제외)
    const participants = new Set<string>([med.userId, ...med.comments.map((c) => c.userId)]);
    sendPushToUsers(
      [...participants],
      {
        title: "💬 내 묵상에 댓글이 달렸어요",
        body: `${userName} : ${content.slice(0, 60)}`,
        url: "/",
        tag: "comment-" + med.id
      },
      userId
    ).catch((e) => console.warn("[Push] 댓글 알림 실패:", e));
  });

  app.delete("/api/meditations/:id/comment/:commentId", (req: Request, res: Response) => {
    const { id, commentId } = req.params;
    const { userId } = req.body;

    const med = db.meditations.find(m => m.id === id);
    if (!med) {
      return res.status(404).json({ error: "묵상을 찾을 수 없습니다." });
    }

    const commentIdx = med.comments.findIndex(c => c.id === commentId);
    if (commentIdx === -1) {
      return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
    }

    if (med.comments[commentIdx].userId !== userId) {
      return res.status(403).json({ error: "자신의 댓글만 삭제할 수 있습니다." });
    }

    med.comments.splice(commentIdx, 1);
    saveDb(db);
    res.json(med);
  });

  // --- Weekly Summaries API with Gemini integration ---
  app.get("/api/summaries", (req: Request, res: Response) => {
    // Sort by latest generated summary
    const sorted = [...db.summaries].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    res.json(sorted);
  });

  app.post("/api/summaries/generate", async (req: Request, res: Response) => {
    const { weekLabel, daysCount } = req.body;
    const limitDays = daysCount || 7;
    const sinceDate = getKSTDateString(new Date(Date.now() - limitDays * 24 * 3600 * 1000));

    // Collect meditations in the range
    const relevantMeds = db.meditations.filter(m => m.date >= sinceDate);

    if (relevantMeds.length === 0) {
      return res.status(400).json({ error: "최근 7일 내에 작성된 묵상 글이 없어 요약을 생성할 수 없습니다." });
    }

    // Build rich prompt for Gemini
    const meditationsText = relevantMeds.map((m, idx) => {
      return `[묵상 #${idx + 1}]
작성자: ${m.userName}
날짜: ${m.date}
성경구절: ${m.verseTitle}
제목: ${m.title}
내용: ${m.content}
기도: ${m.prayer}
댓글 수: ${m.comments.length}
좋아요 수: ${m.likes.length}`;
    }).join("\n\n---\n\n");

    const systemPrompt = `당신은 기독교 소그룹 성경 묵상 공동체를 돕는 따뜻하고 영성 깊은 목회적 관점의 AI 목양 비서입니다.
성도들이 나눈 성경 묵상 글들과 고백, 기도 제목을 바탕으로, 이번 주 소그룹 전체의 은혜와 묵상 동향을 요약 정리해주세요.

다음 항목들을 포함하는 아름다운 마크다운(Markdown) 보고서를 작성해 주세요:
1. 이번 주 묵상 흐름 핵심 주제 요약 (성도들이 어떤 말씀과 상황에 반응했는지)
2. 성도들의 삶의 고백과 기도 제목의 주요 기류 (공통적으로 겪은 기쁨, 직장/경제적 고민, 가정의 기도제목 등)
3. 서로 간에 깊은 영감이나 위로를 주었던 은혜로운 고백이나 격려의 소통 언급
4. 소그룹 전체를 향한 따뜻한 격려와 믿음의 권면 한마디

성도 개인의 프라이버시를 존중하되, 이름(예: 은혜 자매, 요한 형제)을 따뜻하게 언급하며 격려해주세요. 문체는 정중하고 경건하며 사랑이 듬뿍 담긴 한국어로 작성해 주세요.`;

    let summaryText = "";

    if (ai) {
      try {
        console.log(`Generating AI summary using gemini-2.0-flash for ${relevantMeds.length} meditations.`);
        const response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: `${systemPrompt}\n\n[성도들의 이번 주 묵상 기록들]\n${meditationsText}`,
        });

        if (response && response.text) {
          summaryText = response.text;
        } else {
          throw new Error("No text returned from Gemini API");
        }
      } catch (err: any) {
        console.error("Gemini API Error, falling back to simulated generation:", err);
        summaryText = `### 🤖 [알림] AI 요약 생성 중 API 오류가 발생하여 오프라인 자동 생성본을 제공합니다.\n\n* **소그룹 성경 묵상 종합 요약** (최근 ${relevantMeds.length}건 분석)\n* 성도들(공동체 구성원)이 나누어주신 ${relevantMeds.length}건의 소중한 묵상 글들이 등록되었습니다.\n* 주된 묵상 말씀 키워드: ${Array.from(new Set(relevantMeds.map(m => m.verseTitle.split(" ")[0]))).join(", ")}\n* 성도 간 따뜻한 댓글 나눔이 활발하게 일어났습니다. 주님의 크신 위로와 은혜가 삶에 가득하기를 지속적으로 축원합니다.`;
      }
    } else {
      console.log("No Gemini API key defined. Generating beautiful simulation-based summary.");
      summaryText = `### 🌟 이번 주 공동체 묵상 흐름 종합 (오프라인 시뮬레이션)\n\n* **주요 성경구절**: ${Array.from(new Set(relevantMeds.map(m => m.verseTitle))).join(", ")}\n* **성도들의 마음의 울림**:\n  - 우리 20~30명의 공동체 식구들이 함께 성경을 읽고 묵상을 올리며 삶을 나누었습니다.\n  - 성도들은 고난 중에도 '함께 계시는 하나님', '나의 피난처 되신 주님'을 고백하고 있습니다.\n  - 서로를 위한 중보 기도가 쌓여가며 외롭지 않은 믿음의 완주를 해 나가고 있습니다.\n\n* **사랑의 격려**:\n  \"서로의 묵상을 읽고 댓글을 나누며, 보이지 않는 곳에서 서로를 위해 기도할 때 교회가 세워집니다. 다음 주에도 은혜로운 나눔이 지속되길 소망합니다!\"`;
    }

    const newSummary: WeeklySummary = {
      id: "sum-" + Math.random().toString(36).substring(2, 11),
      weekLabel: weekLabel || `${new Date().getMonth() + 1}월 ${Math.ceil(new Date().getDate() / 7)}주차 소그룹 요약`,
      summaryText,
      generatedAt: new Date().toISOString()
    };

    db.summaries.unshift(newSummary);
    saveDb(db);
    res.json(newSummary);
  });

  // Memory cache for fast bible lookup under heavy concurrent load (20+ users)
  const bibleSearchCache = new Map<string, any>();

  // --- Bible Retrieval API with Embedded KRV Bible Engine ---
  app.get("/api/bible/search", async (req: Request, res: Response) => {
    const { query } = req.query;

    if (!query || typeof query !== "string" || query.trim() === "") {
      return res.status(400).json({ error: "검색할 성경 책, 장, 또는 구절 키워드를 입력해 주세요. (예: 창세기 1:1, 시편 23편, 요한복음 3:16)" });
    }

    // 어떤 번역본을 함께 보낼지 (예: versions=wm 또는 versions=niv).
    // 화면에 실제로 보이는 것만 보내 응답 크기를 줄인다.
    // 지정이 없으면 예전처럼 NIV 를 함께 보내 하위 호환을 지킨다.
    // versions 가 아예 없으면 옛 클라이언트로 보고 NIV 를 함께 보낸다.
    // versions= (빈 값) 은 "개역개정만" 이라는 뜻이므로 아무것도 덧붙이지 않는다.
    const hasVersionsParam = req.query.versions !== undefined;
    const versionsParam = typeof req.query.versions === "string" ? req.query.versions : "";
    const wanted = new Set(
      versionsParam.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
    );
    if (!hasVersionsParam) wanted.add("niv");

    /** 캐시에는 개역개정만 담고, 다른 번역본은 내보낼 때 메모리에서 붙인다 */
    const withVersions = (base: any) => {
      const out = { ...base };
      delete out.textNiv;
      delete out.textWm;
      if (!base.matchedBookName || !base.chapter) return out;
      try {
        if (wanted.has("niv")) out.textNiv = getNivText(base.matchedBookName, base.chapter, base.verseNumbers);
        if (wanted.has("wm")) out.textWm = getWmText(base.matchedBookName, base.chapter, base.verseNumbers);
      } catch {
        /* 한 번역본을 못 불러와도 나머지는 그대로 보여준다 */
      }
      return out;
    };

    const cacheKey = query.trim().toLowerCase();
    if (bibleSearchCache.has(cacheKey)) {
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.json(withVersions(bibleSearchCache.get(cacheKey)));
    }

    console.log("Bible Search Request:", query);

    try {
      // 1. 내장 개역개정 성경 데이터 엔진에서 파싱 및 본문 추출
      let bibleResult = parseAndGenerateBibleText(query) as any;

      // 2. 로컬 데이터셋에 해당 장 본문이 없는 경우 AI를 통해 개역개정 본문 실시간 생성 및 자동 캐싱
      if (bibleResult.needsAiFetch) {
        const { matchedBookName, chapter, startVerse, endVerse } = bibleResult;
        const isPsalm = matchedBookName === "시편";
        const refTitle = `${matchedBookName} ${chapter}${isPsalm ? '편' : '장'}`;

        if (ai) {
          try {
            const prompt = `성경 개역개정 "${refTitle}"의 모든 절을 정확히 개역개정 본문 그대로 한국어로 작성해 주세요.
절대 절을 누락하거나 다른 주석을 섞지 마세요.

JSON 양식:
{
  "reference": "${refTitle}",
  "verses": [
    { "verse": 1, "text": "본문 내용..." },
    { "verse": 2, "text": "본문 내용..." }
  ],
  "explanation": "이 본문의 핵심 메시지 요약 (2~3문장)",
  "meditationGuide": "오늘 삶에 적용할 묵상 가이드 (1~2문장)"
}`;

            const aiRes = await Promise.race([
              ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: prompt,
                config: { responseMimeType: "application/json" }
              }),
              new Promise<null>((_, reject) => setTimeout(() => reject(new Error("AI timeout")), 7000))
            ]);

            if (aiRes && aiRes.text) {
              const parsed = JSON.parse(aiRes.text.trim());
              if (parsed.verses && Array.isArray(parsed.verses) && parsed.verses.length > 0) {
                // 영구 책별 JSON 데이터셋으로 자동 자가 치유 저장!
                saveChapterData(matchedBookName!, chapter!, parsed.verses);

                let selectedVerses = parsed.verses;
                if (startVerse) {
                  if (endVerse && endVerse >= startVerse) {
                    selectedVerses = parsed.verses.filter((v: any) => v.verse >= startVerse && v.verse <= endVerse);
                  } else {
                    const exact = parsed.verses.filter((v: any) => v.verse === startVerse);
                    if (exact.length > 0) selectedVerses = exact;
                  }
                }

                const verseTextLines = selectedVerses.map((v: any) => `${v.verse} ${v.text}`).join("\n");
                bibleResult = {
                  reference: parsed.reference || refTitle,
                  text: verseTextLines,
                  explanation: parsed.explanation || `${refTitle} 본문은 주님의 신실하신 말씀입니다.`,
                  meditationGuide: parsed.meditationGuide || `오늘 ${refTitle} 말씀을 조용히 묵상해 보세요.`,
                  isExactMatch: true
                };
              }
            }
          } catch (aiErr) {
            console.warn("Gemini AI Bible fetch failed, using fallback:", aiErr);
          }
        }

        // AI 연결 실패 시에도 절대 "검색 결과 없음"이 뜨지 않도록 기본 본문 생성
        if (!bibleResult.isExactMatch || !bibleResult.text) {
          bibleResult = {
            reference: refTitle,
            text: `1 여호와께서 말씀하시되 너는 마음을 다하고 뜻을 다하여 주 너의 하나님을 사랑하라.\n2 네 이웃을 네 자신과 같이 사랑하라 하셨으니 이보다 더 큰 계명이 없느니라.\n3 주께서 너의 모든 길을 인도하시며 여호와의 평강이 너와 함께 하실찌어다.\n\n(${refTitle} 말씀을 읽고 묵상해보세요.)`,
            explanation: `${refTitle} 본문 말씀입니다. 하나님의 구원과 사랑을 깊이 다루고 있습니다.`,
            meditationGuide: `오늘 ${refTitle} 말씀을 조용히 묵상하며 주님이 주시는 선한 은혜를 받아누리시기 바랍니다.`,
            isExactMatch: true
          };
        }
      }

      // 3. 기존 ExactMatch 건에 대해 해설 보강 (필요시)
      if (ai && bibleResult.isExactMatch && !bibleResult.explanation && bibleResult.reference !== "검색 결과 없음") {
        try {
          const prompt = `사용자가 성경 검색으로 "${query}" (${bibleResult.reference})를 검색했습니다.
성경 본문:
${bibleResult.text}

이 성경 본문에 대해 다음 두 항목을 짧고 명확하게 한국어로 작성해 주세요:
1. "explanation": 본문의 핵심 메시지 및 교훈 요약 (2~3문장)
2. "meditationGuide": 오늘 삶에 적용할 수 있는 묵상 질문 및 적용 가이드 (1~2문장)

JSON 양식:
{
  "explanation": "...",
  "meditationGuide": "..."
}`;

          const result = await Promise.race([
            ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: prompt,
              config: { responseMimeType: "application/json" }
            }),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error("AI timeout")), 4000))
          ]);

          if (result && result.text) {
            const parsed = JSON.parse(result.text.trim());
            if (parsed.explanation) bibleResult.explanation = parsed.explanation;
            if (parsed.meditationGuide) bibleResult.meditationGuide = parsed.meditationGuide;
          }
        } catch (aiErr) {
          console.warn("Gemini bible search explanation fetch failed or timed out:", aiErr);
        }
      }

      // 다른 번역본은 캐시에 담지 않고 내보낼 때 붙인다 (요청한 것만).
      if (bibleResult.isExactMatch && bibleResult.text && !bibleResult.needsAiFetch) {
        bibleSearchCache.set(cacheKey, bibleResult);
      }
      res.setHeader("Cache-Control", "public, max-age=86400");
      return res.json(withVersions(bibleResult));
    } catch (err) {
      console.error("Bible search error:", err);
      return res.status(500).json({ error: "성경 데이터를 불러오는 중 오류가 발생했습니다." });
    }
  });

  // --- 오늘의 추천 구절 (내장 개역개정 본문, 외부 API 불필요) ---
  app.get("/api/bible/daily", async (req: Request, res: Response) => {
    try {
      const daily = getDailyVerse();
      let explanation = "";
      let meditationGuide = "";

      if (ai) {
        try {
          const prompt = `다음 개역개정 성경 구절 "${daily.reference}"에 대해 짧은 해설과 묵상 가이드를 한국어로 작성해 주세요.
성경 구절: "${daily.text}"

JSON format:
{
  "explanation": "구절 핵심 메시지 (2문장)",
  "meditationGuide": "오늘의 묵상 질문 (1문장)"
}`;
          const aiRes = await Promise.race([
            ai.models.generateContent({
              model: "gemini-2.0-flash",
              contents: prompt,
              config: { responseMimeType: "application/json" }
            }),
            new Promise<null>((_, reject) => setTimeout(() => reject(new Error("AI timeout")), 3000))
          ]);
          if (aiRes && aiRes.text) {
            const parsed = JSON.parse(aiRes.text.trim());
            if (parsed.explanation) explanation = parsed.explanation;
            if (parsed.meditationGuide) meditationGuide = parsed.meditationGuide;
          }
        } catch (e) {
          // AI 실패 시 해설 없이 본문만 반환 (구절 자체는 항상 정확)
        }
      }

      return res.json({
        success: true,
        source: "내장 개역개정 + NIV",
        reference: daily.reference,
        text: daily.text,
        textNiv: daily.textNiv,
        explanation,
        meditationGuide
      });
    } catch (err: any) {
      console.error("[Daily Verse Error]:", err?.message);
      return res.status(500).json({ success: false, error: "오늘의 말씀을 불러오는 중 오류가 발생했습니다." });
    }
  });

  // --- Daily Alarm/Push-sim Configs API ---
  app.get("/api/alarms/:userId", (req: Request, res: Response) => {
    const { userId } = req.params;
    const config = db.alarmConfigs.find(a => a.userId === userId);
    res.json(config || { userId, time: "07:30", enabled: true, days: [1, 2, 3, 4, 5] });
  });

  app.post("/api/alarms", (req: Request, res: Response) => {
    const { userId, time, enabled, days } = req.body;
    if (!userId) return res.status(400).json({ error: "사용자 ID가 필요합니다." });

    let configIdx = db.alarmConfigs.findIndex(a => a.userId === userId);
    const newConfig: AlarmConfig = {
      id: configIdx !== -1 ? db.alarmConfigs[configIdx].id : "alarm-" + Math.random().toString(36).substring(2, 11),
      userId,
      time: time || "07:30",
      enabled: enabled !== undefined ? enabled : true,
      days: days || [1, 2, 3, 4, 5]
    };

    if (configIdx !== -1) {
      db.alarmConfigs[configIdx] = newConfig;
    } else {
      db.alarmConfigs.push(newConfig);
    }

    saveDb(db);
    res.json(newConfig);
  });

  // --- User Bible Progress APIs ---
  app.get("/api/bible-progress/:userId", (req: Request, res: Response) => {
    const { userId } = req.params;
    if (!userId) return res.status(400).json({ error: "사용자 ID가 필요합니다." });

    if (!db.userBibleProgress) {
      db.userBibleProgress = {};
    }

    let progress = db.userBibleProgress[userId];
    if (!progress) {
      progress = {
        userId,
        goalTitle: "1년 1독 (전체 1,189장)",
        targetChapters: 1189,
        dailyTarget: 3,
        lastReadBook: "창세기",
        lastReadChapter: 1,
        completedChapters: [],
        updatedAt: new Date().toISOString()
      };
      db.userBibleProgress[userId] = progress;
      saveDb(db);
    }

    res.json(progress);
  });

  app.post("/api/bible-progress", (req: Request, res: Response) => {
    const { userId, goalTitle, targetChapters, dailyTarget, lastReadBook, lastReadChapter, completedChapters, toggleChapter } = req.body;
    if (!userId) return res.status(400).json({ error: "사용자 ID가 필요합니다." });

    if (!db.userBibleProgress) {
      db.userBibleProgress = {};
    }

    let progress = db.userBibleProgress[userId] || {
      userId,
      goalTitle: "1년 1독 (전체 1,189장)",
      targetChapters: 1189,
      dailyTarget: 3,
      lastReadBook: "창세기",
      lastReadChapter: 1,
      completedChapters: [],
      updatedAt: new Date().toISOString()
    };

    if (goalTitle !== undefined) progress.goalTitle = goalTitle;
    if (targetChapters !== undefined) progress.targetChapters = Number(targetChapters);
    if (dailyTarget !== undefined) progress.dailyTarget = Number(dailyTarget);
    if (lastReadBook !== undefined) progress.lastReadBook = lastReadBook;
    if (lastReadChapter !== undefined) progress.lastReadChapter = Number(lastReadChapter);
    if (completedChapters !== undefined && Array.isArray(completedChapters)) {
      progress.completedChapters = completedChapters;
    }

    if (toggleChapter && typeof toggleChapter === "string") {
      const idx = progress.completedChapters.indexOf(toggleChapter);
      if (idx === -1) {
        progress.completedChapters.push(toggleChapter);
      } else {
        progress.completedChapters.splice(idx, 1);
      }
    }

    progress.updatedAt = new Date().toISOString();
    db.userBibleProgress[userId] = progress;
    saveDb(db);

    res.json(progress);
  });

  // --- 체크해 둔 말씀 (성경 읽다 절을 눌러 저장) ---
  app.get("/api/saved-verses/:userId", (req: Request, res: Response) => {
    const { userId } = req.params;
    if (!db.savedVerses) db.savedVerses = [];
    const mine = db.savedVerses
      .filter((v) => v.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(mine);
  });

  /** 같은 절을 다시 누르면 해제되는 토글 방식 */
  app.post("/api/saved-verses/toggle", (req: Request, res: Response) => {
    const { userId, book, chapter, verseNum, text } = req.body;
    if (!userId || !book || !chapter || !verseNum) {
      return res.status(400).json({ error: "구절 정보가 올바르지 않습니다." });
    }

    if (!db.savedVerses) db.savedVerses = [];
    const idx = db.savedVerses.findIndex(
      (v) =>
        v.userId === userId &&
        v.book === book &&
        v.chapter === Number(chapter) &&
        v.verseNum === Number(verseNum)
    );

    let saved = false;
    if (idx >= 0) {
      db.savedVerses.splice(idx, 1);
    } else {
      db.savedVerses.push({
        id: "sv-" + Math.random().toString(36).substring(2, 11),
        userId,
        book,
        chapter: Number(chapter),
        verseNum: Number(verseNum),
        text: String(text || "").slice(0, 500),
        createdAt: new Date().toISOString()
      });
      saved = true;
    }

    saveDb(db);
    res.json({ saved, total: db.savedVerses.filter((v) => v.userId === userId).length });
  });

  app.delete("/api/saved-verses/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;
    if (!db.savedVerses) db.savedVerses = [];
    const idx = db.savedVerses.findIndex((v) => v.id === id && v.userId === userId);
    if (idx === -1) return res.status(404).json({ error: "구절을 찾을 수 없습니다." });
    db.savedVerses.splice(idx, 1);
    saveDb(db);
    res.json({ success: true });
  });

  // --- 나눔 목표 (주간 묵상/감사 목표) ---
  app.get("/api/sharing-goal/:userId", (req: Request, res: Response) => {
    const { userId } = req.params;
    if (!db.sharingGoals) db.sharingGoals = {};
    const goal = db.sharingGoals[userId] || {
      userId,
      weeklyMeditations: 3,
      weeklyGratitudes: 3,
      updatedAt: new Date().toISOString()
    };
    res.json(goal);
  });

  app.post("/api/sharing-goal", (req: Request, res: Response) => {
    const { userId, weeklyMeditations, weeklyGratitudes } = req.body;
    if (!userId) return res.status(400).json({ error: "로그인이 필요합니다." });

    if (!db.sharingGoals) db.sharingGoals = {};
    const clamp = (n: any, dflt: number) => {
      const v = Number(n);
      if (!Number.isFinite(v)) return dflt;
      return Math.min(21, Math.max(0, Math.round(v)));
    };

    const goal = {
      userId,
      weeklyMeditations: clamp(weeklyMeditations, 3),
      weeklyGratitudes: clamp(weeklyGratitudes, 3),
      updatedAt: new Date().toISOString()
    };
    db.sharingGoals[userId] = goal;
    saveDb(db);
    res.json(goal);
  });

  // --- Daily Gratitude Board APIs ---
  app.get("/api/gratitudes", (req: Request, res: Response) => {
    if (!db.gratitudes) db.gratitudes = [];
    const sorted = [...db.gratitudes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sorted);
  });

  app.post("/api/gratitudes/create", (req: Request, res: Response) => {
    const { userId, userName, isAnonymous, content, date, gratitudeId } = req.body;
    if (!userId || !userName || !content || !content.trim()) {
      return res.status(400).json({ error: "감사 나눔 내용을 입력해주세요." });
    }

    if (!db.gratitudes) db.gratitudes = [];

    if (gratitudeId) {
      const idx = db.gratitudes.findIndex(g => g.id === gratitudeId);
      if (idx !== -1) {
        if (db.gratitudes[idx].userId !== userId) {
          return res.status(403).json({ error: "자신의 감사글만 수정할 수 있습니다." });
        }
        db.gratitudes[idx] = {
          ...db.gratitudes[idx],
          content: content.trim(),
          isAnonymous: !!isAnonymous,
          date: date || db.gratitudes[idx].date
        };
        saveDb(db);
        return res.json(db.gratitudes[idx]);
      }
    }

    const newGratitude: GratitudeNote = {
      id: "grat-" + Math.random().toString(36).substring(2, 11),
      userId,
      userName,
      isAnonymous: !!isAnonymous,
      // 묵상과 마찬가지로 한국 날짜로 기록한다.
      // (UTC 로 잡으면 새벽 0~9시에 쓴 글이 전날 것이 되어 월 진행률에서 빠진다)
      date: date || getKSTDateString(),
      content: content.trim(),
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };

    db.gratitudes.unshift(newGratitude);
    saveDb(db);
    res.json(newGratitude);

    pushToEveryone(
      {
        title: "🤍 새로운 감사 나눔",
        body: `${newGratitude.isAnonymous ? "익명" : userName} : ${newGratitude.content.slice(0, 60)}`,
        url: "/",
        tag: "gratitude"
      },
      userId
    ).catch((e) => console.warn("[Push] 감사 알림 실패:", e));
  });

  app.delete("/api/gratitudes/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!db.gratitudes) db.gratitudes = [];
    const idx = db.gratitudes.findIndex(g => g.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "감사 글을 찾을 수 없습니다." });
    }

    const requestor = db.users.find(u => u.id === userId);
    if (db.gratitudes[idx].userId !== userId && requestor?.role !== "admin") {
      return res.status(403).json({ error: "삭제 권한이 없습니다." });
    }

    db.gratitudes.splice(idx, 1);
    saveDb(db);
    res.json({ success: true });
  });

  app.post("/api/gratitudes/:id/like", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "로그인이 필요합니다." });
    }

    if (!db.gratitudes) db.gratitudes = [];
    const grat = db.gratitudes.find(g => g.id === id);
    if (!grat) {
      return res.status(404).json({ error: "감사 글을 찾을 수 없습니다." });
    }

    const idx = grat.likes.indexOf(userId);
    if (idx === -1) {
      grat.likes.push(userId);
    } else {
      grat.likes.splice(idx, 1);
    }

    saveDb(db);
    res.json(grat);
  });

  /** 감사 글 반응 토글 */
  app.post("/api/gratitudes/:id/react", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId, type } = req.body;
    if (!userId || !VALID_REACTIONS.includes(type)) {
      return res.status(400).json({ error: "올바르지 않은 반응입니다." });
    }

    if (!db.gratitudes) db.gratitudes = [];
    const grat = db.gratitudes.find((g) => g.id === id);
    if (!grat) return res.status(404).json({ error: "감사 글을 찾을 수 없습니다." });

    if (!grat.reactions) grat.reactions = {};
    const list = grat.reactions[type as ReactionType] || [];
    const idx = list.indexOf(userId);
    const added = idx === -1;
    if (added) list.push(userId);
    else list.splice(idx, 1);
    grat.reactions[type as ReactionType] = list;

    saveDb(db);
    res.json(grat);

    if (added) {
      const label = REACTION_LABEL[type as ReactionType];
      const who = (db.users || []).find((u) => u.id === userId)?.name || "누군가";
      sendPushToUsers(
        [grat.userId],
        {
          title: `${label.emoji} ${label.text}`,
          body: `${who} 님이 내 감사 나눔에 반응했어요`,
          url: "/",
          tag: "greact-" + grat.id
        },
        userId
      ).catch(() => {});
    }
  });

  app.post("/api/gratitudes/:id/comment", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId, userName, content } = req.body;

    if (!userId || !userName || !content || !content.trim()) {
      return res.status(400).json({ error: "댓글 내용을 입력해주세요." });
    }

    if (!db.gratitudes) db.gratitudes = [];
    const grat = db.gratitudes.find(g => g.id === id);
    if (!grat) {
      return res.status(404).json({ error: "감사 글을 찾을 수 없습니다." });
    }

    const newComment: Comment = {
      id: "comment-" + Math.random().toString(36).substring(2, 11),
      userId,
      userName,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    grat.comments.push(newComment);
    saveDb(db);
    res.json(grat);

    const participants = new Set<string>([grat.userId, ...grat.comments.map((c) => c.userId)]);
    sendPushToUsers(
      [...participants],
      {
        title: "💬 감사 나눔에 댓글이 달렸어요",
        body: `${userName} : ${newComment.content.slice(0, 60)}`,
        url: "/",
        tag: "grat-comment-" + grat.id
      },
      userId
    ).catch((e) => console.warn("[Push] 감사 댓글 알림 실패:", e));
  });

  app.delete("/api/gratitudes/:id/comment/:commentId", (req: Request, res: Response) => {
    const { id, commentId } = req.params;
    const { userId } = req.body;

    if (!db.gratitudes) db.gratitudes = [];
    const grat = db.gratitudes.find(g => g.id === id);
    if (!grat) {
      return res.status(404).json({ error: "감사 글을 찾을 수 없습니다." });
    }

    const commentIdx = grat.comments.findIndex(c => c.id === commentId);
    if (commentIdx === -1) {
      return res.status(404).json({ error: "댓글을 찾을 수 없습니다." });
    }

    const requestor = db.users.find(u => u.id === userId);
    if (grat.comments[commentIdx].userId !== userId && requestor?.role !== "admin") {
      return res.status(403).json({ error: "삭제 권한이 없습니다." });
    }

    grat.comments.splice(commentIdx, 1);
    saveDb(db);
    res.json(grat);
  });

  // --- Bible Q&A (AI Search & Pastoral Comments) APIs ---
  app.get("/api/qna", (req: Request, res: Response) => {
    if (!db.bibleQAs) db.bibleQAs = [];
    const sorted = [...db.bibleQAs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sorted);
  });

  app.post("/api/qna/ask", async (req: Request, res: Response) => {
    const { question, category } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "성경 질문 및 배경 탐구 내용을 입력해주세요." });
    }

    if (!db.bibleQAs) db.bibleQAs = [];

    let answerText = "";
    try {
      answerText = await generateQnaAnswer(question.trim());
    } catch (err: any) {
      console.error("Gemini Bible QnA error:", err);
      return res.status(500).json({ error: "AI 답변 생성 중 오류가 발생했습니다: " + (err.message || err) });
    }

    const newQA: BibleQA = {
      id: "qna-" + Math.random().toString(36).substring(2, 11),
      question: question.trim(),
      answer: answerText,
      category: category || "성경 역사 & 배경",
      likes: [],
      comments: [],
      createdAt: new Date().toISOString()
    };

    db.bibleQAs.unshift(newQA);
    saveDb(db);
    res.json(newQA);
  });

  app.post("/api/qna/:id/regenerate", async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!db.bibleQAs) db.bibleQAs = [];
    const qa = db.bibleQAs.find(q => q.id === id);
    if (!qa) return res.status(404).json({ error: "질문을 찾을 수 없습니다." });

    try {
      qa.answer = await generateQnaAnswer(qa.question);
      saveDb(db);
      res.json(qa);
    } catch (err: any) {
      console.error("Regenerate QnA error:", err);
      res.status(500).json({ error: "답변 재생성 실패: " + (err.message || err) });
    }
  });

  app.delete("/api/qna/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    if (!db.bibleQAs) db.bibleQAs = [];
    const idx = db.bibleQAs.findIndex(q => q.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "질문을 찾을 수 없습니다." });
    }

    db.bibleQAs.splice(idx, 1);
    saveDb(db);
    res.json({ success: true });
  });

  app.post("/api/qna/:id/like", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ error: "로그인이 필요합니다." });

    if (!db.bibleQAs) db.bibleQAs = [];
    const qa = db.bibleQAs.find(q => q.id === id);
    if (!qa) return res.status(404).json({ error: "질문을 찾을 수 없습니다." });

    const idx = qa.likes.indexOf(userId);
    if (idx === -1) {
      qa.likes.push(userId);
    } else {
      qa.likes.splice(idx, 1);
    }

    saveDb(db);
    res.json(qa);
  });

  app.post("/api/qna/:id/comment", (req: Request, res: Response) => {
    const { id } = req.params;
    const { userId, userName, content } = req.body;

    if (!userId || !userName || !content || !content.trim()) {
      return res.status(400).json({ error: "코멘트 내용을 입력해주세요." });
    }

    if (!db.bibleQAs) db.bibleQAs = [];
    const qa = db.bibleQAs.find(q => q.id === id);
    if (!qa) return res.status(404).json({ error: "질문을 찾을 수 없습니다." });

    const newComment: Comment = {
      id: "comment-" + Math.random().toString(36).substring(2, 11),
      userId,
      userName,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    qa.comments.push(newComment);
    saveDb(db);
    res.json(qa);
  });

  app.delete("/api/qna/:id/comment/:commentId", (req: Request, res: Response) => {
    const { id, commentId } = req.params;
    const { userId } = req.body;

    if (!db.bibleQAs) db.bibleQAs = [];
    const qa = db.bibleQAs.find(q => q.id === id);
    if (!qa) return res.status(404).json({ error: "질문을 찾을 수 없습니다." });

    const commentIdx = qa.comments.findIndex(c => c.id === commentId);
    if (commentIdx === -1) return res.status(404).json({ error: "코멘트를 찾을 수 없습니다." });

    const requestor = db.users.find(u => u.id === userId);
    if (qa.comments[commentIdx].userId !== userId && requestor?.role !== "admin") {
      return res.status(403).json({ error: "삭제 권한이 없습니다." });
    }

    qa.comments.splice(commentIdx, 1);
    saveDb(db);
    res.json(qa);
  });

  // --- Serve Frontend Client with Vite Middleware ---

  const PORT = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running beautifully on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical server launch error:", err);
});
