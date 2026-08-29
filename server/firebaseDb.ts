/**
 * Firestore 연결 — 관리자(Admin) SDK 사용.
 *
 * 예전에는 브라우저용 SDK 를 서버에서 그대로 썼다. 그러면 서버도 '일반 방문자' 자격이라
 * 보안 규칙을 통과해야 했고, 그래서 규칙이 `allow read, write: if true` 로 열려 있었다.
 * 즉 접속 정보만 알면 누구나 교인들의 묵상·PIN 을 읽고 지울 수 있는 상태였다.
 *
 * 관리자 SDK 는 보안 규칙을 거치지 않으므로, 규칙을 전면 차단으로 잠가도 서버는 그대로 동작한다.
 * → 데이터에 닿는 길이 '이 서버' 하나로 좁혀진다.
 *
 * 자격 증명은 Cloud Run 에 붙어 있는 서비스 계정을 그대로 쓴다(ADC). 키 파일을 두지 않는다.
 *
 * ── 저장 구조 ──────────────────────────────────────────────
 * 예전에는 DB 전체가 문서 **하나**였다. Firestore 는 문서 하나에 1MB 까지만 담기는데,
 * 2026-08-30 기준 166KB 였고 주당 25KB 씩 늘어 8개월 뒤면 글이 저장되지 않을 상황이었다.
 * 그래서 계속 쌓이는 목록(묵상·공지·감사·문답·체크한구절)만 낱장으로 뺐다.
 *
 *   app_config/global                     ← 앱 전체가 공유 (푸시 신원, 증표 비밀키)
 *   communities/{공동체}                   ← 회원·진도·설정
 *   communities/{공동체}/meditations/{id}  ← 낱장
 *   communities/{공동체}/notices/{id}
 *   ...
 *
 * 공동체별로 칸을 나눠 둔 것은 나중에 다른 교회를 받기 위해서다.
 * 지금은 공동체가 하나(DEFAULT_COMMUNITY_ID)뿐이라 동작은 예전과 똑같다.
 *
 * 서버 안에서 쓰는 모양(DatabaseSchema)은 하나도 바뀌지 않았다.
 * 읽을 때 합쳐서 올려주고, 저장할 때 다시 나눠서 내려보낸다.
 */
import { initializeApp, getApps, getApp, applicationDefault, App } from "firebase-admin/app";
import { getFirestore, Firestore, DocumentReference } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { DatabaseSchema } from "../src/types";

/** 계속 쌓이는 목록 — 낱장으로 보관한다 */
const SPLIT_KEYS = ["meditations", "notices", "gratitudes", "bibleQAs", "savedVerses"] as const;
type SplitKey = (typeof SPLIT_KEYS)[number];

/**
 * 앱 전체가 공유하는 값 — 공동체가 여러 개가 되어도 이건 하나여야 한다.
 * VAPID 키는 '푸시 발신자 신원'이라 공동체마다 다르면 안 되고,
 * 증표 비밀키가 공동체마다 다르면 로그인 증표를 서로 검증할 수 없다.
 */
const GLOBAL_KEYS = ["vapidKeys", "sessionSecret", "pinResetMark"] as const;

/** 지금 쓰고 있는 유일한 공동체. 공동체 기능이 붙으면 이 값이 여러 개가 된다. */
export const DEFAULT_COMMUNITY_ID = "cho";

const COMMUNITIES = "communities";
const APP_CONFIG = "app_config";
const LEGACY_COLLECTION = "app_data";
const LEGACY_DOC = "main_db";

/** 이 번호가 있으면 낱장 구조로 저장이 끝난 것이다. 없으면 옛 구조를 읽어 온다. */
const STORAGE_VERSION = 2;

/** 배치 한 번에 넣을 수 있는 최대 작업 수 (Firestore 제한은 500) */
const BATCH_LIMIT = 400;

let dbInstance: Firestore | null = null;
let initFailed = false;

/**
 * 지난번에 저장한 낱장의 내용을 기억해 둔다. `공동체:목록` → `id` → 내용(JSON).
 * 이게 있어야 **달라진 것만** 쓸 수 있다. 없으면 매번 전부 다시 쓰게 되어
 * 무료 쓰기 한도를 금방 태운다 (2026-07-29 에 실제로 겪은 사고).
 */
const lastWritten = new Map<string, Map<string, string>>();

/**
 * 어느 프로젝트의 Firestore 를 볼지 정한다. 설정 파일(firebase-applet-config.json)이 기준이고,
 * 환경변수는 '일부러 지정했을 때'(FIREBASE_PROJECT_ID)만 앞선다.
 *
 * 옛날에는 데이터가 Firebase 쪽(elemental-diode-2w1xt), 앱이 GCP 쪽(dulcet-medley-...) 으로
 * 갈려 있었다. 그쪽은 목사님 계정에 관리 권한이 없어 보안 규칙을 잠글 수도 없었다.
 * 2026-08-30 에 데이터를 앱과 같은 프로젝트로 옮겼다. 이제 둘은 한 프로젝트다.
 * → Cloud Run 서비스 계정이 자기 프로젝트 권한을 이미 갖고 있으므로 따로 줄 권한이 없다.
 */
function readSettings(): { projectId: string; databaseId?: string } | null {
  const envProject = process.env.FIREBASE_PROJECT_ID;
  const envDatabase = process.env.FIRESTORE_DATABASE_ID;
  if (envProject) return { projectId: envProject, databaseId: envDatabase };

  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (config.projectId) {
        return {
          projectId: config.projectId,
          databaseId: envDatabase || config.firestoreDatabaseId || undefined
        };
      }
    }
  } catch (err) {
    console.error("Firebase 설정 파일을 읽지 못했습니다:", err);
  }
  return null;
}

export function getFirebaseFirestore(): Firestore | null {
  if (dbInstance) return dbInstance;
  if (initFailed) return null;

  const settings = readSettings();
  if (!settings) {
    // 로컬에서 설정 없이 돌릴 때. 이 경우 db.json 만 쓰고 원격은 건드리지 않는다.
    initFailed = true;
    return null;
  }

  try {
    const app: App =
      getApps().length === 0
        ? initializeApp({ credential: applicationDefault(), projectId: settings.projectId })
        : getApp();

    dbInstance = settings.databaseId
      ? getFirestore(app, settings.databaseId)
      : getFirestore(app);

    // Firestore 는 undefined 필드를 거부한다. 저장 쪽에서도 걸러내지만 여기서도 막아 둔다.
    try {
      dbInstance.settings({ ignoreUndefinedProperties: true });
    } catch {
      // 이미 한 번 설정된 뒤라면 무시해도 된다
    }

    console.log(
      `Firestore(관리자 SDK) 연결 완료 — 프로젝트 ${settings.projectId}` +
        (settings.databaseId ? ` / DB ${settings.databaseId}` : "")
    );
    return dbInstance;
  } catch (err) {
    console.error("Firestore(관리자 SDK) 초기화 실패:", err);
    initFailed = true;
    return null;
  }
}

/** 낱장 한 건을 가리키는 이름. 없거나 이상하면 저장하지 않는다. */
function idOf(item: any): string | null {
  const raw = item?.id;
  if (typeof raw !== "string") return null;
  const id = raw.trim();
  // Firestore 문서 이름에 '/' 는 못 들어간다. 나머지는 그대로 써도 된다.
  // Firestore 는 __로 감싼 이름을 예약해 두고 있어 문서 이름으로 쓸 수 없다.
  if (!id || id.includes("/") || id === "." || id === "..") return null;
  if (/^__.*__$/.test(id)) return null;
  return id;
}

function cacheKey(communityId: string, key: SplitKey) {
  return `${communityId}:${key}`;
}

// ── 읽기 ────────────────────────────────────────────────────

export async function fetchFromFirestore(
  communityId: string = DEFAULT_COMMUNITY_ID
): Promise<DatabaseSchema | null> {
  const firestore = getFirebaseFirestore();
  if (!firestore) return null;

  try {
    const communityRef = firestore.collection(COMMUNITIES).doc(communityId);
    const [communitySnap, globalSnap] = await Promise.all([
      communityRef.get(),
      firestore.collection(APP_CONFIG).doc("global").get()
    ]);

    // 낱장 구조로 아직 한 번도 저장한 적이 없으면 옛 문서를 읽는다.
    // (다음번 저장에서 자동으로 새 구조로 옮겨진다)
    if (!communitySnap.exists || (communitySnap.data() as any)?.storageVersion !== STORAGE_VERSION) {
      const legacy = await firestore.collection(LEGACY_COLLECTION).doc(LEGACY_DOC).get();
      if (legacy.exists) {
        console.log("Firestore — 옛 구조(문서 하나)에서 불러왔습니다. 다음 저장 때 낱장으로 옮깁니다.");
        return legacy.data() as DatabaseSchema;
      }
      if (!communitySnap.exists) return null;
    }

    const base = (communitySnap.data() || {}) as any;
    const global = (globalSnap.exists ? globalSnap.data() : {}) as any;

    // 낱장들을 한꺼번에 읽어 목록으로 되돌린다
    const lists = await Promise.all(
      SPLIT_KEYS.map(async (key) => {
        const snap = await communityRef.collection(key).get();
        const items = snap.docs.map((d) => d.data());
        // 다음 저장 때 '달라진 것만' 고를 수 있도록 지금 내용을 기억해 둔다
        const seen = new Map<string, string>();
        for (const item of items) {
          const id = idOf(item);
          if (id) seen.set(id, JSON.stringify(item));
        }
        lastWritten.set(cacheKey(communityId, key), seen);
        return [key, items] as const;
      })
    );

    const result: any = { ...base };
    delete result.storageVersion;
    for (const [key, items] of lists) result[key] = items;
    for (const key of GLOBAL_KEYS) {
      if (global[key] !== undefined) result[key] = global[key];
    }

    const counts = lists.map(([k, v]) => `${k} ${v.length}`).join(" / ");
    console.log(`Firestore 에서 데이터를 불러왔습니다 (${counts}).`);
    return result as DatabaseSchema;
  } catch (err) {
    console.error("Firestore 읽기 실패:", err);
  }
  return null;
}

// ── 저장 ────────────────────────────────────────────────────

/**
 * 목록 하나를 낱장으로 저장한다. **달라진 것만** 쓰고, 없어진 것만 지운다.
 * 바뀐 게 없으면 쓰기가 0건이다.
 */
async function saveList(
  firestore: Firestore,
  communityRef: DocumentReference,
  communityId: string,
  key: SplitKey,
  items: any[]
): Promise<{ wrote: number; removed: number }> {
  const now = new Map<string, string>();
  for (const item of items) {
    const id = idOf(item);
    if (!id) {
      console.error(`[저장] ${key} 에 id 가 없는 항목이 있어 건너뜁니다:`, JSON.stringify(item).slice(0, 120));
      continue;
    }
    now.set(id, JSON.stringify(item));
  }

  let prev = lastWritten.get(cacheKey(communityId, key));
  if (!prev) {
    // 이 컨테이너가 아직 한 번도 안 읽어 봤다면 원격의 현재 상태를 확인하고 시작한다
    const snap = await communityRef.collection(key).get();
    prev = new Map(snap.docs.map((d) => [d.id, JSON.stringify(d.data())]));
  }

  const changed: string[] = [];
  for (const [id, json] of now) {
    if (prev.get(id) !== json) changed.push(id);
  }
  const removed = [...prev.keys()].filter((id) => !now.has(id));

  // ⚠️ 안전장치 — 어떤 이유로든 목록이 통째로 비어 버렸을 때 원격까지 지우지 않는다.
  //    (2026-07-24 에 빈 DB 가 원격을 덮어써 데이터가 날아간 적이 있다)
  if (now.size === 0 && prev.size > 0) {
    console.error(`[SAFETY] ${key} 가 ${prev.size}건 → 0건이 되어 삭제를 건너뜁니다.`);
    return { wrote: 0, removed: 0 };
  }

  let batch = firestore.batch();
  let count = 0;
  const flush = async () => {
    if (count === 0) return;
    await batch.commit();
    batch = firestore.batch();
    count = 0;
  };

  for (const id of changed) {
    batch.set(communityRef.collection(key).doc(id), JSON.parse(now.get(id)!));
    if (++count >= BATCH_LIMIT) await flush();
  }
  for (const id of removed) {
    batch.delete(communityRef.collection(key).doc(id));
    if (++count >= BATCH_LIMIT) await flush();
  }
  await flush();

  lastWritten.set(cacheKey(communityId, key), now);
  return { wrote: changed.length, removed: removed.length };
}

export async function saveToFirestore(
  dbData: DatabaseSchema,
  communityId: string = DEFAULT_COMMUNITY_ID
): Promise<void> {
  const firestore = getFirebaseFirestore();
  if (!firestore) return;

  try {
    const communityRef = firestore.collection(COMMUNITIES).doc(communityId);

    // 1) 계속 쌓이는 목록 — 낱장으로, 달라진 것만
    const report: string[] = [];
    for (const key of SPLIT_KEYS) {
      const items = Array.isArray((dbData as any)[key]) ? (dbData as any)[key] : [];
      const { wrote, removed } = await saveList(firestore, communityRef, communityId, key, items);
      if (wrote || removed) report.push(`${key} +${wrote}${removed ? ` -${removed}` : ""}`);
    }

    // 2) 나머지(회원·진도·설정) — 공동체 문서 하나에
    const base: any = { ...dbData };
    for (const key of SPLIT_KEYS) delete base[key];
    for (const key of GLOBAL_KEYS) delete base[key];
    base.storageVersion = STORAGE_VERSION;
    base.updatedAt = new Date().toISOString();
    await communityRef.set(base);

    // 3) 앱 전체가 공유하는 값 — 있을 때만 건드린다
    const global: any = {};
    for (const key of GLOBAL_KEYS) {
      const v = (dbData as any)[key];
      if (v !== undefined) global[key] = v;
    }
    if (Object.keys(global).length > 0) {
      global.updatedAt = base.updatedAt;
      await firestore.collection(APP_CONFIG).doc("global").set(global, { merge: true });
    }

    console.log(`Firestore 에 저장했습니다${report.length ? ` — ${report.join(", ")}` : " (목록 변경 없음)"}.`);
  } catch (err) {
    console.error("Firestore 저장 실패:", err);
    throw err;
  }
}
