# 📖 성경묵상 공유앱 — 작업 기록 & 인수인계 문서

> 이 문서 하나만 있으면 창을 껐다 켜거나, 다른 컴퓨터/다른 AI 세션에서도 이어서 작업할 수 있습니다.
> **최종 업데이트: 2026-07-29 (이전 커밋 `067c80e` + 2026-07-29 신규 수정분 기준)**

---

## 0. ⚡ 지금 상황 3줄 요약

1. **코드 완성 + UI/UX 대폭 개선** (폰트 확대, 감사탭 정리, 성경 원터치 네비게이터 등)
2. **Cloud Run 배포 완료** → 라이브 링크: `https://cho-1006806795339.asia-northeast3.run.app`
3. **GitHub 웹 편집으로 코드 반영 중** — 수정 파일은 GitHub에서 직접 붙여넣기 방식으로 커밋

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
| **AI Studio 앱 (은퇴, 참고용)** | https://aistudio.google.com/apps/51dc6b61-0c1c-4779-bd3e-747eee2bf270 |
| **옛 배포 링크 (AI Studio, 사용 안 함)** | https://ais-pre-eheqaxqlopf5kcigjedycp-437515220264.asia-east1.run.app/ |
| **★ 현재 라이브 링크 (Cloud Run)** | https://cho-1006806795339.asia-northeast3.run.app |
| **Firebase 프로젝트** | `elemental-diode-2w1xt` (설정: `firebase-applet-config.json`) |
| **Firestore 문서 경로** | `app_data/main_db` (DB ID: `ai-studio-biblemeditations-51dc6b61-...`) |
| **Cloud Run GCP 프로젝트** | "My First Project" = `dulcet-medley-471901-m4` (결제 설정 완료) |
| **★ DB 백업 파일** | `C:\Users\PC\Downloads\bible-meditation-share_DB백업_20260724.json` |

---

## 3. ⚠️ 핵심 개념: "앱이 두 개로 갈라져 있다"

```
① AI Studio 내부 copy   →  옛 버전 (성경 15권, 버그)   →  ais-pre-...run.app (옛 링크, 은퇴)
② GitHub(CHO) + 로컬     →  새 버전 (전부 반영)         →  Cloud Run (현재 라이브 링크)
```

- **AI Studio 편집기는 ①(옛 버전)을 보여줌.** 우리가 고친 건 ②.
- AI Studio엔 GitHub "가져오기(Pull)"가 없어서 ②를 ①로 되돌릴 수 없음
- **결론: GitHub/Cloud Run(②)을 유일한 "집"으로 삼는다.** AI Studio는 은퇴.
- ⚠️ `ais-pre-...run.app` 링크에서 확인하면 옛 버전이 보이므로 **반드시 `cho-...run.app` 링크에서 확인할 것!**

---

## 4. 완료된 작업 전체

### 이전 세션 (2026-07-24 이전, 커밋 `067c80e` 기준)

#### ✅ (A) 성경 데이터 — 깨진 것 → 개역개정 66권 전권
- 기존 데이터 파손 + 15권만 존재 → 사용자 제공 `bible.json`(31,089절) → `server/data/books/*.json` 낱권 66개로 변환
- 요한복음 18:38 깨진 절 복원

#### ✅ (B) 성경이 안 불러와진 버그 3개 수정 — `server/bibleData.ts`
1. ESM `__dirname` 버그 → 안전 가드
2. 별칭 정규식 `\s*` → `\s`로 경계 강제
3. `preloadAllBooks()` — 시작 시 66권 프리로드

#### ✅ (C) 통독 이어읽기 북마크 밀림 수정 — `server.ts`
- `updatedAt` 최신본 채택

#### ✅ (D) Logos API 폐기 (보안)
- 하드코딩 API 키 및 `/api/logos/verse` 완전 삭제
- 내장 본문 기반 `/api/bible/daily`(오늘의 추천구절) 신설

#### ✅ (E) NIV(영어) 성경 + 버전 토글
- NIV 66권(31,103절, MIT 라이선스) → `server/data/books_niv/*.json`
- 프론트 `DualBibleText.tsx` + 버전 토글(개역개정/NIV/같이 보기)

#### ✅ (F) 모바일 앱 설치(PWA) + 아이콘 정상화
- 손상된 아이콘 복구 + 아이콘 세트 생성
- `PWAInstallPrompt.tsx` 실제 구현

#### ✅ (G) Cloud Run 배포 준비
- `server.ts` 포트를 `process.env.PORT` 우선으로
- `Dockerfile` + `.dockerignore` 추가

#### ✅ (H) 데이터 유실 사고 & 복구 + 재발 방지
- Firestore 전체 삭제 사고 → 로컬 백업으로 전량 복구
- 재발 방지 2중 안전장치 (커밋 `6457d09`)

---

### 이번 세션 (2026-07-29)

#### ✅ (I) 전역 폰트 크기 11% 확대 + 줄바꿈 규칙
- **파일:** `src/index.css`
- `html { font-size: 111%; }` 추가 → Tailwind rem 기반 사이즈 전체에 자동 반영
- `body`에 `word-break: keep-all; overflow-wrap: break-word;` 추가 → 한글 단어 중간에서 줄바꿈되지 않음

#### ✅ (J) 오늘의 감사 탭 — 검색/동기화 표시 삭제
- **파일:** `src/components/DailyGratitude.tsx`
- '감사 내용, 작성자 검색...' 검색창 삭제 (관련 state `searchTerm`, 필터 로직, `Search`/`Radio` 아이콘 import 정리)
- '실시간 동기화' 배지(초록색 펄스 뱃지) 삭제
- 탭 타이틀 `text-xl` → `text-2xl sm:text-3xl`로 확대

#### ✅ (K) 각 탭 타이틀 글씨 가독성 확대
- **파일들:**
  - `src/components/DailyNotice.tsx` — '오늘의 말씀 공지' `text-base sm:text-lg` → `text-lg sm:text-2xl`
  - `src/components/DailyGratitude.tsx` — '오늘의 감사 나눔터' `text-xl` → `text-2xl sm:text-3xl`
  - `src/components/BibleQnA.tsx` — 'AI 성경 역사 & 배경 Q&A' `text-xl` → `text-2xl sm:text-3xl`
  - `src/components/MyMeditations.tsx` — '영성 기록 발자취' `text-lg sm:text-2xl` → `text-xl sm:text-3xl`
  - `src/components/BibleReader.tsx` — '개인 성경 통독방' `text-lg sm:text-2xl` → `text-xl sm:text-3xl`

#### ✅ (L) 성경통독 탭 — 추천 구절 / PERSONAL HUB 배지 삭제
- **파일:** `src/components/BibleReader.tsx`
- '오늘의 추천 구절' 배너 전체 삭제 (JSX + 관련 state `logosVerse`/`logosLoading` + `fetchLogosVerse` 함수)
- 'PERSONAL BIBLE READING HUB' 텍스트 배지 삭제

#### ✅ (M) 성경통독 탭 — 원터치 성경 네비게이터 전면 교체
- **파일:** `src/components/BibleReader.tsx`
- **삭제:** 기존 드롭다운 3종 세트 ('전체 66권 / 구약 / 신약' 필터 → '1. 성경 선택(권)' 드롭다운 → '2. 장 선택' 드롭다운 → '본문 열기' 버튼)
- **신설:** 구약/신약 2탭 + 권·장·절 **버튼 그리드** 원터치 네비게이터
  - **STEP 1 (권):** 구약 39권 or 신약 27권이 3열 버튼 그리드로 표시
  - **STEP 2 (장):** 선택한 권의 장 번호가 5열(모바일)/8열(데스크톱) 그리드로 표시. 통독 완료 장은 초록색 + ✓ 표시
  - **STEP 3 (절):** 장 선택 즉시 아래 본문 영역에 장 전체 표시 + 절 번호 6열/10열 그리드. 절 클릭 시 해당 구절만 표시
  - **이동경로(breadcrumb):** `성경 › 창세기 › 3장` 형태, 각 단계 클릭으로 뒤로 이동 가능
- **절 개수 조회:** 서버 API(`/api/bible/search`)에 장 전체를 조회해 `verseNumbers`에서 절 수 추출
- **추가 state:** `navTestament`, `navStep`, `navBook`, `navChapter`, `navVerseCount`, `navVerseLoading`
- **추가 함수:** `fetchVerseCount()`, `handleNavSelectBook()`, `handleNavSelectChapter()`, `handleNavSelectVerse()`
- **삭제된 state/변수:** `testamentFilter`, `filteredBooks`, `selectedVerseNum` (미사용 정리)

#### ✅ (N) 검색창 문구 변경
- **파일:** `src/components/BibleReader.tsx`
- 검색 영역 상단에 🔍 `단어로 구절 찾기` 라벨 추가
- placeholder를 `"단어로 구절 찾기 (예: 사랑, 요한복음 1장, 로마서 8:28)..."` 으로 변경

---

## 5. 🚨 데이터 유실 사고 & 복구 (2026-07-24) — 반드시 읽을 것

### 무슨 일이
Firestore의 회원·묵상·공지·QnA가 전부 삭제됨 (회원 4명 → 1명). 발생 시각 `08:17:33Z`.

### 원인
`db.json`을 GitHub에서 제외한 것이 이 앱의 잠재 결함을 건드림:
```
db.json 없는 새 서버 기동 → 회원 0명 "초기 DB" 자동 생성 → saveToFirestore(빈 DB)가 원격을 통째로 덮어씀
```

### 복구 (완료)
로컬 `db.json` 백업으로 전량 복구 (union by id 방식).

| 항목 | 사고 후 | 복구 후 |
|------|--------|--------|
| 회원 | 1명 | **4명** (관리자·조재영·구진경·최희란) |
| 공지 | 1 | **6** |
| QnA | 0 | **5** |
| 감사 | 0 | **2** |
| 묵상 | 0 | **1** |
| 통독진도 | 1명분 | **4명분** |

### 재발 방지 (커밋 `6457d09`) — 2중 안전장치
1. `isSeedLikeDb()` — 실회원 0 + 묵상/감사/QnA 0이면 "초기상태"로 판별
2. 원격을 못 읽었는데 로컬이 초기상태 → 원격 쓰기 건너뜀
3. 원격을 한 번도 못 읽은 서버는 초기 DB 쓰기 차단

### ⚠️ 교훈
- 이 앱은 전체 DB를 Firestore 문서 하나에 통째 덮어쓰는 구조라 근본적으로 위험
- 배포 전에는 항상 `db.json` 백업을 떠둘 것
- 장기적으로 문서 분리(`meditations/{id}`, `userBibleProgress/{userId}`) 권장

---

## 6. 배포 상태

### ✅ Cloud Run 배포 완료
- **라이브 링크:** `https://cho-1006806795339.asia-northeast3.run.app`
- **리전:** `asia-northeast3` (서울)

### 코드 반영 방식 (현재)
- **GitHub 웹 편집:** github.com/beeeber12-cloud/CHO → 해당 파일 → ✏️ 편집 → 전체 내용 교체 → Commit to `main`
- ⚠️ 커밋 시 반드시 **`main` 브랜치**에 직접 커밋할 것
- 커밋 후 Cloud Run 자동 재빌드 (지속적 배포 설정된 경우) 또는 수동 재배포 필요
- 라이브 확인 시 **강력 새로고침(Ctrl+Shift+R)** 필수 (PWA 서비스워커 캐시)

### 배포 설정값 참고 (재배포 시)

| 항목 | 설정값 |
|------|--------|
| 배포 방식 | 저장소에서 지속적 배포 → Cloud Build |
| 저장소 | `beeeber12-cloud/CHO` |
| 분기 | `^main$` |
| 빌드 유형 | `Dockerfile` (위치 `/Dockerfile`) |
| 서비스 이름 | `cho` |
| 리전 | `asia-northeast3` (서울) |
| 인증 | 인증되지 않은 호출 허용 |
| 메모리 | 512 MiB |
| 최대 인스턴스 | 1 (DB 동시쓰기 꼬임 방지) |
| 환경변수 | `GEMINI_API_KEY` = Gemini 키 |

---

## 7. 앞으로 디자인/기능 바꾸는 법

**AI Studio 필요 없음.**

**(방법 1 — 현재 사용 중) GitHub 웹에서 직접 편집**
1. github.com/beeeber12-cloud/CHO 에서 파일 찾기
2. ✏️ 편집 → 내용 교체 → Commit to `main`

**(방법 2 — 추천) AI에게 말하기** → 수정 파일 받기 → GitHub 웹에서 붙여넣기 → Commit

**(방법 3) 로컬 git 사용** (git 설치 필요)
```bash
gh repo clone beeeber12-cloud/CHO
cd CHO
# 파일 수정
git add -A && git commit -m "..." && git push
```

**로컬 실행:**
```bash
cd "C:\Users\PC\Downloads\bible-meditation-share"
npm install      # 최초 1회
npm run dev      # http://localhost:3000
npm run build    # 배포용 빌드 검증
```

---

## 8. 수정된 파일 목록 (2026-07-29 세션)

이번 세션에서 수정된 파일 **7개**:

| 파일 | 수정 내용 |
|------|----------|
| `src/index.css` | 전역 폰트 111% 확대, word-break: keep-all 추가 |
| `src/components/DailyGratitude.tsx` | 검색창 삭제, 실시간 동기화 배지 삭제, 타이틀 확대 |
| `src/components/DailyNotice.tsx` | 타이틀 '오늘의 말씀 공지' 글씨 확대 |
| `src/components/BibleQnA.tsx` | 타이틀 'AI 성경 역사 & 배경 Q&A' 글씨 확대 |
| `src/components/MyMeditations.tsx` | 타이틀 '영성 기록 발자취' 글씨 확대 |
| `src/components/BibleReader.tsx` | 추천구절 삭제, PERSONAL HUB 배지 삭제, 타이틀 확대, **원터치 네비게이터 전면 교체**, 검색창 '단어로 구절 찾기' 변경 |

---

## 9. 구조·보안 메모

- **성경 데이터 위치:** 앱 서버 안의 파일 (`server/data/books`=개역개정, `books_niv`=NIV). 회원·묵상만 Firebase.
- **DB 구조:** 전체를 Firestore 단일 문서(`app_data/main_db`)에 저장. 훗날 1MB 한도 위험 → 문서 분리 권장. 인스턴스 1개 고정으로 당분간 충분.
- **보안(사용자가 "우리끼리 써서 괜찮다"고 확인, 미조치):** 회원 PIN 평문, Firestore 규칙 전면 개방(`allow if true`), 회원가입 시 role 지정 가능.
- **저장소 공개여부:** `CHO` repo Public/Private 미확인. `firebase-applet-config.json` 포함 → **Private 권장**.

---

## 10. 커밋 이력

### 이전 커밋 (2026-07-24)
```
067c80e  인수인계 문서에 데이터 유실 사고·복구·재발방지 기록 추가
6457d09  치명적 데이터 유실 버그 수정: 빈 DB가 Firestore를 덮어쓰지 못하도록 2중 안전장치
42f2b28  모바일 앱 설치(PWA) 정상화: 깨진 아이콘 복구 + 아이콘 세트 + 설치 버튼 구현
bb2b919  작업 기록·인수인계 문서 추가
2fcf4a5  NIV(영어) 성경 66권 추가 + 개역개정/NIV/같이보기 토글
def68cc  Cloud Run 직접 배포 대응: PORT 환경변수 처리 + Dockerfile 추가
0e2e447  개역개정 성경 66권 전권 탑재 + 성경검색 버그 수정 + Logos API 폐기
```

### 이번 세션 수정분 (2026-07-29, GitHub 웹 커밋)
```
(커밋 해시 미확정)  폰트 확대(111%), 줄바꿈 규칙(keep-all) — index.css
(커밋 해시 미확정)  감사탭 검색/동기화표시 제거 — DailyGratitude.tsx
(커밋 해시 미확정)  탭 타이틀 확대 — DailyNotice, BibleQnA, MyMeditations
(커밋 해시 미확정)  성경통독탭: 추천구절/PERSONAL HUB 삭제 + 원터치 네비게이터 전면 교체 + 검색창 '단어로 구절 찾기' — BibleReader.tsx
```

---

## 11. 재개할 때 AI에게 한 줄로 말하는 법

> "이 `작업기록_HANDOFF.md` 읽고 이어서 작업하자.
> 지금 **[디자인 변경 / 기능 추가 / 버그 수정 / DB 백업]** 하고 싶어.
> 라이브 링크는 `https://cho-1006806795339.asia-northeast3.run.app` 이고,
> GitHub은 `https://github.com/beeeber12-cloud/CHO` 야."

---

## 12. ⚠️ 주의사항 체크리스트 (작업 전 필독)

1. **옛 링크(`ais-pre-...run.app`)에서 확인하지 말 것!** → 반드시 `cho-...run.app` 링크 사용
2. **GitHub 커밋 시 `main` 브랜치인지 확인** (다른 브랜치에 넣으면 배포에 반영 안 됨)
3. **PWA 캐시 때문에 변경사항 안 보일 수 있음** → Ctrl+Shift+R 강력 새로고침, 또는 개발자도구 → Application → Service Workers → Unregister + Cache Storage 삭제
4. **배포 전 `db.json` 백업 필수** (데이터 유실 사고 재발 방지)
5. **로컬 git 미설치 상태** — 현재는 GitHub 웹 편집으로 커밋 중. 향후 `gh repo clone beeeber12-cloud/CHO` 로 로컬 작업 전환 가능 (GitHub CLI 설치 필요: https://cli.github.com)
