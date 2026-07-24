# 📖 성경묵상 공유앱 — 작업 기록 & 인수인계 문서

> 이 문서 하나만 있으면 창을 껐다 켜거나, 다른 컴퓨터/다른 AI 세션에서도 이어서 작업할 수 있습니다.
> 최종 업데이트: 2026-07-24

---

## 1. 앱이 뭔지 (한 줄 요약)

교회 소그룹(20~30명)용 **성경 묵상 공유 웹앱(PWA)**. 매일 말씀 공지, 개인 묵상 작성·댓글, 성경 통독(읽음 체크·이어읽기), 감사 나눔, 성경 검색, AI 주간요약·Q&A 기능.

- **기술 스택:** React 19 + Vite + Express(Node) + TypeScript, Firebase Firestore(DB), Capacitor(안드로이드), Gemini AI
- **원 제작처:** Google AI Studio (Build 앱)

---

## 2. 중요 주소·ID 모음 (★ 꼭 기억)

| 항목 | 값 |
|------|-----|
| **로컬 폴더** | `C:\Users\PC\Downloads\bible-meditation-share` |
| **GitHub 저장소 (최신 소스)** | https://github.com/beeeber12-cloud/CHO.git |
| **AI Studio 앱** | https://aistudio.google.com/apps/51dc6b61-0c1c-4779-bd3e-747eee2bf270 |
| **옛 배포 링크(AI Studio 프리뷰)** | https://ais-pre-eheqaxqlopf5kcigjedycp-437515220264.asia-east1.run.app/ |
| **Firebase 프로젝트(회원·묵상 데이터)** | `elemental-diode-2w1xt` (설정파일 `firebase-applet-config.json`) |
| **Cloud Run용 GCP 프로젝트** | "My First Project" = `dulcet-medley-471901-m4` (결제 설정 완료) |

---

## 3. ⚠️ 가장 중요한 개념: "앱이 두 개로 갈라져 있다"

```
① AI Studio 내부 copy   →  옛 버전 (성경 15권, 버그 있음)  →  ais-pre-...run.app (옛 링크)
② GitHub(CHO) + 로컬      →  새 버전 (성경 66권 + NIV, 버그수정)  →  Cloud Run (배포 예정, 새 링크)
```

- **AI Studio 편집기는 ①(옛 버전)을 보여줌.** 우리가 고친 건 ②.
- 이 둘은 자동으로 안 합쳐진다. → **작업할 "집"을 하나로 정해야 함.**
- **추천: 앞으로 GitHub/Cloud Run(②)을 기준(집)으로 삼는다.** AI Studio는 성경 데이터(12MB)를 다시 못 넣으므로 사실상 은퇴.

---

## 4. 우리가 한 작업 전체 (완료된 것)

### ✅ (A) 성경 데이터 — 깨진 것 → 개역개정 66권 전권 교체
- **문제:** 기존 데이터가 파손(2MB에서 잘린 파일 2개) + 66권 중 15권만 있었고, 요한복음은 3장, 시편은 2장만 있었음 → **성경이 거의 안 불러와짐**
- **조치:** 사용자 제공 `bible.json`(정품 개역개정, 31,089절) 검증 후 → `server/data/books/*.json` **낱권 66개**로 변환
- 요한복음 18:38 깨진 절 복원. 원본은 `server/data/bible_krv_source.json`로 백업(GitHub 제외)

### ✅ (B) 성경이 안 불러와진 진짜 버그 3개 수정 — `server/bibleData.ts`
1. **ESM `__dirname` 버그** — 이 앱은 ESM인데 `__dirname`을 써서 **모든 성경 조회가 에러로 실패**하고 있었음 → 안전 가드 처리 (가장 큰 원인)
2. **별칭 정규식 `\s*` 버그** — "여호와"를 "여호수아"로 오인 → `\s`로 경계 강제
3. **`preloadAllBooks()` 추가** — 서버 시작 시 66권 미리 로드 → 검색 즉시 응답 + 키워드 문장검색 지원

### ✅ (C) 통독 이어읽기 북마크 밀림 수정 — `server.ts`
- Firestore 동기화 병합이 항상 원격을 우선해서 **북마크가 뒤로 밀리던** 문제 → `updatedAt` 최신본 채택으로 수정

### ✅ (D) Logos API 폐기 (보안)
- 하드코딩된 API 키(`810b3c31...`) 및 `/api/logos/verse` 엔드포인트 **완전 삭제**
- 대신 내장 본문 기반 **`/api/bible/daily`(오늘의 추천구절)** 신설. 프론트 배너도 이걸로 연결

### ✅ (E) NIV(영어 성경) 추가 + 버전 토글
- **NIV 66권**(31,103절, `aruljohn/Bible-niv`, **MIT 라이선스라 저작권 무관**) → `server/data/books_niv/*.json`
- `server/bibleData.ts`: NIV 로더 + `getNivText()` + `preloadAllNivBooks()`
- `server.ts`: `/api/bible/search`·`/api/bible/daily` 응답에 영어 본문(`textNiv`) 동봉
- 프론트: **`DualBibleText.tsx`**(절 단위 한/영 정렬 컴포넌트) + **성경읽기 버전토글(개역개정 / NIV / 같이 보기, 선택 기억됨)** + 오늘의말씀 카드에 영어 병기

### ✅ (F) Cloud Run 배포 준비
- `server.ts`: 포트를 `process.env.PORT`(Cloud Run 8080) 우선으로 (기존 3000 고정 → Cloud Run에서 실패했음)
- **`Dockerfile`** + **`.dockerignore`** 추가
- `.gitignore`: `db.json`(회원 PIN 평문)·실제 `.env`·성경 원본백업 **제외** 처리

### ✅ (G) 모바일 앱 설치(PWA) + 아이콘 정상화
- **원인 발견:** `public/app_icon.jpg`가 **손상된 파일**이었음(바이너리가 텍스트로 저장돼 `ef bf bd`로 시작) → 브라우저가 아이콘을 못 읽어 설치해도 아이콘이 안 나옴
- **복구:** 정상 원본(`src/assets/images/app_icon_1784640295623.jpg`, 1024×1024)에서 재생성
- **PWA 아이콘 세트 생성:** `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`(안드로이드 적응형·안전영역 확보), `apple-touch-icon.png`(iOS 180px)
- `manifest.json` 정비(이름 "말씀나눔", standalone, portrait, 아이콘 3종), `index.html` 아이콘 태그 추가, `sw.js` 캐시 v3로 상향
- **`PWAInstallPrompt.tsx` 실제 구현** — 원래 `return null`인 빈 껍데기라 설치 버튼이 아예 없었음. 이제 안드로이드=원터치 "앱 설치하기" 버튼, iOS=공유→홈 화면에 추가 안내. 7일 스누즈, 설치 완료/이미 설치 시 자동 숨김. `App.tsx`에 로그인화면·메인 양쪽 마운트

### 검증 완료
- `npm install` + `npm run build` **통과** (프론트 vite + 서버 esbuild)
- 빌드된 서버 실제 기동 → **개역개정 66권 + NIV 66권 프리로드 성공**, 검색·오늘의말씀 한/영 동시 반환 확인

### GitHub 커밋 이력 (최신순)
```
2fcf4a5  NIV(영어) 성경 66권 추가 + 개역개정/NIV/같이보기 토글
def68cc  Cloud Run 직접 배포 대응: PORT 환경변수 처리 + Dockerfile 추가
0e2e447  개역개정 성경 66권 전권 탑재 + 성경검색 버그 수정 + Logos API 폐기
```
→ **GitHub(CHO) = 위 모든 작업이 반영된 최신 버전.** (검증 완료)

---

## 5. ⏳ 아직 안 끝난 것 = Cloud Run 배포

**GitHub엔 새 버전이 다 있는데, 아직 라이브 링크에 반영이 안 됨.** AI Studio의 배포는 자기 내부 옛 소스를 쓰기 때문. → **GitHub → Cloud Run 직접 배포**로 끝내야 함.

### 남은 배포 단계 (전부 브라우저, https://console.cloud.google.com)
1. **Cloud Run** → **서비스 배포** → **서비스**
2. **"저장소에서 지속적 배포"** 선택 → **`Cloud Build`** → **`Cloud Build로 설정`**
3. GitHub 인증(beeeber12-cloud) → 저장소 **`beeeber12-cloud/CHO`** → 분기 `^main$` → **빌드 유형: `Dockerfile`** (⚠️ Buildpacks 아님) → 저장
4. 서비스 이름 `bible-meditation` / 리전 **`asia-northeast3(서울)`** / 인증 **`인증되지 않은 호출 허용`**
5. (선택) 컨테이너 → 변수: `GEMINI_API_KEY` = (Gemini 키) — 없으면 AI 요약/Q&A만 꺼지고 나머지는 정상
6. **만들기** → 3~6분 빌드 → **새 URL** 생성
7. 확인: 새 URL에서 **`시편 119편`** 검색 → 176절 + 버전토글 보이면 **성공** 🎉

> 기존 회원·묵상 데이터는 같은 Firebase(`elemental-diode-2w1xt`)를 쓰므로 그대로 유지됨.

---

## 6. 앞으로 디자인/기능을 바꾸고 싶을 때

**AI Studio 필요 없음. 방법 2가지:**

**(방법 1 — 추천) AI(클로드)에게 말하기**
- "오늘의 말씀 카드 색 바꿔줘", "글자 크게", "버튼 위치 옮겨줘" 등 말하면
- 코드 수정 → GitHub에 push → (Cloud Run 자동배포 설정 시) 자동 반영

**(방법 2) 직접 코드 편집**
- 로컬 폴더에서 편집 → `git add -A && git commit -m "..." && git push`
- 주요 파일:
  - 화면(디자인): `src/components/*.tsx` (성경읽기=`BibleReader.tsx`, 묵상=`MeditationFeed.tsx` 등)
  - 서버/API: `server.ts`
  - 성경 엔진: `server/bibleData.ts`

**로컬에서 앱 띄워보기(테스트):**
```bash
cd "C:\Users\PC\Downloads\bible-meditation-share"
npm install      # 최초 1회
npm run dev      # http://localhost:3000
```

---

## 7. 알아둘 점 (구조·보안 메모)

- **DB 구조:** 전체 데이터를 Firestore **단일 문서 1개**(`app_data/main_db`)에 통째 저장. 훗날 묵상이 아주 많이 쌓이면 1MB 한도에 걸릴 수 있음. → 장기적으로 문서 분리 권장. 당분간은 **Cloud Run 인스턴스를 1개로 고정**하면 동시쓰기 문제 없음.
- **성경 데이터 위치:** 파이어베이스가 아니라 **앱 서버 안의 파일**(`server/data/books`=개역개정, `books_niv`=NIV). 회원·묵상만 파이어베이스.
- **보안(사용자가 "우리끼리 써서 괜찮다"고 확인함, 미조치):** 회원 PIN 평문 저장, Firestore 규칙 전면 개방(`allow if true`), 회원가입 시 role 지정 가능. 외부 공개 서비스로 키우려면 이 부분 손봐야 함.
- **저장소 공개여부:** `CHO` repo가 Public/Private 미확인. `firebase-applet-config.json`이 포함돼 있어 **가급적 Private 권장**.

---

## 8. 재개할 때 AI에게 한 줄로 말하는 법

> "C:\Users\PC\Downloads\bible-meditation-share 의 `작업기록_HANDOFF.md` 읽고 이어서 작업하자. 지금 [Cloud Run 배포 마무리 / 디자인 변경 / 기능 추가] 하고 싶어."
