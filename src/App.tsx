import React, { useState, useEffect } from "react";
import { BookOpen, Calendar, Bell, LogOut, MessageSquare, BookMarked, HeartHandshake, HelpCircle, Cross, Trophy, Settings, ChevronLeft, ChevronRight, Heart, User } from "lucide-react";
import BrandMark from "./components/BrandMark";
import { motion, AnimatePresence } from "motion/react";
import LoginScreen from "./components/LoginScreen";
import DailyNotice from "./components/DailyNotice";
import BibleReader from "./components/BibleReader";
import MeditationFeed from "./components/MeditationFeed";
import DailyGratitude from "./components/DailyGratitude";
import BibleQnA from "./components/BibleQnA";
import NotificationSettings from "./components/NotificationSettings";
import MyMeditations from "./components/MyMeditations";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import GoalSummaryPopup from "./components/GoalSummaryPopup";
import CommunitySettings from "./components/CommunitySettings";
import ChallengeTab from "./components/ChallengeTab";
import AppGuide, { guideSeen } from "./components/AppGuide";
import { clearToken, getCommunity, saveCommunity } from "./lib/session";
import { useSwipe } from "./lib/useSwipe";

interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

type TabType = 'notice' | 'feed' | 'gratitude' | 'challenge' | 'bible' | 'my' | 'qna' | 'settings';

const TAB_KEYS: TabType[] = ['notice', 'feed', 'gratitude', 'challenge', 'bible', 'my', 'qna', 'settings'];

/**
 * 탭 한 곳 정의. PC 탭 바와 모바일 하단 바가 **같은 목록**을 보고 그린다.
 * 예전에는 두 바에 버튼을 각각 손으로 써 두어, 하나만 고치면 서로 어긋났다.
 */
type TabIcon = React.ComponentType<{ size?: number; className?: string }>;

const TAB_DEFS: Record<TabType, { label: string; short: string; icon: TabIcon }> = {
  notice:    { label: "오늘 말씀",   short: "오늘말씀", icon: BookOpen },
  gratitude: { label: "감사칭찬",    short: "감사칭찬", icon: Heart },
  challenge: { label: "챌린지",      short: "챌린지",   icon: Trophy },
  feed:      { label: "묵상 일기",   short: "묵상일기", icon: MessageSquare },
  bible:     { label: "성경 읽기방", short: "성경통독", icon: BrandMark },
  my:        { label: "나의 기록",   short: "나의기록", icon: User },
  qna:       { label: "성경 Q&A",    short: "성경Q&A",  icon: HelpCircle },
  settings:  { label: "알림 설정",   short: "알림설정", icon: Bell }
};

function isTabKey(value: unknown): value is TabType {
  return typeof value === "string" && (TAB_KEYS as string[]).includes(value);
}

/**
 * 휴대폰 알림을 눌러 들어왔을 때 열어야 할 화면.
 * 서버가 보내는 알림에 `/?tab=gratitude` 같은 주소가 붙어 있어서,
 * 알림을 누르면 그 글이 있는 탭이 바로 열린다.
 */
function tabFromUrl(): TabType | null {
  try {
    const tab = new URLSearchParams(window.location.search).get("tab");
    return isTabKey(tab) ? tab : null;
  } catch {
    return null;
  }
}

/**
 * 성경 Q&A 탭 노출 여부.
 * 지금은 잠시 숨겨둔 상태 — 다시 열려면 true 로만 바꾸면 된다.
 * (기능·코드는 그대로 살아 있음)
 */
const SHOW_QNA_TAB = false;

/**
 * 앱 사용 안내를 **관리자에게만** 먼저 보인다.
 * 목사님이 먼저 써 보시고 괜찮으면 false 로 바꿔 모두에게 연다.
 */
const GUIDE_FOR_ADMIN_ONLY = true;

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("bible_med_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [allUsers, setAllUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  /**
   * 앱 머리에 뜨는 공동체 이름.
   * 기기에 기억해 둔 이름을 먼저 보여주고(깜빡임 없음), 서버 값으로 맞춘다.
   */
  const [communityName, setCommunityName] = useState<string>(() => getCommunity()?.name || "말씀나눔");
  /**
   * 머리말에 적는 문구 — 등록된 이름 뒤에 '공동체'를 붙인다.
   * 이미 '공동체'로 끝나는 이름이면 그대로 둔다 (두 번 붙지 않게).
   */
  const brandTitle = communityName.trim().endsWith("공동체")
    ? communityName
    : `${communityName} 공동체`;
  /**
   * 성경읽기 챌린지가 도는 중인지.
   * 도는 동안에는 감사·칭찬 탭 자리에 챌린지 탭이 들어선다.
   * 챌린지가 끝나면 그 다음 날 감사 탭이 돌아온다 (서버가 날짜로 판정한다).
   */
  const [challengeOn, setChallengeOn] = useState<boolean>(false);
  /** 처음 들어오신 분께 보여드리는 앱 사용 안내 */
  const [guideOpen, setGuideOpen] = useState<boolean>(false);

  const refreshChallenge = React.useCallback(() => {
    fetch("/api/challenges/current")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => setChallengeOn(!!c?.challenge))
      .catch(() => {});
  }, []);
  // 주소에 실려 온 ?tab= 은 한 번만 읽는다 (아래에서 지워지기 전에 값을 잡아 둔다).
  const urlTabRef = React.useRef<TabType | null>(tabFromUrl());
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const t = urlTabRef.current;
    return t && t !== 'settings' ? t : 'notice';
  });
  /**
   * 설정 화면은 이제 탭이 아니라 머리말 톱니바퀴로 들어가는 별도 화면이다.
   * (하단 탭에서 빼서 '나의 기록'과 분리 — 실제 화면 목적이 다르다)
   */
  const [showSettings, setShowSettings] = useState<boolean>(() => urlTabRef.current === 'settings');

  // Prefilled Bible Verse state for writing meditation
  const [prefilledVerse, setPrefilledVerse] = useState<{ title: string; text: string } | null>(null);
  // 성경통독에서 열어야 할 구절 (오늘 말씀에서 넘어올 때 사용)
  const [bibleQuery, setBibleQuery] = useState<{ query: string; nonce: number }>({ query: "", nonce: 0 });

  useEffect(() => {
    if (!currentUser) return;
    fetchAllUsers();
    refreshChallenge();
    // 아직 안 보신 분께 한 번만. (지금은 시험 중이라 관리자에게만)
    const forMe = !GUIDE_FOR_ADMIN_ONLY || currentUser.role === "admin";
    if (forMe && !guideSeen()) setGuideOpen(true);
    fetch("/api/communities/mine")
      .then((r) => (r.ok ? r.json() : null))
      .then((c) => {
        if (!c?.name) return;
        setCommunityName(c.name);
        saveCommunity({ id: c.id, name: c.name });
      })
      .catch(() => {});
  }, [currentUser]);

  /**
   * 지금 보여줄 탭 순서.
   * 감사칭찬은 성경통독 다음, 나의기록 앞에 둔다.
   * 챌린지가 돌면 그 감사 자리에 들어선다.
   */
  const visibleTabs: TabType[] = React.useMemo(() => {
    const tabs: TabType[] = ["notice", "feed", "bible", challengeOn ? "challenge" : "gratitude", "my"];
    if (SHOW_QNA_TAB) tabs.push("qna");
    return tabs;
  }, [challengeOn]);

  const openTab = (tab: TabType) => {
    setActiveTab(tab);
    setPrefilledVerse(null);
    setShowSettings(false); // 설정 화면에서 다른 탭으로 넘어가면 설정은 닫는다
    window.scrollTo({ top: 0 });
  };

  /**
   * 화면을 좌우로 밀어 옆 탭으로 넘어간다 (성경 본문을 밀어 장을 넘기는 것과 같은 동작).
   *
   * ⚠️ 성경통독의 본문 상자는 **스스로** 좌우 밀기를 쓴다(장 넘기기).
   *    거기서 시작한 손짓까지 여기서 받으면 장도 넘어가고 탭도 넘어간다.
   *    그래서 data-no-tab-swipe 가 붙은 곳에서 시작한 손짓은 흘려보낸다.
   */
  const tabIndex = visibleTabs.indexOf(activeTab);
  const skipSwipe = React.useRef(false);
  const rawTabSwipe = useSwipe({
    onSwipeLeft: () => {
      if (tabIndex >= 0 && tabIndex < visibleTabs.length - 1) openTab(visibleTabs[tabIndex + 1]);
    },
    onSwipeRight: () => {
      if (tabIndex > 0) openTab(visibleTabs[tabIndex - 1]);
    },
    canSwipeLeft: tabIndex >= 0 && tabIndex < visibleTabs.length - 1,
    canSwipeRight: tabIndex > 0
  });

  const tabSwipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      const el = e.target as HTMLElement | null;
      skipSwipe.current = !!el?.closest?.("[data-no-tab-swipe]");
      if (skipSwipe.current) return;
      rawTabSwipe.swipeHandlers.onTouchStart(e);
    },
    onTouchMove: (e: React.TouchEvent) => {
      if (skipSwipe.current) return;
      rawTabSwipe.swipeHandlers.onTouchMove(e);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (skipSwipe.current) {
        skipSwipe.current = false;
        return;
      }
      rawTabSwipe.swipeHandlers.onTouchEnd(e);
    }
  };

  // 지금 안 보이는 탭에 머물러 있으면 (챌린지가 시작/종료된 순간) 첫 탭으로 옮긴다.
  // 다만 관리자는 챌린지가 없을 때도 그 화면에 들어갈 수 있다 — 거기서 시작하기 때문.
  useEffect(() => {
    const allowed = activeTab === "challenge" && currentUser?.role === "admin";
    if (!visibleTabs.includes(activeTab) && !allowed) setActiveTab("notice");
  }, [visibleTabs, activeTab, currentUser]);

  // Q&A 를 숨긴 상태에서 이전 세션의 활성 탭이 qna 로 남아 빈 화면이 되는 것 방지
  useEffect(() => {
    if (!SHOW_QNA_TAB && activeTab === 'qna') setActiveTab('notice');
  }, [activeTab]);

  // 알림을 눌러 들어온 경우
  useEffect(() => {
    // ① 주소에 남은 ?tab= 은 한 번 쓰고 지운다.
    //    (안 지우면 나중에 새로고침할 때마다 그 탭으로 되돌아간다)
    if (tabFromUrl()) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    // ② 앱이 이미 열려 있던 경우엔 새로고침 대신 서비스워커가 탭만 알려준다.
    if (!("serviceWorker" in navigator)) return;
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === "open-tab" && isTabKey(e.data.tab)) {
        if (e.data.tab === 'settings') {
          setShowSettings(true);
        } else {
          setActiveTab(e.data.tab);
          setShowSettings(false);
        }
        window.scrollTo({ top: 0 });
        // 잘 받았다고 알려줘야 서비스워커가 새로고침을 생략한다
        e.ports?.[0]?.postMessage({ ok: true });
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);
    return () => navigator.serviceWorker.removeEventListener("message", handleMessage);
  }, []);

  const fetchAllUsers = async () => {
    try {
      const res = await fetch("/api/auth/users");
      if (res.ok) {
        const data: { id: string; name: string; role: 'admin' | 'member' }[] = await res.json();
        setAllUsers(data);

        // Auto-sync current user profile if name or role changed by user or admin
        if (currentUser) {
          const updatedSelf = data.find(u => u.id === currentUser.id);
          if (updatedSelf) {
            if (updatedSelf.name !== currentUser.name || updatedSelf.role !== currentUser.role) {
              const syncedUser: UserProfile = { id: updatedSelf.id, name: updatedSelf.name, role: updatedSelf.role };
              setCurrentUser(syncedUser);
              localStorage.setItem("bible_med_user", JSON.stringify(syncedUser));
            }
          } else {
            // Account was deleted, clear session
            setCurrentUser(null);
            localStorage.removeItem("bible_med_user");
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch all users:", err);
    }
  };

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    localStorage.setItem("bible_med_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    if (confirm("로그아웃 하시겠습니까?")) {
      clearToken();
      setCurrentUser(null);
      localStorage.removeItem("bible_med_user");
      // 공동체는 기억해 둔다. 다시 들어올 때 코드를 또 넣지 않아도 되도록.
      // (다른 공동체로 옮기려면 로그인 화면 아래의 '다른 공동체로 들어가기')
    }
  };

  const handleSelectVerseForMeditation = (verseTitle: string, verseText: string) => {
    setPrefilledVerse({ title: verseTitle, text: verseText });
    setActiveTab('feed'); // Transition back to meditation feed/form
  };

  const handleVerseFromNotice = (verseTitle: string) => {
    // 오늘 말씀의 그 장을 성경통독에서 바로 펼친다 (이어서 다음 장으로 넘길 수 있게).
    // 같은 구절을 다시 눌러도 열리도록 번호를 함께 올린다.
    setPrefilledVerse(null);
    setBibleQuery((prev) => ({ query: verseTitle, nonce: prev.nonce + 1 }));
    setActiveTab('bible');
  };

  if (!currentUser) {
    return (
      <>
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
        <PWAInstallPrompt />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#14261E] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10 font-sans">
      <PWAInstallPrompt />
      {/* 처음 오신 분께 탭을 하나씩 소개한다 (건너뛸 수 있다) */}
      {guideOpen && <AppGuide onClose={() => setGuideOpen(false)} />}
      {/* 접속 시 하루 한 번, 나눔·통독 진행률을 상기시켜 준다.
          안내를 보는 동안에는 겹치지 않게 미뤄 둔다 */}
      {!guideOpen && <GoalSummaryPopup currentUser={currentUser} />}
      {/* Dynamic Header — 공동체 이름만 담백하게, 계정 관련은 톱니(설정)로 옮겼다.
          시안처럼 아래 흰 시트가 이 머리말 위로 겹쳐 올라와야 하므로 sticky 를 쓰지 않는다
          (sticky + z-40 이면 머리말이 시트 위에 그려져 겹침이 안 보인다) */}
      <header className="relative z-0 bg-gradient-to-br from-[#2F7358] to-[#153A2B] text-white">
        <div className="max-w-4xl mx-auto px-[18px] pt-11 pb-8 flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <BrandMark size={16} className="shrink-0 text-[#F2F6F3]/85" />
            <h1 className="text-xs font-semibold tracking-[0.02em] truncate text-[#F2F6F3]/90">
              {brandTitle}
            </h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition cursor-pointer shrink-0"
              title="설정"
            >
              <Settings size={16} />
            </button>

            <div className="w-8 h-8 rounded-full bg-[#FFBA00] text-[#4A3600] font-bold text-xs flex items-center justify-center shrink-0">
              {currentUser.name.slice(0, 1)}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container — 머리말 위로 살짝 겹쳐 올라오는 흰 시트 (시안의 .sheet).
          안쪽 여백은 시안 값 그대로(22px 18px 30px) — 이 하나로 모든 글의 왼쪽 선을 맞춘다.
          각 화면이 따로 좌우 여백을 더하지 않아야 제목·본문·버튼이 같은 선에서 시작한다. */}
      <main className="relative z-10 -mt-[18px] bg-white rounded-t-[22px] max-w-4xl mx-auto px-[18px] pt-[22px] pb-[30px]">
        {showSettings ? (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="w-9 h-9 rounded-full bg-[#F9F9F9] hover:bg-[#F0F0F0] flex items-center justify-center text-[#14261E] transition cursor-pointer shrink-0"
                aria-label="나의 기록으로 돌아가기"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="min-w-0">
                <h2 className="font-bold text-xl sm:text-2xl text-[#0C3B2E]">설정</h2>
                <p className="text-xs sm:text-sm text-[#6F8377] mt-0.5">글씨 크기 · 알림 · 우리 공동체</p>
              </div>
            </div>

            {/* 계정 — 이름·역할, 로그아웃 (예전엔 머리말에 있던 것) */}
            <div>
              <p className="text-2xs font-bold text-[#6F8377] tracking-wider mb-2.5 ml-1.5">계정</p>
              <div className="bg-[#F9F9F9] rounded-3xl px-3.5">
                <div className="flex items-center gap-3 py-3.5">
                  <span className="w-9 h-9 rounded-full bg-[#D2DDD3] text-[#4A6B57] flex items-center justify-center shrink-0 font-bold text-xs">
                    {currentUser.name.slice(-1)}
                  </span>
                  <span className="flex-1 min-w-0 text-sm font-bold text-[#14261E] truncate">
                    {currentUser.name} {currentUser.role === 'admin' ? '(관리자)' : '성도님'}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-bold py-2 px-3.5 rounded-3xl bg-white text-[#6F8377] hover:text-[#0C3B2E] hover:bg-[#F0F0F0] transition cursor-pointer"
                  >
                    <LogOut size={14} />
                    로그아웃
                  </button>
                </div>
              </div>
            </div>

            {/* 안내 */}
            <div>
              <p className="text-2xs font-bold text-[#6F8377] tracking-wider mb-2.5 ml-1.5">안내</p>
              <div className="bg-[#F9F9F9] rounded-3xl px-3.5">
                <button
                  onClick={() => setGuideOpen(true)}
                  className="w-full flex items-center gap-3 py-3.5 text-left cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-full bg-[#D2DDD3] text-[#4A6B57] flex items-center justify-center shrink-0">
                    <HelpCircle size={17} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-bold text-[#14261E] text-sm">앱 사용법 다시 보기</span>
                    <span className="block text-2xs text-[#6F8377] mt-0.5">각 탭이 무엇을 하는 곳인지 안내해 드립니다</span>
                  </span>
                  <ChevronRight size={17} className="text-[#6F8377] shrink-0" />
                </button>

                {currentUser.role === "admin" && !challengeOn && (
                  <button
                    onClick={() => openTab('challenge')}
                    className="w-full flex items-center gap-3 py-3.5 text-left cursor-pointer border-t border-[#F0F0F0]"
                  >
                    <span className="w-9 h-9 rounded-full bg-[#D2DDD3] text-[#4A6B57] flex items-center justify-center shrink-0">
                      <Trophy size={16} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-bold text-[#14261E] text-sm">성경읽기 챌린지 시작하기</span>
                      <span className="block text-2xs text-[#6F8377] mt-0.5">
                        시작하면 탭이 하나 생기고 감사·칭찬은 잠시 접힙니다
                      </span>
                    </span>
                    <ChevronRight size={17} className="text-[#6F8377] shrink-0" />
                  </button>
                )}
              </div>
            </div>

            <CommunitySettings currentUser={currentUser} onRenamed={setCommunityName} />
            <NotificationSettings
              currentUser={currentUser}
              onUserUpdate={(updatedUser) => {
                setCurrentUser(updatedUser);
                localStorage.setItem("bible_med_user", JSON.stringify(updatedUser));
              }}
              onAccountDeleted={() => {
                setCurrentUser(null);
                localStorage.removeItem("bible_med_user");
              }}
            />
          </div>
        ) : (
        <>
        {/* PC 탭 — 아래 모바일 바와 같은 목록(visibleTabs)에서 그린다 */}
        <div
          className="hidden md:grid gap-1.5 bg-[#F9F9F9] p-1 rounded-3xl"
          style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}
        >
          {visibleTabs.map((key) => {
            const t = TAB_DEFS[key];
            const on = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => openTab(key)}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-3xl text-xs font-bold transition cursor-pointer ${
                  on ? "grad-forest text-white" : "text-[#6F8377] hover:text-[#0C3B2E]"
                }`}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>


        {/* Selected View Window */}
        <div
          id="view-portal"
          className="min-h-[50vh] overflow-x-hidden"
          style={{ touchAction: "pan-y" }}
          {...tabSwipeHandlers}
        >
          <div ref={rawTabSwipe.dragRef}>
          <AnimatePresence mode="wait">
            {activeTab === 'notice' && (
              <motion.div
                key="notice-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <DailyNotice 
                  currentUser={currentUser} 
                  allUsers={allUsers} 
                  onVerseSelect={handleVerseFromNotice}
                  onSelectVerseForMeditation={handleSelectVerseForMeditation} 
                />
              </motion.div>
            )}

            {activeTab === 'feed' && (
              <motion.div
                key="feed-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <MeditationFeed 
                  currentUser={currentUser} 
                  allUsers={allUsers}
                  prefilledVerse={prefilledVerse}
                  onClearPrefilledVerse={() => setPrefilledVerse(null)}
                />
              </motion.div>
            )}

            {activeTab === 'gratitude' && (
              <motion.div
                key="gratitude-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <DailyGratitude currentUser={currentUser} allUsers={allUsers} />
              </motion.div>
            )}

            {activeTab === 'challenge' && (
              <motion.div
                key="challenge-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <ChallengeTab
                  currentUser={currentUser}
                  onOpenBible={(query) => {
                    // 챌린지에서 "○장 읽으러 가기" 를 누르면 통독 탭이 그 장을 펴 준다
                    setBibleQuery({ query, nonce: Date.now() });
                    setActiveTab('bible');
                    window.scrollTo({ top: 0 });
                  }}
                  onChanged={refreshChallenge}
                />
              </motion.div>
            )}

            {activeTab === 'bible' && (
              <motion.div
                key="bible-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <BibleReader
                  currentUser={currentUser}
                  onSelectVerseForMeditation={handleSelectVerseForMeditation}
                  initialQuery={bibleQuery.query}
                  queryNonce={bibleQuery.nonce}
                />
              </motion.div>
            )}


            {activeTab === 'my' && (
              <motion.div
                key="my-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <MyMeditations currentUser={currentUser} />
              </motion.div>
            )}

            {SHOW_QNA_TAB && activeTab === 'qna' && (
              <motion.div
                key="qna-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                <BibleQnA currentUser={currentUser} />
              </motion.div>
            )}

          </AnimatePresence>
          </div>
        </div>
        </>
        )}
      </main>

      {/* 모바일 하단 바 — 위 PC 탭과 같은 목록에서 그린다. 설정 화면에서는 숨긴다(탭이 아니므로) */}
      {!showSettings && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#DEE3E6] px-1 pt-2 flex items-stretch overflow-x-auto pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {visibleTabs.map((key) => {
            const t = TAB_DEFS[key];
            const on = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => openTab(key)}
                className={`flex-1 flex flex-col items-center gap-[3px] px-0.5 py-1.5 transition cursor-pointer min-w-[50px] ${
                  on ? "text-[#226347]" : "text-[#6F8377]"
                }`}
              >
                <t.icon size={19} className={on ? "-translate-y-px" : ""} />
                <span className="text-2xs font-semibold">{t.short}</span>
                {/* 지금 보고 있는 탭에만 켜지는 작은 금색 점 (시안의 .dot-active) */}
                <span className={`w-1 h-1 rounded-full bg-[#FFBA00] transition-opacity ${on ? "opacity-100" : "opacity-0"}`} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
