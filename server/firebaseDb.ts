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
 */
import { initializeApp, getApps, getApp, applicationDefault, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { DatabaseSchema } from "../src/types";

let dbInstance: Firestore | null = null;
let initFailed = false;

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

export async function fetchFromFirestore(): Promise<DatabaseSchema | null> {
  const firestore = getFirebaseFirestore();
  if (!firestore) return null;

  try {
    const snapshot = await firestore.collection("app_data").doc("main_db").get();
    if (snapshot.exists) {
      console.log("Firestore 에서 데이터를 불러왔습니다.");
      return snapshot.data() as DatabaseSchema;
    }
  } catch (err) {
    console.error("Firestore 읽기 실패:", err);
  }
  return null;
}

export async function saveToFirestore(dbData: DatabaseSchema): Promise<void> {
  const firestore = getFirebaseFirestore();
  if (!firestore) return;

  try {
    await firestore
      .collection("app_data")
      .doc("main_db")
      .set({ ...dbData, updatedAt: new Date().toISOString() });
    console.log("Firestore 에 저장했습니다.");
  } catch (err) {
    console.error("Firestore 저장 실패:", err);
    throw err;
  }
}
