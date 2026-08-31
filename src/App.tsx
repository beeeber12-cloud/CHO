import React, { useState, useEffect } from "react";
import { BookOpen, Calendar, Bell, LogOut, MessageSquare, BookMarked, HeartHandshake, HelpCircle, Cross, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LoginScreen from "./components/LoginScreen";
import DailyNotice from "./components/DailyNotice";
import BibleReader from "./components/BibleReader";
import MeditationFeed from "./components/MeditationFeed";
import DailyGratitude from "./components/DailyGratitude";
import BibleQnA from "./components/BibleQnA";
import NotificationSettings from "./components/NotificationSettings";
import MyMeditations from "./components/MyMeditations";
import FontSizeControl from "./components/FontSizeControl";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import GoalSummaryPopup from "./components/GoalSummaryPopup";
import CommunitySettings from "./components/CommunitySettings";
import ChallengeTab from "./components/ChallengeTab";
import AppGuide, { guideSeen } from "./components/AppGuide";
import { clearToken, getCommunity, saveCommunity } from "./lib/session";

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
const TAB_DEFS: Record<TabType, { label: string; short: string; icon: typeof BookOpen }> = {
  notice:    { label: "오늘 말씀",   short: "오늘말씀", icon: BookOpen },
  gratitude: { label: "감사칭찬",    short: "감사칭찬", icon: HeartHandshake },
  challenge: { label: "챌린지",      short: "챌린지",   icon: Trophy },
  feed:      { label: "묵상 나눔",   short: "묵상나눔", icon: MessageSquare },
  bible:     { label: "성경 읽기방", short: "성경통독", icon: BookMarked },
  my:        { label: "나의 기록",   short: "나의기록", icon: Calendar },
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
  const [activeTab, setActiveTab] = useState<TabType>(() => tabFromUrl() || 'notice');

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
   * 감사칭찬을 묵상나눔보다 앞에 둔다(자리 교체). 챌린지가 돌면 감사 자리에 들어선다.
   */
  const visibleTabs: TabType[] = React.useMemo(() => {
    const tabs: TabType[] = ["notice", challengeOn ? "challenge" : "gratitude", "feed", "bible", "my"];
    if (SHOW_QNA_TAB) tabs.push("qna");
    tabs.push("settings");
    return tabs;
  }, [challengeOn]);

  const openTab = (tab: TabType) => {
    setActiveTab(tab);
    setPrefilledVerse(null);
    window.scrollTo({ top: 0 });
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
        setActiveTab(e.data.tab);
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
    <div className="min-h-screen bg-[#F0F0F0] text-[#14261E] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10 font-sans">
      <PWAInstallPrompt />
      {/* 처음 오신 분께 탭을 하나씩 소개한다 (건너뛸 수 있다) */}
      {guideOpen && <AppGuide onClose={() => setGuideOpen(false)} />}
      {/* 접속 시 하루 한 번, 나눔·통독 진행률을 상기시켜 준다.
          안내를 보는 동안에는 겹치지 않게 미뤄 둔다 */}
      {!guideOpen && <GoalSummaryPopup currentUser={currentUser} />}
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E3E9E2] shadow-sm">
        <div className="max-w-4xl mx-auto px-2.5 sm:px-4 py-2.5 flex justify-between items-center gap-1.5">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F5F5F5] rounded-xl flex items-center justify-center text-[#0C3B2E] shrink-0">
              <Cross size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="shrink-0">
              <h1 className="font-bold text-base sm:text-lg text-[#0C3B2E] tracking-tight leading-none whitespace-nowrap">{communityName}</h1>
              <span className="text-2xs sm:text-2xs text-[#4A6B57] font-bold uppercase tracking-wider block whitespace-nowrap">말씀 묵상 나눔방</span>
            </div>
          </div>

          {/* min-w-0 이 있어야 안쪽 이름이 줄어들 수 있어 헤더가 화면 밖으로 밀리지 않는다 */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 justify-end">
            {/* Font Size Selector for Adults & Seniors */}
            <FontSizeControl />

            {/* Profile badge */}
            <div className="flex items-center gap-1.5 bg-[#F5F5F5] px-2 sm:px-3 py-1 sm:py-1.5 rounded-3xl text-2xs sm:text-xs text-[#4A6B57] min-w-0">
              <span className="font-bold text-[#4A6B57] truncate">
                {currentUser.name} {currentUser.role === 'admin' ? '(관리자)' : '성도님'}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-1.5 text-[#6F8377] hover:text-[#0C3B2E] hover:bg-[#F5F5F5] rounded-3xl transition cursor-pointer shrink-0"
              title="로그아웃"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-1 sm:px-4 py-2 sm:py-6">
        {/* PC 탭 — 아래 모바일 바와 같은 목록(visibleTabs)에서 그린다 */}
        <div
          className="hidden md:grid gap-1.5 border-b border-[#E3E9E2] bg-[#F5F5F5] p-1 rounded-3xl"
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
                  on ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#6F8377] hover:text-[#0C3B2E]"
                }`}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>


        {/* Selected View Window */}
        <div id="view-portal" className="min-h-[50vh]">
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

            {activeTab === 'settings' && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
              >
                {/* 안내를 놓치셨거나 다시 보고 싶을 때 */}
                <div className="bg-white rounded-3xl sm:rounded-[32px] shadow-sm p-3.5 sm:p-6 mb-3 sm:mb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-[#F5F5F5] text-[#0C3B2E] rounded-2xl shrink-0">
                        <HelpCircle size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="block font-bold text-[#14261E] text-sm">앱 사용법</span>
                        <p className="text-2xs text-[#6F8377]">각 탭이 무엇을 하는 곳인지 안내해 드립니다</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setGuideOpen(true)}
                      className="shrink-0 text-xs font-bold py-2 px-4 rounded-3xl bg-[#F5F5F5] text-[#4A6B57] hover:bg-[#D2DDD3] transition cursor-pointer"
                    >
                      다시 보기
                    </button>
                  </div>
                </div>

                {currentUser.role === "admin" && !challengeOn && (
                  <div className="bg-white rounded-3xl sm:rounded-[32px] shadow-sm p-3.5 sm:p-6 mb-3 sm:mb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-[#F5F5F5] text-[#0C3B2E] rounded-2xl shrink-0">
                          <Trophy size={18} />
                        </div>
                        <div className="min-w-0">
                          <span className="block font-bold text-[#14261E] text-sm">성경읽기 챌린지</span>
                          <p className="text-2xs text-[#6F8377]">
                            시작하면 탭이 하나 생기고 감사·칭찬은 잠시 접힙니다
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => openTab('challenge')}
                        className="shrink-0 text-xs font-bold py-2 px-4 rounded-3xl bg-[#FFBA00] text-[#0C3B2E] hover:bg-[#E8A900] transition cursor-pointer"
                      >
                        시작하기
                      </button>
                    </div>
                  </div>
                )}
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 모바일 하단 바 — 위 PC 탭과 같은 목록에서 그린다 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E3E9E2] shadow-[0_-2px_15px_rgba(0,49,31,0.06)] px-1 pt-1 flex items-center justify-around overflow-x-auto pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {visibleTabs.map((key) => {
          const t = TAB_DEFS[key];
          const on = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => openTab(key)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-3xl transition cursor-pointer min-w-[50px] ${
                on ? "text-[#0C3B2E]" : "text-[#6F8377]"
              }`}
            >
              <t.icon size={17} className={on ? "text-[#4A6B57]" : ""} />
              <span className="text-2xs font-bold mt-0.5">{t.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
