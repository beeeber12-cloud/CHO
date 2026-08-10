import React, { useState, useEffect } from "react";
import { BookOpen, Calendar, Bell, LogOut, UserCheck, MessageSquare, Sparkles, BookMarked, HeartHandshake, HelpCircle, Cross } from "lucide-react";
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

interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

type TabType = 'notice' | 'feed' | 'gratitude' | 'bible' | 'my' | 'qna' | 'settings';

const TAB_KEYS: TabType[] = ['notice', 'feed', 'gratitude', 'bible', 'my', 'qna', 'settings'];

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

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("bible_med_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [allUsers, setAllUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>(() => tabFromUrl() || 'notice');

  // Prefilled Bible Verse state for writing meditation
  const [prefilledVerse, setPrefilledVerse] = useState<{ title: string; text: string } | null>(null);
  // 성경통독에서 열어야 할 구절 (오늘 말씀에서 넘어올 때 사용)
  const [bibleQuery, setBibleQuery] = useState<{ query: string; nonce: number }>({ query: "", nonce: 0 });

  useEffect(() => {
    if (currentUser) {
      fetchAllUsers();
    }
  }, [currentUser]);

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
      setCurrentUser(null);
      localStorage.removeItem("bible_med_user");
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
      {/* 접속 시 하루 한 번, 나눔·통독 진행률을 상기시켜 준다 */}
      <GoalSummaryPopup currentUser={currentUser} />
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E3E9E2] shadow-sm">
        <div className="max-w-4xl mx-auto px-2.5 sm:px-4 py-2.5 flex justify-between items-center gap-1.5">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#F5F5F5] rounded-xl flex items-center justify-center text-[#0C3B2E] shrink-0">
              <Cross size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="shrink-0">
              <h1 className="font-bold text-base sm:text-lg text-[#0C3B2E] tracking-tight leading-none whitespace-nowrap">은혜교회</h1>
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
        {/* PC Desktop Tabs Grid */}
        <div className={`hidden md:grid ${SHOW_QNA_TAB ? "grid-cols-7" : "grid-cols-6"} gap-1.5 border-b border-[#E3E9E2] bg-[#F5F5F5] p-1 rounded-3xl`}>
          <button
            onClick={() => setActiveTab('notice')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-3xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'notice' ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#6F8377] hover:text-[#0C3B2E]"
            }`}
          >
            <BookOpen size={15} />
            오늘 말씀
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-3xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'feed' ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#6F8377] hover:text-[#0C3B2E]"
            }`}
          >
            <MessageSquare size={15} />
            묵상 나눔
          </button>
          <button
            onClick={() => setActiveTab('gratitude')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-3xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'gratitude' ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#6F8377] hover:text-[#0C3B2E]"
            }`}
          >
            <HeartHandshake size={15} className={activeTab === 'gratitude' ? "text-[#FFFFFF]" : "text-[#4A6B57]"} />
            감사칭찬
          </button>
          <button
            onClick={() => setActiveTab('bible')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-3xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'bible' ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#6F8377] hover:text-[#0C3B2E]"
            }`}
          >
            <BookMarked size={15} />
            성경 읽기방
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-3xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'my' ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#6F8377] hover:text-[#0C3B2E]"
            }`}
          >
            <Calendar size={15} />
            나의 기록
          </button>
          {SHOW_QNA_TAB && (
            <button
              onClick={() => setActiveTab('qna')}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-3xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'qna' ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#6F8377] hover:text-[#0C3B2E]"
              }`}
            >
              <HelpCircle size={15} />
              성경 Q&A
            </button>
          )}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-3xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'settings' ? "bg-[#0C3B2E] text-white shadow-sm" : "text-[#6F8377] hover:text-[#0C3B2E]"
            }`}
          >
            <Bell size={15} />
            알림 설정
          </button>
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
                <DailyGratitude currentUser={currentUser} />
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

      {/* Mobile Sticky Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E3E9E2] shadow-[0_-2px_15px_rgba(0,49,31,0.06)] px-1 pt-1 flex items-center justify-around overflow-x-auto pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => {
            setActiveTab('notice');
            setPrefilledVerse(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-3xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'notice' ? "text-[#0C3B2E]" : "text-[#6F8377]"
          }`}
        >
          <BookOpen size={17} />
          <span className="text-2xs font-bold mt-0.5">오늘말씀</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-3xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'feed' ? "text-[#0C3B2E]" : "text-[#6F8377]"
          }`}
        >
          <MessageSquare size={17} />
          <span className="text-2xs font-bold mt-0.5">묵상나눔</span>
        </button>

        <button
          onClick={() => setActiveTab('gratitude')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-3xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'gratitude' ? "text-[#0C3B2E] font-extrabold" : "text-[#6F8377]"
          }`}
        >
          <HeartHandshake size={17} className={activeTab === 'gratitude' ? "text-[#4A6B57]" : ""} />
          <span className="text-2xs font-bold mt-0.5">감사칭찬</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('bible');
            setPrefilledVerse(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-3xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'bible' ? "text-[#0C3B2E]" : "text-[#6F8377]"
          }`}
        >
          <BookMarked size={17} />
          <span className="text-2xs font-bold mt-0.5">성경통독</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('my');
            setPrefilledVerse(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-3xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'my' ? "text-[#0C3B2E]" : "text-[#6F8377]"
          }`}
        >
          <Calendar size={17} />
          <span className="text-2xs font-bold mt-0.5">나의기록</span>
        </button>

        {SHOW_QNA_TAB && (
          <button
            onClick={() => {
              setActiveTab('qna');
              setPrefilledVerse(null);
            }}
            className={`flex flex-col items-center justify-center p-1.5 rounded-3xl transition cursor-pointer min-w-[50px] ${
              activeTab === 'qna' ? "text-[#0C3B2E] font-extrabold" : "text-[#6F8377]"
            }`}
          >
            <HelpCircle size={17} className={activeTab === 'qna' ? "text-[#4A6B57]" : ""} />
            <span className="text-2xs font-bold mt-0.5">성경Q&A</span>
          </button>
        )}

        <button
          onClick={() => {
            setActiveTab('settings');
            setPrefilledVerse(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-3xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'settings' ? "text-[#0C3B2E]" : "text-[#6F8377]"
          }`}
        >
          <Bell size={17} />
          <span className="text-2xs font-bold mt-0.5">알림설정</span>
        </button>
      </div>
    </div>
  );
}
