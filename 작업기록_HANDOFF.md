# 📖 성경묵상 공유앱 — 작업 기록 & 인수인계 문서

> 이 문서 하나만 있으면 창을 껐다 켜거나, 다른 컴퓨터/다른 AI 세션에서도 이어서 작업할 수 있습니다.
> **최종 업데이트: 2026-07-24 (커밋 `067c80e` 기준)**

---

## 0. ⚡ 지금 상황 3줄 요약

1. **코드는 전부 완성**되어 GitHub에 있음 (성경 66권 한/영, 버그수정, 앱아이콘, 데이터보호 안전장치)
2. **회원 데이터는 사고로 지워졌다가 전량 복구 완료** (아래 §5 필독)
3. **아직 배포(Cloud Run)를 못 끝냄** → 라이브 링크엔 아직 반영 안 됨 (§6이 남은 일)

---

## 1. 앱이 뭔지

교회 소그룹(20~30명)용 **성경 묵상 공유 웹앱(PWA)**. 매일 말씀 공지, 개인 묵상 작성·댓글, 성경 통독(읽음 체크·이어읽기), 감사 나눔, 성경 검색, AI 주간요약·Q&A.

- **기술 스택:** React 19 + Vite + Express(Node) + TypeScript, Firebase Firestore(DB), Capacitor(안드로이드), Gemini AI
- **원 제작처:** Google AI Studio (Build 앱)

---

## 2. 중요 주소·ID 모음 (★ 꼭 기억)

| 항목 | 값 |
|------|-----|
| **로컬 폴더** | `C:\Users\PC\Downloads\bible-meditation-share` |
| **GitHub 저장소 (최신 소스)** | https://github.com/beeeber12-cloud/CHO |
| **AI Studio 앱** | https://aistudio.google.com/apps/51dc6b61-0c1c-4779-bd3e-747eee2bf270 |
| **옛 배포 링크(AI Studio 프리뷰)** | https://ais-pre-eheqaxqlopf5kcigjedycp-437515220264.asia-east1.run.app/ |
| **Firebase 프로젝트(회원·묵상 데이터)** | `elemental-diode-2w1xt` (설정: `firebase-applet-config.json`) |
| **Firestore 문서 경로** | `app_data/main_db` (DB ID: `ai-studio-biblemeditations-51dc6b61-...`) |
| **Cloud Run용 GCP 프로젝트** | "My First Project" = `dulcet-medley-471901-m4` (결제 설정 완료) |
| **★ DB 백업 파일** | `C:\Users\PC\Downloads\bible-meditation-share_DB백업_20260724.json` |

---

## 3. ⚠️ 핵심 개념: "앱이 두 개로 갈라져 있다"

```
① AI Studio 내부 copy   →  옛 버전 (성경 15권, 버그)   →  ais-pre-...run.app (옛 링크)
② GitHub(CHO) + 로컬     →  새 버전 (전부 반영)         →  Cloud Run (배포 예정, 새 링크)
```

- **AI Studio 편집기는 ①(옛 버전)을 보여줌.** 우리가 고친 건 ②.
- AI Studio엔 GitHub "가져오기(Pull)"가 없어서 ②를 ①로 되돌릴 수 없음 (성경 데이터 12MB라 손으로도 불가)
- **결론: 앞으로 GitHub/Cloud Run(②)을 유일한 "집"으로 삼는다.** AI Studio는 사실상 은퇴.

---

## 4. 완료된 작업 전체

### ✅ (A) 성경 데이터 — 깨진 것 → 개역개정 66권 전권
- **문제:** 기존 데이터 파손(2MB에서 잘린 파일 2개) + 66권 중 **15권만** 존재, 요한복음은 3장·시편은 2장뿐 → 성경이 거의 안 불러와짐
- **조치:** 사용자 제공 `bible.json`(정품 개역개정 검증 통과, 31,089절) → `server/data/books/*.json` **낱권 66개**로 변환
- 요한복음 18:38 깨진 절 복원. 원본은 `server/data/bible_krv_source.json` 백업(GitHub 제외)

### ✅ (B) 성경이 안 불러와진 진짜 버그 3개 — `server/bibleData.ts`
1. **ESM `__dirname` 버그** — 이 앱은 ESM인데 `__dirname`을 써서 **모든 성경 조회가 실패**하고 있었음 (가장 큰 원인) → 안전 가드
2. **별칭 정규식 `\s*`** — "여호와"를 "여호수아"로 오인 → `\s`로 경계 강제
3. **`preloadAllBooks()`** — 시작 시 66권 프리로드 → 즉시 응답 + 키워드 문장검색 지원

### ✅ (C) 통독 이어읽기 북마크 밀림 수정 — `server.ts`
- 동기화 병합이 항상 원격 우선이라 북마크가 뒤로 밀리던 문제 → `updatedAt` 최신본 채택

### ✅ (D) Logos API 폐기 (보안)
- 하드코딩 API 키(`810b3c31...`) 및 `/api/logos/verse` **완전 삭제**
- 대신 내장 본문 기반 **`/api/bible/daily`(오늘의 추천구절)** 신설

### ✅ (E) NIV(영어) 성경 + 버전 토글
- **NIV 66권**(31,103절, `aruljohn/Bible-niv`, **MIT 라이선스 = 저작권 무관**) → `server/data/books_niv/*.json`
- `getNivText()`, `preloadAllNivBooks()`, API 응답에 `textNiv` 동봉
- 프론트 **`DualBibleText.tsx`**(절 단위 한/영 정렬) + **버전 토글(개역개정 / NIV / 같이 보기, 선택 기억)** + 오늘의말씀 영어 병기

### ✅ (F) 모바일 앱 설치(PWA) + 아이콘 정상화
- **원인:** `public/app_icon.jpg`가 **손상 파일**이었음(바이너리가 텍스트로 저장돼 `ef bf bd`로 시작) → 브라우저가 아이콘을 못 읽음
- 정상 원본(1024×1024)에서 복구 + **아이콘 세트 생성**: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`(안드로이드 적응형), `apple-touch-icon.png`(iOS)
- `manifest.json` 정비(이름 "말씀나눔", standalone, portrait), `index.html` 아이콘 태그, `sw.js` 캐시 v3
- **`PWAInstallPrompt.tsx` 실제 구현** — 원래 `return null` 빈 껍데기라 설치 버튼이 없었음. 이제 안드로이드=원터치 "앱 설치하기", iOS=공유→홈화면 추가 안내. 7일 스누즈, 설치 시 자동 숨김

### ✅ (G) Cloud Run 배포 준비
- `server.ts` 포트를 `process.env.PORT`(Cloud Run 8080) 우선으로 (기존 3000 고정이라 실패했음)
- **`Dockerfile`** + **`.dockerignore`** 추가
- `.gitignore`: `db.json`(회원 PIN 평문)·실제 `.env`·성경 원본백업 제외

---

## 5. 🚨 데이터 유실 사고 & 복구 (2026-07-24) — 반드시 읽을 것

### 무슨 일이
Firestore의 회원·묵상·공지·QnA가 **전부 삭제됨** (회원 4명 → 1명). 발생 시각 `08:17:33Z`.

### 원인
`db.json`을 GitHub에서 제외한 것(보안상 옳은 조치)이 이 앱의 **잠재 결함**을 건드림:

```
db.json 없는 새 서버 기동
  → 회원 0명 "초기 DB" 자동 생성
  → Firestore 읽기 실패
  → server.ts 의 saveToFirestore(빈 DB) 가 원격을 통째로 덮어씀 💥
```

### 복구 (완료)
로컬 `db.json` 백업(06:03 시점)으로 **전량 복구**. 단순 덮어쓰기가 아니라 백업 + 원격에만 있던 항목을 합치는 방식(union by id).

| 항목 | 사고 후 | 복구 후 |
|------|--------|--------|
| 회원 | 1명 | **4명** (관리자·조재영·구진경·최희란) |
| 공지 | 1 | **6** |
| QnA | 0 | **5** |
| 감사 | 0 | **2** |
| 묵상 | 0 | **1** |
| 통독진도 | 1명분 | **4명분** |

### 재발 방지 (커밋 `6457d09`) — 2중 안전장치
1. `isSeedLikeDb()` — 실회원 0 + 묵상/감사/QnA 0 이면 "초기상태"로 판별
2. 원격을 못 읽었는데 로컬이 초기상태 → **원격 쓰기 건너뜀**
3. 원격을 한 번도 못 읽은 서버(`remoteEverRead=false`)는 초기 DB **쓰기 차단**

**실제 시험 통과:** `db.json` 없는 상태로 기동 → `[SAFETY] ... 쓰기 차단` 로그 후 Firestore에서 회원 4명 정상 복원 확인.

### ⚠️ 교훈 / 습관
- 이 앱은 **전체 DB를 Firestore 문서 하나에 통째 덮어쓰는** 구조라 근본적으로 위험
- **배포 전에는 항상 `db.json` 백업**을 떠둘 것
- 장기적으로 문서 분리(`meditations/{id}`, `userBibleProgress/{userId}`) 권장

---

## 6. ⏳ 남은 일 = Cloud Run 배포

**GitHub엔 모든 게 있는데 라이브 링크엔 아직 반영 안 됨.** AI Studio 배포는 자기 내부 옛 소스를 쓰므로, **GitHub → Cloud Run 직접 배포**로 끝내야 함.

### 먼저 확인
Cloud Run 서비스 목록에 서비스가 이미 있는지 확인. 있으면 **최신 커밋(`067c80e` 이후)으로 재배포**해야 안전장치가 적용됨.

### 배포 체크리스트 (https://console.cloud.google.com → `Cloud Run` → 서비스 배포)
| 항목 | 설정값 |
|------|--------|
| 배포 방식 | **저장소에서 지속적 배포** → **`Cloud Build`** |
| 저장소 | **`beeeber12-cloud/CHO`** (GitHub 인증 필요) |
| 분기 | **`^main$`** |
| 빌드 유형 | ⚠️ **`Dockerfile`** (Buildpacks 아님) / 위치 `/Dockerfile` |
| 서비스 이름 | `bible-meditation` |
| 리전 | **`asia-northeast3` (서울)** |
| 인증 | ⚠️ **`인증되지 않은 호출 허용`** (교인들이 로그인 없이 접속) |
| 메모리 | **512 MiB** (성경 132권 로드해도 실측 56MB) |
| **최대 인스턴스** | ⚠️ **`1`** (DB 동시쓰기 꼬임 방지) |
| 환경변수(선택) | `GEMINI_API_KEY` = Gemini 키 (없으면 AI 요약/Q&A만 꺼짐) |

→ **만들기** → 3~6분 빌드 → 새 URL 생성

### 배포 후 확인 3가지
1. `시편 119편` 검색 → **176절** 나오면 성경 66권 성공
2. 본문 위 **`개역개정 / NIV / 같이 보기`** 토글 확인
3. 휴대폰 접속 → 하단 **"앱 설치하기"** → 초록 성경책 아이콘 설치

---

## 7. 앞으로 디자인/기능 바꾸는 법

**AI Studio 필요 없음.**

**(방법 1 — 추천) AI에게 말하기** → 코드 수정 → GitHub push → (지속적 배포 설정 시) 자동 반영

**(방법 2) 직접 편집**
- `src/components/*.tsx` (성경읽기=`BibleReader.tsx`, 묵상=`MeditationFeed.tsx` 등) / 서버=`server.ts` / 성경엔진=`server/bibleData.ts`
- `git add -A && git commit -m "..." && git push`

**로컬 실행:**
```bash
cd "C:\Users\PC\Downloads\bible-meditation-share"
npm install      # 최초 1회
npm run dev      # http://localhost:3000
npm run build    # 배포용 빌드 검증
```

---

## 8. 구조·보안 메모

- **성경 데이터 위치:** 파이어베이스가 아니라 **앱 서버 안의 파일** (`server/data/books`=개역개정, `books_niv`=NIV). 회원·묵상만 파이어베이스.
- **DB 구조:** 전체를 Firestore **단일 문서**(`app_data/main_db`)에 저장. 훗날 1MB 한도 위험 → 문서 분리 권장. 당분간 **인스턴스 1개 고정**으로 충분.
- **보안(사용자가 "우리끼리 써서 괜찮다"고 확인, 미조치):** 회원 PIN 평문, Firestore 규칙 전면 개방(`allow if true`), 회원가입 시 role 지정 가능. 외부 공개 서비스로 키우려면 손봐야 함.
- **저장소 공개여부:** `CHO` repo Public/Private 미확인. `firebase-applet-config.json` 포함돼 있어 **Private 권장**.

---

## 9. 커밋 이력 (2026-07-24)

```
067c80e  인수인계 문서에 데이터 유실 사고·복구·재발방지 기록 추가
6457d09  치명적 데이터 유실 버그 수정: 빈 DB가 Firestore를 덮어쓰지 못하도록 2중 안전장치
42f2b28  모바일 앱 설치(PWA) 정상화: 깨진 아이콘 복구 + 아이콘 세트 + 설치 버튼 구현
bb2b919  작업 기록·인수인계 문서 추가
2fcf4a5  NIV(영어) 성경 66권 추가 + 개역개정/NIV/같이보기 토글
def68cc  Cloud Run 직접 배포 대응: PORT 환경변수 처리 + Dockerfile 추가
0e2e447  개역개정 성경 66권 전권 탑재 + 성경검색 버그 수정 + Logos API 폐기
```

---

## 10. 재개할 때 AI에게 한 줄로 말하는 법

> "`C:\Users\PC\Downloads\bible-meditation-share` 의 `작업기록_HANDOFF.md` 읽고 이어서 작업하자.
> 지금 **[Cloud Run 배포 마무리 / 디자인 변경 / 기능 추가 / DB 백업]** 하고 싶어."
