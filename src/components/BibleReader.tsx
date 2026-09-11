import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Send, Loader, CheckCircle2, Target, ListChecks, ChevronRight, ChevronDown, X, RefreshCw, Settings, Check, Play, CalendarDays, Video, Users } from "lucide-react";
import { SettingModal } from "./SettingsUI";
import ReadingJesusScheduleForm from "./ReadingJesusScheduleForm";
import ModalPortal from "./ModalPortal";
import { motion, AnimatePresence } from "motion/react";
import FormattedBibleText from "./FormattedBibleText";
import DualBibleText from "./DualBibleText";
import CoachMark from "./CoachMark";
import PickedVerseBar from "./PickedVerseBar";
import BibleVersionPicker from "./BibleVersionPicker";
import { BibleVersionKey, loadSelectedVersions, saveSelectedVersions, versionsQueryParam, BIBLE_VERSIONS } from "../lib/bibleVersions";
import { buildVerseReference } from "../lib/verseRef";
import { useSwipe } from "../lib/useSwipe";
import { useKeepAwake } from "../lib/keepAwake";
import { BIBLE_BOOKS, TOTAL_BIBLE_CHAPTERS, BibleBookInfo } from "../data/bibleBooks";
import { UserBibleProgress } from "../types";
import {
  buildWeeklyPlan,
  planSequence,
  rangeLabel,
  readingDaysOf,
  scopeOf,
  startBookOf,
  DAY_LABELS,
  PlanScope
} from "../lib/readingPlan";
import {
  buildRjSchedule,
  rjDateKey,
  rjDayOn,
  rjFinishDate,
  rjNormalizeSettings,
  rjRangeLabel,
  rjRestText,
  rjShortDate,
  rjWeekBlocks,
  rjWeekRows,
  RJBreak,
  RJChapter,
  RJSettings,
  RJ_DAY_LABELS,
  RJ_DEFAULT_READING_DAYS
} from "../lib/readingJesus";
import {
  READING_TABLE_LIST,
  ReadingTableId,
  readingTable,
  tableDayLabel,
  tableIdOf,
  tableProgressLabel
} from "../lib/readingTables";

interface BibleReaderProps {
  currentUser?: { id: string; name: string; role: 'admin' | 'member' };
  onSelectVerseForMeditation?: (verseTitle: string, verseText: string) => void;
  initialQuery?: string;
  /** 같은 구절을 다시 눌러도 열리도록 하는 번호 (오늘 말씀에서 넘어올 때 올라간다) */
  queryNonce?: number;
}

interface BibleResult {
  reference: string;
  text: string;
  textNiv?: string;
  textWm?: string;
  explanation: string;
  meditationGuide: string;
}

export default function BibleReader({ currentUser, onSelectVerseForMeditation, initialQuery = "", queryNonce = 0 }: BibleReaderProps) {
  // 성경을 읽는 동안에는 화면이 꺼지지 않는다 (이 탭을 떠나면 바로 풀린다)
  useKeepAwake();

  // Navigation & Selector states
  const [selectedBook, setSelectedBook] = useState<BibleBookInfo>(BIBLE_BOOKS.find(b => b.name === "요한복음") || BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);

  // Search & Result states — 검색창은 사용자가 직접 입력할 때만 채워진다(평소엔 안내 문구 노출)
  const [query, setQuery] = useState<string>(initialQuery || "");
  const [result, setResult] = useState<BibleResult | null>(null);
  // 번역본은 최대 두 개까지 (하나면 단독, 두 개면 대조)
  const [bibleVersions, setBibleVersions] = useState<BibleVersionKey[]>(() => loadSelectedVersions());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Personal Progress states
  const [userProgress, setUserProgress] = useState<UserBibleProgress | null>(null);
  const [progressLoading, setProgressLoading] = useState<boolean>(false);
  const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);
  /** 진행률 · 통독 설정 팝업 (본문 위 상자를 버튼 하나로 줄이고 내용은 여기로 옮겼다) */
  const [showProgressModal, setShowProgressModal] = useState<boolean>(false);

  // Goal Form state
  const [goalTitle, setGoalTitle] = useState<string>("1년 1독 (매일 3장)");
  const [targetChapters, setTargetChapters] = useState<number>(TOTAL_BIBLE_CHAPTERS);
  const [dailyTarget, setDailyTarget] = useState<number>(3);
  const [savingGoal, setSavingGoal] = useState<boolean>(false);
  /** 통독 범위 — 주간 계획에서 다음에 읽을 장을 뽑는 기준 */
  const [planScope, setPlanScope] = useState<PlanScope>("all");
  /** 읽기로 정한 요일 (0=일 … 6=토) */
  const [readingDays, setReadingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  /** 통독을 시작할 권 */
  const [startBook, setStartBook] = useState<string>("창세기");
  const [showStartBookModal, setShowStartBookModal] = useState<boolean>(false);

  /**
   * 통독 방식 — 내가 정한 범위를 하루 n장씩(normal) 이냐,
   * 교회 리딩지저스 통독표를 그대로 따르느냐(readingJesus).
   */
  const [planMode, setPlanMode] = useState<"normal" | "readingJesus" | "wtbt">("normal");
  /** '어,성경' 을 고른 경우 어느 표인지 */
  const [wtbtLength, setWtbtLength] = useState<120 | 240>(120);
  /** 통독 플랜 고르는 창 */
  const [showPlanPicker, setShowPlanPicker] = useState<boolean>(false);
  const [switchingMode, setSwitchingMode] = useState<boolean>(false);
  /** 공동체가 정한 통독 일정 (오늘의 말씀 설정에서 관리자가 정한다) */
  const [rjCommunity, setRjCommunity] = useState<RJSettings | null>(null);

  /**
   * 내 통독 일정.
   * 공동체 일정을 그대로 따를 수도 있고, 내 사정에 맞춰 따로 정할 수도 있다.
   */
  const [rjFollow, setRjFollow] = useState<"community" | "personal">("community");
  const [rjStartDate, setRjStartDate] = useState<string>("");
  const [rjReadingDays, setRjReadingDays] = useState<number[]>([...RJ_DEFAULT_READING_DAYS]);
  const [rjBreaks, setRjBreaks] = useState<RJBreak[]>([]);
  const [showRjMyPlanModal, setShowRjMyPlanModal] = useState<boolean>(false);
  /** 관리자가 이 일정을 공동체 전체 것으로 정하는 중 */
  const [savingCommunityRj, setSavingCommunityRj] = useState<boolean>(false);
  const [rjAdminMessage, setRjAdminMessage] = useState<string>("");
  const [savingRjPlan, setSavingRjPlan] = useState<boolean>(false);
  const [showRjScheduleModal, setShowRjScheduleModal] = useState<boolean>(false);
  /** 전체 스케줄을 열면 이번 주가 바로 보이도록 */
  const rjCurrentWeekRef = useRef<HTMLDivElement>(null);

  // 원터치 성경 네비게이터 (구약/신약 탭 → 팝업에서 권 → 장 → 절)
  const [showNavModal, setShowNavModal] = useState<boolean>(false);
  const [navTestament, setNavTestament] = useState<'OT' | 'NT'>('OT');
  const [navStep, setNavStep] = useState<'book' | 'chapter' | 'verse'>('book');
  const [navBook, setNavBook] = useState<BibleBookInfo | null>(null);
  const [navChapter, setNavChapter] = useState<number | null>(null);
  const [navVerseCount, setNavVerseCount] = useState<number | null>(null);
  const [navVerseLoading, setNavVerseLoading] = useState<boolean>(false);

  // 본문 영역 스크롤 / 선택한 절 강조
  const readerRef = useRef<HTMLDivElement>(null);
  const verseBoxRef = useRef<HTMLDivElement>(null);
  const [highlightVerse, setHighlightVerse] = useState<number | null>(null);
  const [pendingScroll, setPendingScroll] = useState<boolean>(false);
  // 장이 바뀔 때 본문이 어느 쪽에서 미끄러져 들어올지 (1 = 오른쪽에서, -1 = 왼쪽에서, 0 = 그냥 나타남)
  const [slideDir, setSlideDir] = useState<1 | -1 | 0>(0);

  // 사용자가 눌러서 고른 구절 (번호 -> 본문). 묵상 쓰기로 넘길 때 이것만 담아 보낸다.
  const [pickedVerses, setPickedVerses] = useState<Map<string, string>>(new Map());

  const togglePickedVerse = (num: string, body: string) => {
    setPickedVerses((prev) => {
      const next = new Map(prev);
      if (next.has(num)) next.delete(num);
      else next.set(num, body);
      return next;
    });

    // 눌러서 체크한 구절은 '말씀 체크리스트'에 남도록 서버에도 저장한다.
    if (currentUser?.id) {
      fetch("/api/saved-verses/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          book: selectedBook.name,
          chapter: selectedChapter,
          verseNum: Number(num),
          text: body
        })
      }).catch((e) => console.error("말씀 체크 저장 실패:", e));
    }
  };

  /** 고른 구절을 "3 본문..." 형태로, 번호 순서대로 이어붙인다. */
  const buildPickedText = (): string =>
    [...pickedVerses.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([n, t]) => `${n} ${t}`)
      .join("\n");

  // Checklist Modal Filter States
  const [checklistTab, setChecklistTab] = useState<'OT' | 'NT' | 'IN_PROGRESS'>('OT');

  useEffect(() => {
    if (currentUser?.id) {
      fetchUserProgress(currentUser.id);
    }
  }, [currentUser?.id]);

  // 통독 일정은 공동체 전체가 같아야 한다 — 오늘의 말씀 설정에 정해 둔 것을 그대로 쓴다
  useEffect(() => {
    fetch("/api/bible-plan")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setRjCommunity(
          rjNormalizeSettings({
            startDate: d.rjStartDate || "",
            readingDays: d.rjReadingDays,
            breaks: d.rjBreaks
          })
        );
      })
      .catch(() => { /* 못 받아오면 통독표가 아직 안 짜인 것으로 본다 */ });
  }, []);

  useEffect(() => {
    // Perform initial load if query or default is set
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearchQuery(initialQuery);
      setPendingScroll(true); // 넘어오자마자 본문이 보이도록 화면을 내려준다
    } else if (!userProgress?.lastReadBook) {
      handleSearchQuery("요한복음 1장");
    }
  }, [initialQuery, queryNonce]);

  // 장이 바뀌면 본문을 맨 위부터 보여준다.
  // (안 그러면 옆으로 밀어 다음 장으로 넘어갔을 때 읽던 위치 그대로라 중간부터 보인다)
  useEffect(() => {
    if (verseBoxRef.current) verseBoxRef.current.scrollTop = 0;
  }, [result?.reference]);

  // 본문이 로드되면 본문 영역으로 화면을 내리고, 선택한 절이 있으면 그 절 위치까지 맞춰준다.
  useEffect(() => {
    if (!pendingScroll || loading || !result) return;

    const timer = setTimeout(() => {
      readerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

      if (highlightVerse != null) {
        const box = verseBoxRef.current;
        const target = box?.querySelector<HTMLElement>(`[data-verse="${highlightVerse}"]`);
        if (box && target) {
          box.scrollTop += target.getBoundingClientRect().top - box.getBoundingClientRect().top - 16;
        }
      }
      setPendingScroll(false);
    }, 120);

    return () => clearTimeout(timer);
  }, [pendingScroll, loading, result, highlightVerse]);

  const fetchUserProgress = async (userId: string) => {
    setProgressLoading(true);
    try {
      const res = await fetch(`/api/bible-progress/${userId}`);
      if (res.ok) {
        const data: UserBibleProgress = await res.json();
        setUserProgress(data);
        setGoalTitle(data.goalTitle);
        setTargetChapters(data.targetChapters);
        setDailyTarget(data.dailyTarget);
        setPlanScope(scopeOf(data));
        setReadingDays(readingDaysOf(data));
        setStartBook(startBookOf(data));
        setPlanMode(
          data.planMode === "readingJesus" ? "readingJesus" : data.planMode === "wtbt" ? "wtbt" : "normal"
        );
        setWtbtLength(data.wtbtLength === 240 ? 240 : 120);
        setRjFollow(data.rjFollow === "personal" ? "personal" : "community");
        setRjStartDate(data.rjStartDate || "");
        setRjReadingDays(
          Array.isArray(data.rjReadingDays) && data.rjReadingDays.length > 0
            ? data.rjReadingDays
            : [...RJ_DEFAULT_READING_DAYS]
        );
        setRjBreaks(Array.isArray(data.rjBreaks) ? data.rjBreaks : []);

        if (!initialQuery && data.lastReadBook && data.lastReadChapter) {
          const matchedBook = BIBLE_BOOKS.find(b => b.name === data.lastReadBook);
          if (matchedBook) {
            setSelectedBook(matchedBook);
            setSelectedChapter(data.lastReadChapter);
            handleSearchQuery(`${data.lastReadBook} ${data.lastReadChapter}장`);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load user Bible progress:", err);
    } finally {
      setProgressLoading(false);
    }
  };

  /** 고른 번역본만 요청한다 — 안 보는 번역본을 받지 않아 응답이 가볍다 */
  const bibleSearchUrl = (q: string, versions: BibleVersionKey[]) => {
    const extra = versionsQueryParam(versions);
    return `/api/bible/search?query=${encodeURIComponent(q)}&versions=${encodeURIComponent(extra)}`;
  };

  const handleVersionsChange = (next: BibleVersionKey[]) => {
    setBibleVersions(next);
    saveSelectedVersions(next);
    // 새로 고른 번역본이 지금 받아둔 본문에 없으면 그때만 다시 받아온다
    const need = next.some(
      (k) => (k === "niv" && !result?.textNiv) || (k === "wm" && !result?.textWm)
    );
    if (need && result?.reference) {
      fetch(bibleSearchUrl(result.reference, next))
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d && d.text) setResult((prev) => (prev ? { ...prev, ...d } : d));
        })
        .catch((e) => console.error("번역본 불러오기 실패:", e));
    }
  };

  /**
   * 불러온 본문에 맞춰 현재 위치(권·장)를 맞춘다.
   * 이걸 해줘야 '이전 장 / 다음 장'이 지금 보고 있는 본문 기준으로 움직인다.
   * (전에는 검색으로 본문을 열면 위치가 북마크에 머물러 엉뚱한 장으로 넘어갔다)
   */
  const syncSelectionFromReference = (reference?: string) => {
    if (!reference) return;
    // '요한1서'처럼 다른 책 이름을 포함할 수 있으니 가장 긴 이름부터 맞춰본다
    const book = [...BIBLE_BOOKS]
      .sort((a, b) => b.name.length - a.name.length)
      .find((b) => reference.startsWith(b.name));
    if (!book) return;
    const m = reference.slice(book.name.length).match(/\d+/);
    if (!m) return;
    const chapter = Math.min(Math.max(1, Number(m[0])), book.chapters);
    setSelectedBook(book);
    setSelectedChapter(chapter);
  };

  /**
   * 새 본문을 불러온다.
   *
   * **보던 본문은 절대 지우지 않는다.** 예전에는 '이어서 읽기'나 장 선택을 누르는 순간
   * 화면의 성경이 통째로 사라졌다가 새로 나타나서, 껐다 켜진 것처럼 보였다.
   * 새 본문이 도착하면 그때 갈아 끼우고, 실패하면 보던 본문을 그대로 둔 채 알림만 띄운다.
   */
  const handleSearchQuery = async (searchStr: string) => {
    if (!searchStr.trim()) return;

    setLoading(true);
    setError("");
    setPickedVerses(new Map()); // 다른 본문으로 넘어가면 고른 구절도 초기화

    try {
      const res = await fetch(bibleSearchUrl(searchStr.trim(), bibleVersions));
      const data = await res.json();

      if (res.ok) {
        setResult(data);
        syncSelectionFromReference(data.reference);
      } else {
        setError(data.error || "성경 본문을 불러오는데 실패했습니다.");
      }
    } catch (err) {
      setError("서버와의 연결이 원활하지 않습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 특정 장의 절 개수를 서버에서 조회 (verse 그리드 생성용)
  const fetchVerseCount = async (book: BibleBookInfo, chapter: number) => {
    setNavVerseLoading(true);
    setNavVerseCount(null);
    try {
      const res = await fetch(bibleSearchUrl(`${book.name} ${chapter}장`, ["krv"]));
      const data = await res.json();
      if (res.ok) {
        if (Array.isArray(data.verseNumbers) && data.verseNumbers.length > 0) {
          setNavVerseCount(Math.max(...data.verseNumbers));
        } else if (typeof data.text === "string" && data.text.trim()) {
          // verseNumbers가 없을 때 본문에서 절 번호 추출
          const nums = data.text.split("\n")
            .map((l: string) => {
              const m = l.trim().match(/^(\d{1,3})\s/);
              return m ? parseInt(m[1], 10) : 0;
            })
            .filter((n: number) => n > 0);
          setNavVerseCount(nums.length > 0 ? Math.max(...nums) : null);
        }
      }
    } catch (err) {
      console.error("절 개수 조회 실패:", err);
    } finally {
      setNavVerseLoading(false);
    }
  };

  // 구약/신약 탭을 누르면 권·장·절 선택 팝업을 연다
  const openNavModal = (testament: 'OT' | 'NT') => {
    setNavTestament(testament);
    setNavStep('book');
    setNavBook(null);
    setNavChapter(null);
    setNavVerseCount(null);
    setShowNavModal(true);
  };

  // 네비게이터: 권 선택 → 장 선택 단계로
  const handleNavSelectBook = (book: BibleBookInfo) => {
    setNavBook(book);
    setNavChapter(null);
    setNavStep('chapter');
  };

  // 네비게이터: 장 선택 → 절 선택 단계로 (동시에 장 전체 본문을 미리 불러둠)
  const handleNavSelectChapter = (chapter: number) => {
    if (!navBook) return;
    setNavChapter(chapter);
    setNavStep('verse');
    fetchVerseCount(navBook, chapter);
    setHighlightVerse(null);
    handleSelectBookChapter(navBook, chapter);
  };

  // 네비게이터: 절 선택 → 팝업을 닫고, 장 전체 본문에서 그 절 위치로 이동
  const handleNavSelectVerse = (verse: number) => {
    if (!navBook || !navChapter) return;
    setHighlightVerse(verse);
    setShowNavModal(false);
    setPendingScroll(true);
    // 장 전체가 이미 로드된 경우 재조회 없이 스크롤만, 아니면 장 전체를 불러온다
    if (selectedBook.name !== navBook.name || selectedChapter !== navChapter) {
      handleSelectBookChapter(navBook, navChapter);
    }
  };

  const handleSelectBookChapter = (
    book: BibleBookInfo,
    chapter: number,
    verseNum: string = ""
  ) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    const searchTarget = verseNum ? `${book.name} ${chapter}:${verseNum}` : `${book.name} ${chapter}장`;
    handleSearchQuery(searchTarget);

    // Save as last read location for current user
    if (currentUser?.id) {
      updateLastReadBookmark(book.name, chapter);
    }
  };

  const updateLastReadBookmark = async (bookName: string, ch: number) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch("/api/bible-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          lastReadBook: bookName,
          lastReadChapter: ch
        })
      });
      if (res.ok) {
        const updated: UserBibleProgress = await res.json();
        setUserProgress(updated);
      }
    } catch (err) {
      console.error("Failed to update last read bookmark:", err);
    }
  };

  const handleToggleChapterComplete = async (chapterKey: string) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch("/api/bible-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          toggleChapter: chapterKey
        })
      });

      if (res.ok) {
        const updated: UserBibleProgress = await res.json();
        setUserProgress(updated);
      }
    } catch (err) {
      console.error("Failed to toggle chapter completion:", err);
    }
  };

  /**
   * 통독 플랜 갈아 끼우기 — 일반통독 · 리딩지저스 · 어,성경(120·240).
   *
   * 목표 이름·장 수는 **건드리지 않는다**. 표를 따르는 동안에만 화면에서
   * 그 표 이름으로 보여주므로, 일반통독으로 되돌리면 원래 목표가 그대로 살아 있다.
   * **읽은 기록(completedChapters)도 그대로다** — 표만 바뀐다.
   */
  const switchPlanMode = async (table: ReadingTableId | null) => {
    if (!currentUser?.id) return;
    const next = table === null ? "normal" : table === "readingJesus" ? "readingJesus" : "wtbt";
    const nextLength: 120 | 240 = table === "wtbt240" ? 240 : 120;
    if (next === planMode && (next !== "wtbt" || nextLength === wtbtLength)) return;

    // 눌렀을 때 바로 바뀌게 (저장은 뒤따라간다)
    setPlanMode(next);
    setWtbtLength(nextLength);
    setSwitchingMode(true);
    try {
      const res = await fetch("/api/bible-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, planMode: next, wtbtLength: nextLength })
      });
      if (res.ok) {
        const updated: UserBibleProgress = await res.json();
        setUserProgress(updated);
      }
    } catch (err) {
      console.error("통독 방식 저장 실패:", err);
    } finally {
      setSwitchingMode(false);
    }
  };

  /** 내 통독 일정을 저장한다 (공동체 일정을 따르기로 한 경우에도 그 선택을 남긴다) */
  const saveRjPlan = async (follow: "community" | "personal") => {
    if (!currentUser?.id) return;
    setRjFollow(follow);
    setSavingRjPlan(true);
    try {
      const res = await fetch("/api/bible-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          rjFollow: follow,
          rjStartDate,
          rjReadingDays,
          rjBreaks: rjBreaks.filter((b) => b.from && b.to)
        })
      });
      if (res.ok) {
        const updated: UserBibleProgress = await res.json();
        setUserProgress(updated);
        setShowRjMyPlanModal(false);
      }
    } catch (err) {
      console.error("통독 일정 저장 실패:", err);
    } finally {
      setSavingRjPlan(false);
    }
  };

  /** 지금 공동체 일정을 고치기 화면에 올려 둔다 (관리자가 이어서 고칠 수 있게) */
  const loadCommunityIntoForm = () => {
    if (!rjCommunity) return;
    setRjStartDate(rjCommunity.startDate);
    setRjReadingDays([...rjCommunity.readingDays]);
    setRjBreaks(rjCommunity.breaks.map((b) => ({ ...b })));
  };

  /**
   * 관리자가 이 일정을 **공동체 전체 일정**으로 정한다.
   *
   * 이 하나로 두 가지가 함께 정해진다:
   *  ① 공동체 일정을 따르는 모든 지체의 통독표
   *  ② <오늘의 말씀> 자동 공지 — 그날 읽을 본문 전체가 매일 아침 올라간다
   */
  const saveCommunityRjPlan = async () => {
    if (currentUser?.role !== "admin") return;
    if (!rjStartDate) {
      setRjAdminMessage("시작날을 먼저 정해 주세요.");
      return;
    }
    setSavingCommunityRj(true);
    setRjAdminMessage("");
    try {
      const res = await fetch("/api/bible-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "readingJesus",
          active: true,
          rjStartDate,
          rjReadingDays,
          rjBreaks: rjBreaks.filter((b) => b.from && b.to)
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "저장하지 못했습니다.");
      }
      const plan = await res.json();
      setRjCommunity(
        rjNormalizeSettings({
          startDate: plan.rjStartDate || "",
          readingDays: plan.rjReadingDays,
          breaks: plan.rjBreaks
        })
      );

      // 정한 사람도 공동체 일정을 따르는 것으로 맞춰 둔다
      if (currentUser?.id) {
        const mine = await fetch("/api/bible-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: currentUser.id, rjFollow: "community" })
        });
        if (mine.ok) setUserProgress(await mine.json());
      }
      setRjFollow("community");
      setRjAdminMessage("공동체 전체 일정으로 정했습니다. 오늘의 말씀도 이 통독표대로 올라갑니다.");
    } catch (e: any) {
      setRjAdminMessage(e?.message || "저장하지 못했습니다.");
    } finally {
      setSavingCommunityRj(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.id) return;

    setSavingGoal(true);
    try {
      const res = await fetch("/api/bible-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          goalTitle: goalTitle.trim(),
          targetChapters: Number(targetChapters),
          dailyTarget: Number(dailyTarget),
          planScope,
          readingDays,
          planStartBook: startBook
        })
      });

      if (res.ok) {
        const updated: UserBibleProgress = await res.json();
        setUserProgress(updated);
        setShowGoalModal(false);
      }
    } catch (err) {
      console.error("Failed to save goal:", err);
    } finally {
      setSavingGoal(false);
    }
  };

  // 고른 번역본의 본문을 순서대로 담는다 (없는 번역본은 빼고 안내한다)
  const textOf = (k: BibleVersionKey) =>
    k === "krv" ? result?.text : k === "wm" ? result?.textWm : result?.textNiv;

  const versionPanes = bibleVersions
    .filter((k) => !!textOf(k)?.trim())
    .map((k) => ({ key: k, text: textOf(k) as string }));

  const missingVersions = bibleVersions
    .filter((k) => !textOf(k)?.trim())
    .map((k) => BIBLE_VERSIONS.find((v) => v.key === k)?.label || k);

  // 이전/다음 장 — 책의 처음·끝에서는 앞뒤 권으로 이어진다
  const bookIndex = BIBLE_BOOKS.findIndex((b) => b.id === selectedBook.id);
  const prevTarget =
    selectedChapter > 1
      ? { book: selectedBook, chapter: selectedChapter - 1, isNewBook: false }
      : bookIndex > 0
      ? { book: BIBLE_BOOKS[bookIndex - 1], chapter: BIBLE_BOOKS[bookIndex - 1].chapters, isNewBook: true }
      : null;
  const nextTarget =
    selectedChapter < selectedBook.chapters
      ? { book: selectedBook, chapter: selectedChapter + 1, isNewBook: false }
      : bookIndex >= 0 && bookIndex < BIBLE_BOOKS.length - 1
      ? { book: BIBLE_BOOKS[bookIndex + 1], chapter: 1, isNewBook: true }
      : null;

  // 옆으로 밀어서 장 넘기기 — 버튼을 누르지 않아도 된다.
  // dir: 1 = 다음 장(새 본문이 오른쪽에서 들어옴), -1 = 이전 장
  const goToChapter = (
    target: { book: BibleBookInfo; chapter: number } | null,
    dir: 1 | -1 | 0 = 0
  ) => {
    if (!target) return;
    setHighlightVerse(null);
    setPickedVerses(new Map());
    setSlideDir(dir);
    // 장을 넘기면 '이어서 읽기'를 누른 것처럼 본문을 화면에 맞춰 주고 1절부터 보여준다.
    // (본문 상자의 스크롤은 아래 result.reference 효과가 맨 위로 되돌린다)
    setPendingScroll(true);
    // 새 본문이 도착할 때까지 지금 본문을 그대로 둔다 (화면이 깜빡이지 않게)
    handleSelectBookChapter(target.book, target.chapter);
  };

  /**
   * 이 화면 어디를 누르든 '이어서 읽기'를 누른 것처럼 화면을 성경 본문에 딱 맞춘다.
   *
   * 두 가지는 건드리지 않는다.
   *  ① 버튼·입력칸을 누른 경우 — 그 버튼이 할 일을 방해하지 않는다
   *  ② 팝업(.fixed) 안을 누른 경우 — 뒤쪽 화면이 움직이면 안 된다
   * 이미 맞아 있으면 아무것도 하지 않는다 (절을 고를 때마다 화면이 움직이면 성가시다).
   */
  const alignReader = (e?: React.MouseEvent) => {
    const hit = e?.target as HTMLElement | undefined;
    if (hit?.closest?.("button, a, input, select, textarea, label, .fixed")) return;
    const el = readerRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top >= -6 && top <= 28) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** 고른 구절(없으면 본문 앞부분)을 묵상 쓰기로 넘긴다 — 아래 단추와 막대가 함께 쓴다 */
  const writeWithPicked = () => {
    if (!result || !onSelectVerseForMeditation) return;
    const picked = buildPickedText();
    // 장까지 함께 남긴다 ("마가복음 1장 3,5절")
    const refs = buildVerseReference(result.reference, pickedVerses.keys());
    // 지금 보고 있는 번역본을 그대로 넘긴다
    onSelectVerseForMeditation(refs, picked || (versionPanes[0]?.text || result.text).slice(0, 200));
  };

  const { swipeHandlers, justSwiped, dragRef } = useSwipe({
    onSwipeLeft: () => goToChapter(nextTarget, 1),
    onSwipeRight: () => goToChapter(prevTarget, -1),
    canSwipeLeft: !!nextTarget,
    canSwipeRight: !!prevTarget
  });

  /** 민 동작이었다면 절이 선택되지 않게 한 번 걸러낸다 */
  const handleVerseTap = (num: string, body: string) => {
    if (justSwiped()) return;
    togglePickedVerse(num, body);
  };

  /**
   * 이번 주 계획.
   * 하루 밀리면 다음 칸이 저절로 당겨진다 (자세한 규칙은 lib/readingPlan.ts).
   */
  const weeklyPlan = React.useMemo(() => buildWeeklyPlan(userProgress), [userProgress]);

  /** 지금 따르고 있는 통독표 (일반통독이면 null) */
  const myTable = React.useMemo(() => {
    const id = tableIdOf(planMode === "normal" ? null : planMode, wtbtLength);
    return id ? readingTable(id) : null;
  }, [planMode, wtbtLength]);
  /** 통독표를 따르는 중인가 */
  const isRJ = !!myTable;

  /** 통독 화면의 상자 색 — 플랜과 상관없이 한 색으로 둔다 */
  const planBox = "bg-[#E8F0E9]";
  const planBoxHover = "hover:bg-[#E3ECE4]";

  /**
   * 화면 제목 — 따르는 플랜을 제목이 그대로 말해 준다.
   * (색으로 가르는 것보다 글자가 분명하다)
   */
  const readerTitle = !myTable
    ? "성경 통독"
    : myTable.id === "readingJesus"
    ? "리딩 성경 통독"
    : "어성경 통독";

  /** 읽은 장 모음 — 리딩지저스 표에서 완료 표시를 붙이는 데 쓴다 */
  const completedSet = React.useMemo(
    () => new Set(userProgress?.completedChapters || []),
    [userProgress?.completedChapters]
  );

  /** 내가 정한 일정 (다 갖춰지지 않았으면 null) */
  const rjPersonal = React.useMemo(
    () => rjNormalizeSettings({ startDate: rjStartDate, readingDays: rjReadingDays, breaks: rjBreaks }),
    [rjStartDate, rjReadingDays, rjBreaks]
  );

  /**
   * 실제로 쓰는 일정.
   * 고른 쪽이 아직 비어 있으면 다른 쪽으로 메운다 — 화면이 빈 채로 남지 않게.
   */
  const rjSettings = rjFollow === "personal" ? rjPersonal || rjCommunity : rjCommunity || rjPersonal;
  /** 화면에 "지금 무엇을 따르는 중"이라고 적을지 */
  const rjFollowingCommunity = rjSettings !== null && rjSettings === rjCommunity;

  /** 통독표를 달력에 얹은 것 (270일치) */
  const rjSchedule = React.useMemo(
    () => buildRjSchedule(rjSettings, myTable?.entries),
    [rjSettings, myTable]
  );
  /** 이번 주 월~일 */
  const rjRows = React.useMemo(
    () => rjWeekRows(rjSchedule, rjSettings, new Date(), completedSet),
    [rjSchedule, rjSettings, completedSet]
  );
  const rjToday = React.useMemo(
    () => rjDayOn(rjSchedule, rjDateKey(new Date())),
    [rjSchedule]
  );
  const rjBlocks = React.useMemo(() => rjWeekBlocks(rjSchedule), [rjSchedule]);
  const rjFinish = React.useMemo(() => rjFinishDate(rjSchedule), [rjSchedule]);
  /** 이번 주가 몇째 주인지 (전체 스케줄에서 표시하고 그리로 스크롤한다) */
  const rjCurrentWeek = React.useMemo(() => {
    const todayKey = rjDateKey(new Date());
    const soon = rjSchedule.find((d) => d.dateKey >= todayKey);
    return soon?.entry.week ?? 0;
  }, [rjSchedule]);

  // 전체 스케줄을 열면 이번 주가 바로 눈에 들어오게 내려 준다
  useEffect(() => {
    if (!showRjScheduleModal) return;
    const t = setTimeout(() => rjCurrentWeekRef.current?.scrollIntoView({ block: "start" }), 60);
    return () => clearTimeout(t);
  }, [showRjScheduleModal, rjCurrentWeek]);

  const bookInfoOf = (name: string) => BIBLE_BOOKS.find((b) => b.name === name) || null;

  /** 통독표의 한 줄을 눌러 그날 첫 장으로 넘어간다 */
  const startRjRow = (chapters: RJChapter[]) => {
    const first = chapters[0];
    const book = first && bookInfoOf(first.book);
    if (!book) return;
    setShowRjScheduleModal(false);
    setShowProgressModal(false);
    setHighlightVerse(null);
    setPendingScroll(true);
    handleSelectBookChapter(book, first.chapter);
  };

  /** 계획의 한 줄을 눌러 그 본문으로 바로 넘어간다 */
  const startPlanRow = (chapters: { book: BibleBookInfo; chapter: number }[]) => {
    const first = chapters[0];
    if (!first) return;
    setShowProgressModal(false);
    setHighlightVerse(null);
    setPendingScroll(true);
    handleSelectBookChapter(first.book, first.chapter);
  };

  // Calculate current chapter key
  const currentChapterKey = `${selectedBook.name} ${selectedChapter}장`;
  const isCurrentChapterCompleted = userProgress?.completedChapters?.includes(currentChapterKey) || false;

  // Calculate Progress Stats
  const completedCount = userProgress?.completedChapters?.length || 0;
  // 리딩지저스 모드에서는 통독표가 정한 분량이 곧 목표다 (목표 장 수 설정이 필요 없다)
  const targetCount = myTable
    ? myTable.totalChapters
    : userProgress?.targetChapters || TOTAL_BIBLE_CHAPTERS;
  const goalTitleShown = myTable ? myTable.goalTitle : userProgress?.goalTitle || "1년 1독";
  const progressPercent = Math.min(100, Math.round((completedCount / targetCount) * 100));

  return (
    // 화면 어디를 눌러도 성경이 화면에 맞춰진다 (버튼·팝업은 제외 — alignReader 참고)
    <div className="space-y-4 sm:space-y-6" onClick={alignReader}>
      {/* Page title — 오른쪽 단추로 통독 플랜을 갈아 끼운다 */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-[#0C3B2E] break-keep">{readerTitle}</h2>
          <p className="text-xs sm:text-sm text-[#6F8377] mt-0.5 truncate">
            {myTable
              ? `${myTable.goalTitle} · ${
                  rjToday
                    ? tableDayLabel(myTable, rjToday.index, rjToday.entry)
                    : rjSchedule.length === 0
                    ? "일정이 아직 정해지지 않았습니다"
                    : "오늘은 쉬는 날"
                }`
              : `${goalTitleShown} · 하루 ${userProgress?.dailyTarget || 3}장`}
          </p>
        </div>

        {/* 통독 플랜 — 누르면 골라서 갈아 끼운다 (읽은 기록은 그대로다) */}
        {currentUser && (
          <button
            type="button"
            disabled={switchingMode}
            onClick={() => setShowPlanPicker(true)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-3xl text-2xs sm:text-xs font-bold transition cursor-pointer disabled:opacity-60 text-[#2F5D4A] ${planBox} ${planBoxHover}`}
          >
            <span className="whitespace-nowrap">{myTable ? `${myTable.short} 플랜` : "일반 통독 플랜"}</span>
            <ChevronDown size={13} className="opacity-70" />
          </button>
        )}
      </div>

      {/* 진행률 + 마지막 읽은 곳 + 구약/신약을 한 상자로 묶었다 (시안의 .nav-card) */}
      <div className={`${planBox} rounded-3xl sm:rounded-[32px] p-4 sm:p-5 space-y-4 transition-colors`}>
        {/* 진행률 · 통독 설정 — 한 줄 버튼으로 줄이고, 자세한 내용은 팝업에서 본다.
            (예전에는 진행률·목표·체크리스트가 여기 다 펼쳐져 있어 본문이 한참 아래 있었다) */}
        {currentUser && (
          <button
            type="button"
            onClick={() => setShowProgressModal(true)}
            // 상자 안 어디를 눌러도 열린다 (글씨·막대·빈 자리 모두 이 단추 안이다)
            className="w-full flex items-center gap-3 bg-white rounded-2xl p-3.5 text-left cursor-pointer transition hover:bg-[#F4F4F4]"
          >
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-[#14261E]">
                {myTable ? `${myTable.short} 통독 진행률` : "통독 진행률"} {progressPercent}%
              </span>
              <span className="block text-2xs text-[#6F8377] mt-0.5 truncate">
                {/* 리딩지저스는 하루 분량을 통독표가 정하므로 '하루 n장'을 적지 않는다 */}
                {isRJ
                  ? `${completedCount}장 / ${targetCount}장 · 통독표대로`
                  : `${completedCount}장 / ${targetCount}장 · 하루 ${userProgress?.dailyTarget || 3}장`}
              </span>
              <span className="block w-full bg-[#E4E4E4] rounded-full h-1 overflow-hidden mt-1.5">
                <span
                  className="block bg-gradient-to-r from-[#6D9773] to-[#FFBA00] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(2, progressPercent)}%` }}
                />
              </span>
            </span>
            {/* 꺾쇠 대신 설정 아이콘 — 눌러서 통독 설정으로 들어간다는 뜻이 더 분명하다 */}
            <span className="w-9 h-9 rounded-full bg-[#F0F0F0] text-[#4A6B57] flex items-center justify-center shrink-0">
              <Settings size={17} />
            </span>
          </button>
        )}

        {/* 마지막에 읽던 곳 — 카드 배경과 이어지도록 자체 배경 없이 구분선만 */}
        {currentUser && (
          <button
            type="button"
            onClick={() => {
              const book = BIBLE_BOOKS.find(b => b.name === (userProgress?.lastReadBook || "창세기")) || BIBLE_BOOKS[0];
              setHighlightVerse(null);
              setPendingScroll(true);
              handleSelectBookChapter(book, userProgress?.lastReadChapter || 1);
            }}
            className="w-full flex items-center justify-between gap-2 px-1.5 transition cursor-pointer text-left"
          >
            <span className="min-w-0">
              <span className="block text-2xs font-bold text-[#6F8377]">마지막 읽은 곳</span>
              <strong className="block text-sm font-bold text-[#0C3B2E] truncate mt-0.5">
                {userProgress?.lastReadBook || "창세기"} {userProgress?.lastReadChapter || 1}장
              </strong>
            </span>
            <span className="shrink-0 flex items-center gap-0.5 text-xs font-bold text-[#195C50]">
              이어서 읽기
              <ChevronRight size={14} />
            </span>
          </button>
        )}

        {/* 구약 / 신약 — 누르면 권·장·절 선택 팝업이 열린다 */}
        <div
          className={`grid grid-cols-2 gap-2.5 ${currentUser ? "pt-4 border-t border-[#EDEDED]" : ""}`}
        >
          <button
            type="button"
            onClick={() => openNavModal('OT')}
            className="grad-teal flex items-center justify-center gap-2 px-3 py-3 rounded-3xl text-white font-bold text-sm sm:text-base transition cursor-pointer hover:brightness-110"
          >
            <span>구약 (39권)</span>
          </button>
          <button
            type="button"
            onClick={() => openNavModal('NT')}
            className="grad-forest flex items-center justify-center gap-2 px-3 py-3 rounded-3xl text-white font-bold text-sm sm:text-base transition cursor-pointer hover:brightness-110"
          >
            <span>신약 (27권)</span>
          </button>
        </div>
      </div>

      {/* 3. Main Bible Chapter Reader Display */}
      <div ref={readerRef} className="scroll-mt-4" />
      <AnimatePresence mode="wait">
        {/* 처음 불러올 때만 보여준다. 장을 넘길 때는 보던 본문을 그대로 두어야 깜빡이지 않는다 */}
        {loading && !result && (
          <div className="bg-white rounded-[32px] p-4 sm:p-6 py-12 text-center shadow-sm">
            <Loader className="animate-spin text-[#4A6B57] mx-auto mb-3" size={32} />
            <p className="text-sm font-bold text-[#0C3B2E]">성경 본문을 불러오고 있습니다...</p>
            <p className="text-xs text-[#6F8377] mt-1">1절부터 그 장의 마지막 절까지 전체 구절을 준비 중입니다.</p>
          </div>
        )}

        {!loading && error && (
          <div className="bg-[#FDF3F3] rounded-3xl sm:rounded-[32px] p-4 sm:p-6 text-center text-[#7A1913] text-xs sm:text-sm font-bold space-y-3">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => handleSearchQuery(query || `${selectedBook.name} ${selectedChapter}장`)}
              className="px-4 py-2 bg-[#0C3B2E] text-white rounded-3xl text-xs font-bold hover:bg-[#4A6B57] transition cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw size={14} />
              <span>성경 본문 다시 불러오기</span>
            </button>
          </div>
        )}

        {/* 불러오는 중에도 카드를 그대로 둔다. 카드가 사라졌다 나타나면 화면이 껐다 켜진 것처럼 보인다 */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Chapter Content — 시안의 .scripture-block: 제목은 상자 밖, 본문은 위 nav-card와
                떨어뜨려 "여기부터는 본문"임을 구별한다. 별도 흰 카드로 감싸지 않는다. */}
            <div className="space-y-2.5 sm:space-y-4 mt-3.5">
              <h3 className="text-base sm:text-lg font-bold text-[#0C3B2E] flex items-center gap-2">
                {result.reference}
                {/* 새 장을 받아오는 동안에도 보던 본문은 그대로 두고, 여기서만 알려준다 */}
                {loading && (
                  <span className="flex items-center gap-1 text-2xs font-bold text-[#6F8377]">
                    <Loader className="animate-spin" size={12} />
                    불러오는 중
                  </span>
                )}
              </h3>

              {/* 번역본 고르기 — 최대 두 개까지 대조 */}
              <BibleVersionPicker selected={bibleVersions} onChange={handleVersionsChange} />

              {/* 말씀 본문 — 박스 없이 흰 배경에 그대로 놓인다 */}
              <div
                ref={verseBoxRef}
                // 이 상자는 스스로 좌우 밀기를 쓴다(장 넘기기).
                // 바깥의 탭 넘김이 같이 반응하지 않도록 표시해 둔다.
                data-no-tab-swipe
                {...swipeHandlers}
                // pan-y 로 두면 세로 훑기는 브라우저가 그대로 처리하고,
                // 가로로 미는 동작만 우리가 받아 장을 넘길 수 있다
                style={{ touchAction: "pan-y" }}
                className="scripture-font py-2 max-h-[calc(100vh-14rem)] min-h-[560px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200"
              >
                {/* 바깥층: 손가락을 따라 밀린다 (놓으면 제자리로 튕겨 돌아온다) */}
                <div ref={dragRef} style={{ willChange: "transform" }}>
                  {/* 안층: 장이 바뀌면 밀어낸 쪽 반대편에서 미끄러져 들어온다.
                      key 가 바뀌면 새로 그려지므로 사라졌다 나타나는 빈 시간이 없다 */}
                  <motion.div
                    key={result.reference}
                    initial={{ opacity: 0, x: slideDir * 56 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.6 }}
                  >
                    <DualBibleText
                      panes={versionPanes}
                      highlightVerse={highlightVerse}
                      selectedVerses={new Set(pickedVerses.keys())}
                      onToggleVerse={handleVerseTap}
                    />
                    {missingVersions.length > 0 && (
                      <p className="mt-3 text-xs text-[#072A20] bg-[#F5F5F5] rounded-xl p-2">
                        이 본문은 {missingVersions.join(", ")} 데이터가 없어 함께 표시하지 못했습니다.
                      </p>
                    )}
                  </motion.div>
                </div>
              </div>

              {/* 고른 구절이 있는 동안 화면 아래에 떠 있는 막대 */}
              {onSelectVerseForMeditation && (
                <PickedVerseBar
                  count={pickedVerses.size}
                  onClear={() => setPickedVerses(new Map())}
                  onWrite={writeWithPicked}
                />
              )}

              {/* 처음 오신 분께 한 번만 — 옆으로 밀면 장이 넘어간다는 것 */}
              <div className="relative h-0">
                <CoachMark
                  id="bible-swipe"
                  show={!loading && !!result}
                  gesture="swipe"
                  className="absolute bottom-3 left-0 right-0"
                  text={
                    <>
                      손가락으로 <b style={{ color: "#FFD470" }}>옆으로 밀면</b> 다음 장으로
                      넘어갑니다
                    </>
                  }
                />
              </div>

              {/* 고른 구절 안내와 해제는 아래 막대가 맡는다 */}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-[#E3E9E2]">
                {/* Chapter Navigation Previous / Next */}
                <div className="flex gap-2">
                  {prevTarget && (
                    <button
                      type="button"
                      onClick={() => goToChapter(prevTarget, -1)}
                      className="px-3 py-1.5 bg-[#F5F5F5] hover:bg-[#D2DDD3] text-[#0C3B2E] font-bold text-xs rounded-3xl transition cursor-pointer whitespace-nowrap"
                    >
                      {prevTarget.isNewBook
                        ? `← 이전 권 (${prevTarget.book.name} ${prevTarget.chapter}장)`
                        : `← 이전 장 (${prevTarget.chapter}장)`}
                    </button>
                  )}
                  {nextTarget && (
                    <button
                      type="button"
                      onClick={() => goToChapter(nextTarget, 1)}
                      className="grad-forest px-3 py-1.5 text-white font-bold text-xs rounded-3xl transition cursor-pointer whitespace-nowrap hover:brightness-110"
                    >
                      {nextTarget.isNewBook
                        ? `다음 권 (${nextTarget.book.name} ${nextTarget.chapter}장) →`
                        : `다음 장 (${nextTarget.chapter}장) →`}
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Chapter Completion Checkbox Button for Logged-In User */}
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => handleToggleChapterComplete(currentChapterKey)}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-3xl font-bold text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
                        isCurrentChapterCompleted
                          ? "grad-forest text-white hover:brightness-110"
                          : "bg-[#F5F5F5] hover:bg-[#EDEDED] text-[#0C3B2E]"
                      }`}
                    >
                      <CheckCircle2 size={16} fill={isCurrentChapterCompleted ? "currentColor" : "none"} />
                      <span>{isCurrentChapterCompleted ? "통독 완료함 ✅" : "이 장 통독 완료 체크"}</span>
                    </button>
                  )}

                  {onSelectVerseForMeditation && pickedVerses.size === 0 && (
                    <button
                      type="button"
                      onClick={writeWithPicked}
                      className="grad-forest flex items-center gap-1.5 text-xs font-bold text-white px-3.5 py-1.5 rounded-3xl transition cursor-pointer whitespace-nowrap hover:brightness-110"
                    >
                      <Send size={14} />
                      <span>이 말씀으로 내 묵상 쓰기</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* '오늘의 통독 실천 제안' 상자를 뺐다 (2026-08-31).
                그만큼 위 성경 본문이 더 길게 보인다. */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 성경 선택 팝업 (권 → 장 → 절) */}
      {/*
        통독 플랜 고르기.
        표가 늘어도 이 창만 길어질 뿐 화면 머리는 단추 하나로 깔끔하게 남는다.
      */}
      <ModalPortal>
        <AnimatePresence>
          {showPlanPicker && (
            <div
              className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[calc(env(safe-area-inset-top)+1rem)]"
              onClick={() => setShowPlanPicker(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.18 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-[28px] w-full max-w-sm p-4 sm:p-5 shadow-2xl max-h-[85vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-[#0C3B2E]">통독 플랜</h3>
                    <p className="text-2xs text-[#6F8377] mt-0.5 leading-relaxed break-keep">
                      골라도 읽은 기록은 그대로 남습니다. 언제든 되돌리실 수 있습니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPlanPicker(false)}
                    className="w-8 h-8 rounded-full bg-[#F9F9F9] text-[#6F8377] flex items-center justify-center shrink-0 cursor-pointer"
                    aria-label="닫기"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="mt-3.5 space-y-2">
                  {([
                    {
                      id: null as ReadingTableId | null,
                      title: "일반 통독 플랜",
                      sub: `내가 정한 범위를 하루 ${userProgress?.dailyTarget || 3}장씩`
                    },
                    ...READING_TABLE_LIST.map((t) => ({
                      id: t.id as ReadingTableId | null,
                      title:
                        t.id === "readingJesus"
                          ? "리딩지저스 플랜"
                          : `어,성경 ${t.totalDays}일 플랜`,
                      sub:
                        t.id === "readingJesus"
                          ? `${t.weeks}주 ${t.totalDays}일 · 교회 통독표대로`
                          : `${t.totalDays}일 · 하루 분량을 표가 정합니다`
                    }))
                  ]).map((opt) => {
                    const picked = (myTable?.id || null) === opt.id;
                    return (
                      <button
                        key={opt.id || "normal"}
                        type="button"
                        disabled={switchingMode}
                        onClick={() => {
                          switchPlanMode(opt.id);
                          setShowPlanPicker(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl text-left transition cursor-pointer disabled:opacity-60 ${
                          picked ? "bg-[#EAF2EC] ring-2 ring-[#2F7358]" : "bg-[#F9F9F9] hover:bg-[#F0F0F0]"
                        }`}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-bold text-[#14261E]">{opt.title}</span>
                          <span className="block text-2xs text-[#6F8377] mt-0.5 break-keep">{opt.sub}</span>
                        </span>
                        {picked && (
                          <span className="w-6 h-6 rounded-full grad-forest text-white flex items-center justify-center shrink-0">
                            <Check size={14} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </ModalPortal>

      <ModalPortal>
      <AnimatePresence>
        {showNavModal && (
          <div
            // 다른 팝업과 같게 — 화면 맨 위에 붙는다
            className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] overflow-y-auto"
            onClick={() => setShowNavModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: -12 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full sm:max-w-2xl max-h-[calc(100vh-env(safe-area-inset-top)-1.5rem)] rounded-[26px] p-4 sm:p-6 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#E3E9E2] pb-3">
                <h4 className="font-bold text-[#0C3B2E] text-base sm:text-base flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-3xl shrink-0 ${
                      navTestament === 'OT' ? "bg-[#FFBA00] text-[#0C3B2E]" : "bg-[#0C3B2E] text-white"
                    }`}
                  >
                    <BookOpen size={16} />
                  </span>
                  {navTestament === 'OT' ? '구약' : '신약'} 성경 펼치기
                </h4>
                <button
                  type="button"
                  onClick={() => setShowNavModal(false)}
                  className="text-[#6F8377] hover:text-[#4A6B57] cursor-pointer p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 이동 경로(breadcrumb) */}
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#0C3B2E] flex-wrap py-3">
                <button
                  type="button"
                  onClick={() => { setNavStep('book'); setNavBook(null); setNavChapter(null); }}
                  className={`px-2 py-1 rounded-xl transition cursor-pointer ${navStep === 'book' ? "bg-[#F5F5F5]" : "hover:bg-[#F5F5F5]"}`}
                >
                  {navTestament === 'OT' ? '구약' : '신약'}
                </button>
                {navBook && (
                  <>
                    <ChevronRight size={14} className="text-[#AFC0B2]" />
                    <button
                      type="button"
                      onClick={() => { setNavStep('chapter'); setNavChapter(null); }}
                      className={`px-2 py-1 rounded-xl transition cursor-pointer ${navStep === 'chapter' ? "bg-[#F5F5F5]" : "hover:bg-[#F5F5F5]"}`}
                    >
                      {navBook.name}
                    </button>
                  </>
                )}
                {navBook && navChapter && (
                  <>
                    <ChevronRight size={14} className="text-[#AFC0B2]" />
                    <span className="px-2 py-1 rounded-xl bg-[#F5F5F5]">{navChapter}장</span>
                  </>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pr-1 pb-4 scrollbar-thin scrollbar-thumb-slate-200">
                {/* STEP 1: 권(책) 선택 */}
                {navStep === 'book' && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {BIBLE_BOOKS.filter(b => b.testament === navTestament).map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleNavSelectBook(b)}
                        className="py-3 px-1 bg-[#F5F5F5] rounded-3xl text-[#14261E] font-bold text-sm hover:bg-[#F5F5F5] hover:border-[#0C3B2E] transition cursor-pointer text-center"
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* STEP 2: 장 선택 */}
                {navStep === 'chapter' && navBook && (
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                    {Array.from({ length: navBook.chapters }, (_, i) => i + 1).map((ch) => {
                      const key = `${navBook.name} ${ch}장`;
                      const isDone = userProgress?.completedChapters?.includes(key);
                      return (
                        <button
                          key={ch}
                          type="button"
                          onClick={() => handleNavSelectChapter(ch)}
                          className={`py-2.5 rounded-3xl font-bold text-sm transition cursor-pointer relative ${
                            isDone
                              ? "grad-forest text-white"
                              : "bg-[#F0F0F0] text-[#14261E] hover:bg-[#E8E8E8]"
                          }`}
                        >
                          {ch}
                          {isDone && <span className="absolute top-0.5 right-1 text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* STEP 3: 절 선택 */}
                {navStep === 'verse' && navBook && navChapter && (
                  <div className="space-y-2.5">
                    <p className="text-xs font-medium text-[#6F8377]">
                      절을 누르면 팝업이 닫히고 본문에서 그 절로 이동합니다.
                    </p>
                    {navVerseLoading ? (
                      <div className="py-6 text-center text-xs text-[#6F8377] flex items-center justify-center gap-2">
                        <Loader className="animate-spin" size={16} /> 절 정보를 불러오는 중...
                      </div>
                    ) : navVerseCount ? (
                      <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                        {Array.from({ length: navVerseCount }, (_, i) => i + 1).map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => handleNavSelectVerse(v)}
                            className="py-2 rounded-xl font-bold text-xs bg-[#F0F0F0] text-[#14261E] hover:bg-[#0C3B2E] hover:text-white hover:border-[#0C3B2E] transition cursor-pointer"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="py-4 text-center text-xs text-[#6F8377] font-medium">절 정보를 표시할 수 없습니다.</p>
                    )}
                  </div>
                )}
              </div>

              {/* 절을 고르지 않고 장 전체만 보고 싶을 때 */}
              {navStep === 'verse' && navBook && navChapter && (
                <div className="pt-3 border-t border-[#E3E9E2] flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHighlightVerse(null);
                      setShowNavModal(false);
                      setPendingScroll(true);
                    }}
                    className="px-5 py-2.5 bg-[#0C3B2E] text-white text-xs font-bold rounded-3xl hover:bg-[#072A20] transition cursor-pointer"
                  >
                    {navBook.name} {navChapter}장 처음부터 읽기
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </ModalPortal>

      {/* 시작할 말씀 고르기 — 목표 설정에서 연다 */}
      <SettingModal
        open={showStartBookModal}
        onClose={() => setShowStartBookModal(false)}
        title="시작할 말씀 선택"
        sub="고른 권의 1장부터 통독을 시작합니다. 목표 장 수도 거기에 맞춰 다시 셉니다."
      >
        <div className="space-y-4">
          {(["OT", "NT"] as const)
            .filter((t) => planScope === "all" || planScope === t)
            .map((testament) => (
              <div key={testament}>
                <p className="text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2 ml-1">
                  {testament === "OT" ? "구약 (39권)" : "신약 (27권)"}
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                  {BIBLE_BOOKS.filter((b) => b.testament === testament).map((b) => {
                    const on = startBook === b.name;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setStartBook(b.name);
                          // 그 권부터 끝까지가 이번 통독 분량이 된다
                          setTargetChapters(planSequence(planScope, b.name).length);
                          setShowStartBookModal(false);
                        }}
                        className={`py-2.5 px-1 rounded-2xl text-sm font-bold transition cursor-pointer ${
                          on ? "grad-forest text-white" : "bg-[#F9F9F9] text-[#14261E] hover:bg-[#F0F0F0]"
                        }`}
                      >
                        {b.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </SettingModal>

      {/* 진행률 · 통독 설정 팝업 */}
      <SettingModal
        open={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        title={myTable ? `${myTable.short} 통독 진행률` : "통독 진행률"}
        sub={
          isRJ
            ? `${myTable?.goalTitle || ""} · 통독표가 날마다 읽을 분량을 정합니다`
            : userProgress?.goalTitle || "1년 1독 (전체 1,189장)"
        }
      >
        <div className="space-y-4">
          <div className="bg-[#F9F9F9] rounded-2xl p-4">
            <div className="flex justify-between items-end gap-2 mb-2">
              <strong className="text-[#0C3B2E] text-lg">
                {completedCount}장 <span className="text-[#6F8377] text-sm font-bold">/ {targetCount}장</span>
              </strong>
              <span className="text-[#195C50] font-bold text-lg shrink-0">{progressPercent}%</span>
            </div>
            <div className="w-full bg-[#E4E4E4] rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#6D9773] to-[#FFBA00] h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, progressPercent)}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-2xs text-[#6F8377] mt-2.5 font-medium">
              <span>
                {isRJ
                  ? `오늘 ${rjToday ? rjRangeLabel(rjToday.entry) : "쉬는 날"}`
                  : `하루 권장 ${userProgress?.dailyTarget || 3}장`}
              </span>
              <span>남은 분량 {Math.max(0, targetCount - completedCount)}장</span>
            </div>
          </div>

          {/* 어느 일정을 따르는지 — 눌러서 공동체 일정과 내 일정을 오간다 */}
          {isRJ && (
            <button
              type="button"
              onClick={() => setShowRjMyPlanModal(true)}
              className="w-full flex items-center gap-3 p-3 bg-[#F9F9F9] hover:bg-[#F0F0F0] rounded-2xl transition cursor-pointer text-left"
            >
              <span className="w-9 h-9 rounded-full bg-[#D2DDD3] text-[#4A6B57] flex items-center justify-center shrink-0">
                {rjFollowingCommunity ? <Users size={17} /> : <CalendarDays size={17} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-2xs text-[#6F8377]">내 통독 일정</span>
                <span className="block text-sm font-bold text-[#14261E] truncate">
                  {rjSchedule.length === 0
                    ? "아직 정해지지 않음"
                    : rjFollowingCommunity
                    ? "공동체 일정 따르기"
                    : "통독 일정 정하기"}
                </span>
              </span>
              <ChevronRight size={16} className="text-[#6F8377] shrink-0" />
            </button>
          )}

          {/* 이번 주 통독표 — 리딩지저스 모드에서는 여기서 본다.
              줄을 누르면 팝업이 닫히고 그날 말씀으로 바로 넘어간다. */}
          {isRJ && (
            <div>
              <div className="flex items-baseline justify-between gap-2 mb-2 ml-1">
                <p className="text-2xs font-bold text-[#6F8377] tracking-[0.08em]">이번 주 통독표</p>
                <p className="text-2xs text-[#6F8377]">
                  {myTable ? tableProgressLabel(myTable, rjToday?.index ?? -1, rjCurrentWeek) : ""}
                </p>
              </div>

              {rjSchedule.length === 0 ? (
                <p className="text-xs text-[#6F8377] bg-[#F9F9F9] rounded-2xl p-3.5 text-center leading-relaxed">
                  아직 통독 일정이 정해지지 않았습니다.
                  <br />
                  위 <strong>내 통독 일정</strong>에서 시작날을 정해 보세요.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {rjRows.map((row) => (
                    <button
                      key={row.dateKey}
                      type="button"
                      disabled={!row.day}
                      onClick={() => row.day && startRjRow(row.day.chapters)}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition ${
                        !row.day
                          ? "bg-[#FBFBFB] cursor-default"
                          : "bg-[#F9F9F9] hover:bg-[#F0F0F0] cursor-pointer"
                      } ${row.when === "today" ? "ring-2 ring-[#4A6B57]" : ""}`}
                    >
                      {/* 다 읽은 날은 요일 동그라미에 불이 들어온다 */}
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          row.done
                            ? "grad-forest text-white"
                            : row.when === "today"
                            ? "bg-[#FFBA00] text-[#4A3600]"
                            : "bg-[#EDEDED] text-[#6F8377]"
                        }`}
                      >
                        {RJ_DAY_LABELS[row.weekday]}
                      </span>

                      <span className="flex-1 min-w-0">
                        {/* 아직 안 읽은 날은 연하게, 읽은 날은 읽은 색으로 */}
                        <span
                          className={`block text-sm font-bold truncate ${
                            !row.day
                              ? "text-[#C7CFC8]"
                              : row.done
                              ? "text-[#195C50]"
                              : "text-[#A8B3A9]"
                          }`}
                        >
                          {row.day ? rjRangeLabel(row.day.entry) : rjRestText(row)}
                        </span>
                        {(row.done || row.when === "today") && (
                          <span
                            className={`block text-2xs mt-px font-bold ${
                              row.done ? "text-[#195C50]" : "text-[#6F8377]"
                            }`}
                          >
                            {row.done ? "완료" : "오늘"}
                          </span>
                        )}
                      </span>

                      {row.done ? (
                        <Check size={17} className="text-[#195C50] stroke-[3px] shrink-0" />
                      ) : row.day ? (
                        <BookOpen size={15} className="text-[#6F8377] shrink-0" />
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 읽기 계획 — 오늘부터 일주일. 하루 밀리면 다음 칸이 저절로 당겨진다.
              리딩지저스 모드에서는 위 통독표가 그 자리를 대신한다. */}
          <div className={isRJ ? "hidden" : ""}>
            <div className="flex items-baseline justify-between gap-2 mb-2 ml-1">
              <p className="text-2xs font-bold text-[#6F8377] tracking-[0.08em]">앞으로 일주일 계획</p>
              <p className="text-2xs text-[#6F8377]">
                {readingDaysOf(userProgress).map((d) => DAY_LABELS[d]).join("·")} · 하루{" "}
                {userProgress?.dailyTarget || 3}장
              </p>
            </div>

            {weeklyPlan.finished ? (
              <p className="text-xs text-[#0C3B2E] bg-[#E8F0E9] rounded-2xl p-3.5 font-bold text-center">
                통독을 다 마치셨습니다. 수고 많으셨습니다 🎉
              </p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {weeklyPlan.rows.map((row) => {
                  const empty = row.chapters.length === 0;
                  // 줄 전체가 버튼이다 — 요일을 누르든 어디를 누르든 그 본문으로 넘어간다
                  return (
                    <button
                      key={row.dateKey}
                      type="button"
                      disabled={empty}
                      onClick={() => startPlanRow(row.chapters)}
                      title={empty ? undefined : `${rangeLabel(row.chapters)} 읽으러 가기`}
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition ${
                        empty
                          ? "bg-[#FBFBFB] cursor-default"
                          : "bg-[#F9F9F9] hover:bg-[#F0F0F0] cursor-pointer"
                      } ${row.when === "today" ? "ring-2 ring-[#4A6B57]" : ""}`}
                    >
                      {/* 읽은 날은 요일 동그라미에 불이 들어온다 (초록). 아니면 그대로 회색 */}
                      <span
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                          row.done
                            ? "grad-forest text-white"
                            : row.when === "today"
                            ? "bg-[#FFBA00] text-[#4A3600]"
                            : "bg-[#EDEDED] text-[#6F8377]"
                        }`}
                      >
                        {row.label}
                      </span>

                      <span className="flex-1 min-w-0">
                        {/* 읽은 날은 읽은 색으로 진하게, 아직 안 읽은 날은 연하게 */}
                        <span
                          className={`block text-sm font-bold truncate ${
                            empty
                              ? "text-[#C7CFC8]"
                              : row.done
                              ? "text-[#195C50]"
                              : "text-[#A8B3A9]"
                          }`}
                        >
                          {empty ? "—" : rangeLabel(row.chapters)}
                        </span>
                        {(row.done || row.when === "today") && (
                          <span
                            className={`block text-2xs mt-px font-bold ${
                              row.done ? "text-[#195C50]" : "text-[#6F8377]"
                            }`}
                          >
                            {row.done ? "완료" : "오늘"}
                          </span>
                        )}
                      </span>

                      {row.done && (
                        <Check size={17} className="text-[#195C50] stroke-[3px] shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* 리딩지저스는 하루 장 수·목표 장 수를 정할 것이 없다 — 그 자리에 전체 스케줄을 둔다 */}
            {isRJ ? (
              <button
                type="button"
                onClick={() => {
                  setShowProgressModal(false);
                  setShowRjScheduleModal(true);
                }}
                className="grad-forest flex items-center justify-center gap-1.5 py-3 rounded-2xl text-white text-sm font-bold transition cursor-pointer hover:brightness-110"
              >
                <CalendarDays size={15} />
                전체 스케줄 확인
              </button>
            ) : (
            <button
              type="button"
              onClick={() => {
                setShowProgressModal(false);
                setShowGoalModal(true);
              }}
              className="grad-forest flex items-center justify-center gap-1.5 py-3 rounded-2xl text-white text-sm font-bold transition cursor-pointer hover:brightness-110"
            >
              <Target size={15} />
              목표 설정
            </button>
            )}
            <button
              type="button"
              onClick={() => {
                setShowProgressModal(false);
                setShowChecklistModal(true);
              }}
              className="grad-teal flex items-center justify-center gap-1.5 py-3 rounded-2xl text-white text-sm font-bold transition cursor-pointer hover:brightness-110"
            >
              <ListChecks size={15} />
              통독 체크리스트
            </button>
          </div>
        </div>
      </SettingModal>

      {/* 내 통독 일정 — 공동체 일정을 따를지, 내가 정할지 */}
      <SettingModal
        open={showRjMyPlanModal}
        onClose={() => setShowRjMyPlanModal(false)}
        title="내 통독 일정"
        sub="공동체와 함께 갈지, 내 사정에 맞춰 따로 갈지 고르세요."
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "community" as const, label: "공동체 일정", sub: "다 함께 같은 날 같은 본문" },
              { key: "personal" as const, label: "내 일정", sub: "내가 정한 날짜대로" }
            ]).map((opt) => {
              const on = rjFollow === opt.key;
              const noCommunity = opt.key === "community" && !rjCommunity;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setRjFollow(opt.key);
                    setRjAdminMessage("");
                    if (opt.key === "community" && currentUser?.role === "admin") loadCommunityIntoForm();
                  }}
                  className={`p-3 rounded-2xl text-left transition cursor-pointer ${
                    on ? "grad-forest text-white" : "bg-[#F9F9F9] text-[#4A6B57] hover:bg-[#F0F0F0]"
                  }`}
                >
                  <span className="block text-sm font-bold">{opt.label}</span>
                  <span
                    className={`block text-2xs mt-0.5 leading-snug ${
                      on ? "text-white/80" : "text-[#6F8377]"
                    }`}
                  >
                    {noCommunity ? "아직 정해지지 않았습니다" : opt.sub}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 관리자는 공동체 일정을 여기서 바로 정한다.
              한 번 정하면 공동체 일정을 따르는 모든 지체와 <오늘의 말씀>이 이 통독표를 쓴다. */}
          {rjFollow === "community" && currentUser?.role === "admin" ? (
            <div className="space-y-3">
              <div className="bg-[#FFF7E0] rounded-2xl px-3.5 py-3">
                <p className="text-xs font-bold text-[#0C3B2E] flex items-center gap-1.5">
                  <Users size={14} /> 공동체 전체 일정
                </p>
                <p className="text-2xs text-[#4A6B57] mt-1 leading-relaxed">
                  여기서 정하면 공동체 일정을 따르는 모든 지체가 같은 날 같은 본문을 읽고,
                  <b> 오늘의 말씀</b>에도 그날 읽을 본문이 매일 아침 저절로 올라갑니다.
                </p>
              </div>

              <ReadingJesusScheduleForm
                startDate={rjStartDate}
                onStartDate={setRjStartDate}
                readingDays={rjReadingDays}
                onReadingDays={setRjReadingDays}
                breaks={rjBreaks}
                onBreaks={setRjBreaks}
                startHint="이 날 1주차 첫 분량(창세기 1~4장)부터 공동체가 함께 시작합니다."
              />

              {rjAdminMessage && (
                <p className="text-2xs font-bold text-[#0F4A39] bg-[#F9F9F9] rounded-xl px-3 py-2 leading-relaxed">
                  {rjAdminMessage}
                </p>
              )}
            </div>
          ) : rjFollow === "community" ? (
            <div className="bg-[#F9F9F9] rounded-2xl px-3.5 py-3 space-y-1">
              {rjCommunity ? (
                <>
                  <p className="text-xs font-bold text-[#14261E]">
                    {rjCommunity.startDate} 시작 ·{" "}
                    {rjCommunity.readingDays.map((d) => RJ_DAY_LABELS[d]).join("·")}요일
                  </p>
                  <p className="text-2xs text-[#6F8377]">
                    쉬는 기간 {rjCommunity.breaks.length}건
                  </p>
                  <p className="text-2xs text-[#6F8377] pt-1">
                    공동체 일정은 관리자가 오늘의 말씀 설정에서 정합니다.
                  </p>
                </>
              ) : (
                <p className="text-xs text-[#6F8377] leading-relaxed">
                  공동체 통독 일정이 아직 정해지지 않았습니다.
                  <br />
                  먼저 <strong>내 일정</strong>으로 시작하셔도 됩니다.
                </p>
              )}
            </div>
          ) : (
            <ReadingJesusScheduleForm
              startDate={rjStartDate}
              onStartDate={setRjStartDate}
              readingDays={rjReadingDays}
              onReadingDays={setRjReadingDays}
              breaks={rjBreaks}
              onBreaks={setRjBreaks}
              startHint="이 날 1주차 첫 분량(창세기 1~4장)부터 시작합니다."
            />
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowRjMyPlanModal(false)}
              className="px-4 py-2.5 text-[#4A6B57] rounded-2xl text-sm font-bold cursor-pointer"
            >
              취소
            </button>
            {rjFollow === "community" && currentUser?.role === "admin" ? (
              <button
                type="button"
                disabled={savingCommunityRj}
                onClick={saveCommunityRjPlan}
                className="grad-forest px-5 py-2.5 text-white text-sm font-bold rounded-2xl transition cursor-pointer hover:brightness-110 disabled:opacity-60"
              >
                {savingCommunityRj ? "정하는 중..." : "공동체 전체 일정으로 정하기"}
              </button>
            ) : (
              <button
                type="button"
                disabled={savingRjPlan}
                onClick={() => saveRjPlan(rjFollow)}
                className="grad-forest px-5 py-2.5 text-white text-sm font-bold rounded-2xl transition cursor-pointer hover:brightness-110 disabled:opacity-60"
              >
                {savingRjPlan ? "저장 중..." : "이 일정으로 하기"}
              </button>
            )}
          </div>
        </div>
      </SettingModal>

      {/* 리딩지저스 전체 스케줄 — 45주 전체를 주별로 본다.
          열면 이번 주로 내려가고, 한 줄을 누르면 그 말씀으로 바로 넘어간다. */}
      <SettingModal
        open={showRjScheduleModal}
        onClose={() => setShowRjScheduleModal(false)}
        title="리딩지저스 전체 스케줄"
        sub={
          rjSchedule.length === 0
            ? "아직 통독 일정이 정해지지 않았습니다"
            : `${myTable ? `${myTable.totalDays}일` : ""} · 마치는 날 ${rjFinish ? rjShortDate(rjFinish) : "-"}`
        }
      >
        <div className="space-y-4">
          {rjBlocks.map((block) => {
            const isThisWeek = block.week === rjCurrentWeek;
            return (
              <div
                key={block.week}
                ref={isThisWeek ? rjCurrentWeekRef : undefined}
                className="scroll-mt-2"
              >
                <div className="flex items-baseline justify-between gap-2 mb-1.5 ml-1">
                  <p
                    className={`text-2xs font-bold tracking-[0.08em] ${
                      isThisWeek ? "text-[#195C50]" : "text-[#6F8377]"
                    }`}
                  >
                    {block.week}주 · {block.section}
                    {isThisWeek && <span className="ml-1.5 text-[#FFBA00]">이번 주</span>}
                  </p>
                  <p className="text-2xs text-[#6F8377] shrink-0">
                    {rjShortDate(block.days[0].date)} ~ {rjShortDate(block.days[block.days.length - 1].date)}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  {block.days.map((day) => {
                    const done = day.chapters.every((c) => completedSet.has(c.key));
                    const isToday = day.dateKey === rjDateKey(new Date());
                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => startRjRow(day.chapters)}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-2xl text-left transition bg-[#F9F9F9] hover:bg-[#F0F0F0] cursor-pointer ${
                          isToday ? "ring-2 ring-[#4A6B57]" : ""
                        }`}
                      >
                        <span
                          className={`w-14 h-8 rounded-full flex items-center justify-center shrink-0 text-2xs font-bold ${
                            done
                              ? "grad-forest text-white"
                              : isToday
                              ? "bg-[#FFBA00] text-[#4A3600]"
                              : "bg-[#EDEDED] text-[#6F8377]"
                          }`}
                        >
                          {rjShortDate(day.date)}
                        </span>

                        <span className="flex-1 min-w-0">
                          <span
                            className={`block text-sm font-bold truncate ${
                              done ? "text-[#195C50]" : "text-[#A8B3A9]"
                            }`}
                          >
                            {rjRangeLabel(day.entry)}
                          </span>
                          <span className="block text-2xs text-[#6F8377] mt-px">
                            {RJ_DAY_LABELS[day.date.getDay()]}요일
                          </span>
                        </span>

                        {done ? (
                          <Check size={17} className="text-[#195C50] stroke-[3px] shrink-0" />
                        ) : (
                          <BookOpen size={15} className="text-[#6F8377] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {rjSchedule.length === 0 && (
            <p className="text-xs text-[#6F8377] bg-[#F9F9F9] rounded-2xl p-4 text-center leading-relaxed">
              통독 시작날과 읽는 요일을 정하면
              <br />
              여기에 45주 전체 계획이 나옵니다.
            </p>
          )}
        </div>
      </SettingModal>

      {/* Goal Setup Modal */}
      <ModalPortal>
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#E3E9E2] pb-3">
                <h4 className="font-bold text-[#0C3B2E] text-base flex items-center gap-2">
                  <Target className="text-[#4A6B57]" size={18} />
                  내 성경 통독 목표 설정
                </h4>
                <button
                  type="button"
                  onClick={() => setShowGoalModal(false)}
                  className="text-[#6F8377] hover:text-[#4A6B57] cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveGoal} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-[#0C3B2E] mb-1">통독 목표 이름</label>
                  <input
                    type="text"
                    value={goalTitle}
                    onChange={(e) => setGoalTitle(e.target.value)}
                    placeholder="예: 1년 1독, 신약 통독, 100일 성경통독"
                    className="w-full p-2.5 bg-[#F5F5F5] rounded-3xl text-[#14261E] font-bold focus:ring-2 focus:ring-[#4A6B57]"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0C3B2E] mb-1">목표 장 수</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGoalTitle("1년 1독 (전체 1,189장)");
                        setTargetChapters(1189);
                        setDailyTarget(3);
                        setPlanScope("all");
                        setStartBook("창세기");
                      }}
                      className={`p-2 rounded-3xl text-xs font-bold border transition cursor-pointer ${
                        targetChapters === 1189 ? "bg-[#0C3B2E] text-white border-[#0C3B2E]" : "bg-[#F5F5F5] text-[#4A6B57] hover:bg-[#D2DDD3]"
                      }`}
                    >
                      성경 전체 (1,189장)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGoalTitle("신약 통독 (260장)");
                        setTargetChapters(260);
                        setDailyTarget(2);
                        setPlanScope("NT");
                        setStartBook("마태복음");
                      }}
                      className={`p-2 rounded-3xl text-xs font-bold border transition cursor-pointer ${
                        targetChapters === 260 ? "bg-[#0C3B2E] text-white border-[#0C3B2E]" : "bg-[#F5F5F5] text-[#4A6B57] hover:bg-[#D2DDD3]"
                      }`}
                    >
                      신약 전체 (260장)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGoalTitle("구약 통독 (929장)");
                        setTargetChapters(929);
                        setDailyTarget(3);
                        setPlanScope("OT");
                        setStartBook("창세기");
                      }}
                      className={`p-2 rounded-3xl text-xs font-bold border transition cursor-pointer ${
                        targetChapters === 929 ? "bg-[#0C3B2E] text-white border-[#0C3B2E]" : "bg-[#F5F5F5] text-[#4A6B57] hover:bg-[#D2DDD3]"
                      }`}
                    >
                      구약 전체 (929장)
                    </button>
                  </div>
                  {/* 어느 권부터 시작할지 — 누르면 팝업에서 고른다 */}
                  <button
                    type="button"
                    onClick={() => setShowStartBookModal(true)}
                    className="w-full flex items-center gap-3 p-3 bg-[#F5F5F5] hover:bg-[#EDEDED] rounded-3xl transition cursor-pointer text-left"
                  >
                    <span className="w-9 h-9 rounded-full bg-[#D2DDD3] text-[#4A6B57] flex items-center justify-center shrink-0">
                      <BookOpen size={17} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-2xs text-[#6F8377]">시작할 말씀</span>
                      <span className="block text-sm font-bold text-[#14261E] truncate">
                        {startBook} 1장부터 · {targetChapters}장
                      </span>
                    </span>
                    <ChevronRight size={17} className="text-[#6F8377] shrink-0" />
                  </button>
                </div>

                <div>
                  <label className="block font-bold text-[#0C3B2E] mb-1">하루 권장 읽기 장 수</label>
                  <input
                    type="number"
                    value={dailyTarget}
                    onChange={(e) => setDailyTarget(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#F5F5F5] rounded-3xl text-[#14261E] font-bold"
                    min={1}
                    max={50}
                    required
                  />
                </div>

                {/* 읽는 요일 — 이 요일들에만 주간 계획이 잡힌다 */}
                <div>
                  <label className="block font-bold text-[#0C3B2E] mb-1">읽는 요일</label>
                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {DAY_LABELS.map((label, day) => {
                      const on = readingDays.includes(day);
                      const weekend = day === 0 || day === 6;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() =>
                            setReadingDays((prev) =>
                              prev.includes(day)
                                ? prev.filter((d) => d !== day)
                                : [...prev, day].sort((a, b) => a - b)
                            )
                          }
                          className={`h-10 rounded-2xl text-sm font-bold transition cursor-pointer ${
                            on
                              ? "grad-forest text-white"
                              : weekend
                              ? "bg-[#F5F5F5] text-[#B3261E] hover:bg-[#EDEDED]"
                              : "bg-[#F5F5F5] text-[#4A6B57] hover:bg-[#EDEDED]"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {([
                      { label: "월~금", days: [1, 2, 3, 4, 5] },
                      { label: "월~토", days: [1, 2, 3, 4, 5, 6] },
                      { label: "월~일 (매일)", days: [0, 1, 2, 3, 4, 5, 6] }
                    ] as const).map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setReadingDays([...preset.days])}
                        className="px-3 py-1.5 rounded-full bg-[#F5F5F5] hover:bg-[#D2DDD3] text-2xs font-bold text-[#4A6B57] transition cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {readingDays.length === 0 && (
                    <p className="text-2xs text-[#8F1E17] mt-1.5">
                      하루도 고르지 않으면 주간 계획이 비어 있게 됩니다.
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E9E2]">
                  <button
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="px-4 py-2 text-[#4A6B57] rounded-3xl font-bold cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={savingGoal}
                    className="px-5 py-2 bg-[#4A6B57] hover:bg-[#072A20] text-white font-bold rounded-3xl transition cursor-pointer"
                  >
                    {savingGoal ? "저장 중..." : "목표 저장하기"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </ModalPortal>

      {/* Full 66-Book Checklist Modal */}
      <ModalPortal>
      <AnimatePresence>
        {showChecklistModal && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] max-w-2xl w-full max-h-[85vh] p-6 flex flex-col shadow-2xl"
            >
              <div className="flex justify-between items-center border-b border-[#E3E9E2] pb-3 mb-3">
                <div>
                  <h4 className="font-bold text-[#0C3B2E] text-base">나의 통독 체크리스트</h4>
                  <p className="text-xs text-[#6F8377] font-medium">
                    초록색 체크 항목은 내가 이미 완독한 장입니다. 클릭하면 완독 여부를 언제든지 변경할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowChecklistModal(false)}
                  className="text-[#6F8377] hover:text-[#4A6B57] cursor-pointer p-1"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 구약 / 신약 / 통독 진행 중 */}
              <div className="pb-3 border-b border-[#E3E9E2] mb-3">
                <div data-no-tab-swipe className="flex bg-[#F5F5F5] p-1 rounded-3xl text-xs font-bold text-[#4A6B57] overflow-x-auto w-fit">
                  <button
                    type="button"
                    onClick={() => setChecklistTab('OT')}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                      checklistTab === 'OT' ? "bg-[#0C3B2E] text-white" : "hover:text-[#0C3B2E]"
                    }`}
                  >
                    구약 (39권)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChecklistTab('NT')}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                      checklistTab === 'NT' ? "bg-[#0C3B2E] text-white" : "hover:text-[#0C3B2E]"
                    }`}
                  >
                    신약 (27권)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChecklistTab('IN_PROGRESS')}
                    className={`px-3 py-1.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
                      checklistTab === 'IN_PROGRESS' ? "bg-[#0C3B2E] text-white" : "hover:text-[#0C3B2E]"
                    }`}
                  >
                    통독 진행 중
                  </button>
                </div>
              </div>

              {/* Book Chapter Grid */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-200 text-xs">
                {BIBLE_BOOKS.filter((b) => {
                  if (checklistTab === 'OT' && b.testament !== 'OT') return false;
                  if (checklistTab === 'NT' && b.testament !== 'NT') return false;

                  const bookCompletedCount = Array.from({ length: b.chapters }, (_, i) => i + 1)
                    .filter(ch => userProgress?.completedChapters?.includes(`${b.name} ${ch}장`)).length;
                  const isLastReadBook = userProgress?.lastReadBook === b.name;

                  if (checklistTab === 'IN_PROGRESS' && bookCompletedCount === 0 && !isLastReadBook) {
                    return false;
                  }

                  return true;
                }).map((b) => {
                  const bookCompletedCount = Array.from({ length: b.chapters }, (_, i) => i + 1)
                    .filter(ch => userProgress?.completedChapters?.includes(`${b.name} ${ch}장`)).length;
                  const isLastReadBook = userProgress?.lastReadBook === b.name;

                  return (
                    <div key={b.id} className={`p-4 rounded-3xl border transition ${
                      isLastReadBook ? "bg-[#FFF4DC]" : "bg-[#F5F5F5]"
                    }`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-[#0C3B2E] text-sm flex items-center gap-2">
                          {/* 구약/신약 뱃지와 장 수는 뺐다 — 위 탭에서 이미 구약·신약을 고르고,
                              장 수는 바로 오른쪽 "n / m장 완료"에 이미 나온다 */}
                          {b.name}
                          {isLastReadBook && (
                            <span className="text-xs font-bold bg-[#C7D8C9] text-[#0C3B2E] px-2 py-0.5 rounded-full">
                              읽는 중
                            </span>
                          )}
                        </span>
                        <span className="text-xs font-bold text-[#4A6B57]">
                          {bookCompletedCount} / {b.chapters}장 완료 ({Math.round((bookCompletedCount / b.chapters) * 100)}%)
                        </span>
                      </div>

                      {/* Chapter Pill Grid */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {Array.from({ length: b.chapters }, (_, i) => i + 1).map((ch) => {
                          const key = `${b.name} ${ch}장`;
                          const isDone = userProgress?.completedChapters?.includes(key);
                          const isCurrentReadingLocation = userProgress?.lastReadBook === b.name && userProgress?.lastReadChapter === ch;

                          return (
                            <button
                              key={ch}
                              type="button"
                              onClick={() => handleToggleChapterComplete(key)}
                              // 읽음을 해제하면 안 읽은 장과 완전히 같은 색이어야 한다.
                              // (현재 읽는 위치 표시는 아래 점으로만 남긴다)
                              className={`w-8 h-8 rounded-3xl font-bold text-xs transition cursor-pointer flex items-center justify-center relative ${
                                isDone
                                  ? "bg-[#0C3B2E] text-white shadow-sm"
                                  : "bg-[#F5F5F5] hover:bg-[#D2DDD3] text-[#4A6B57]"
                              }`}
                              title={`${key} ${isDone ? "완독 해제" : "완독 표시"}`}
                            >
                              {ch}
                              {isCurrentReadingLocation && (
                                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#FFBA00]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-[#E3E9E2] flex justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowChecklistModal(false)}
                  className="px-5 py-2 bg-[#0C3B2E] text-white text-xs font-bold rounded-3xl hover:bg-[#072A20] transition cursor-pointer"
                >
                  닫기
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </ModalPortal>
    </div>
  );
}
