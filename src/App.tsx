import React, { useState, useEffect } from "react";
import { BookOpen, Calendar, Bell, LogOut, UserCheck, MessageSquare, Sparkles, BookMarked, HeartHandshake, HelpCircle } from "lucide-react";
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

interface UserProfile {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

type TabType = 'notice' | 'feed' | 'gratitude' | 'bible' | 'my' | 'qna' | 'settings';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem("bible_med_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [allUsers, setAllUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('notice');

  // Prefilled Bible Verse state for writing meditation
  const [prefilledVerse, setPrefilledVerse] = useState<{ title: string; text: string } | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchAllUsers();
    }
  }, [currentUser]);

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
    // Navigate to Bible search and automatically lookup this verse
    setPrefilledVerse(null); // Clear prefill
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
    <div className="min-h-screen bg-[#FAFAFA] text-[#1F2A29] pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-10 font-sans">
      <PWAInstallPrompt />
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-[#E4E8E7] shadow-sm">
        <div className="max-w-4xl mx-auto px-2.5 sm:px-4 py-2.5 flex justify-between items-center gap-1.5">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#E8EFEE] rounded-xl flex items-center justify-center text-[#004643] shrink-0">
              <BookMarked size={18} className="sm:w-5 sm:h-5" />
            </div>
            <div className="shrink-0">
              <h1 className="font-bold text-base sm:text-lg text-[#004643] tracking-tight leading-none whitespace-nowrap">은혜교회</h1>
              <span className="text-2xs sm:text-2xs text-[#4A5654] font-bold uppercase tracking-wider block whitespace-nowrap">말씀 묵상 나눔방</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            {/* Font Size Selector for Adults & Seniors */}
            <FontSizeControl />

            {/* Profile badge */}
            <div className="flex items-center gap-1.5 bg-[#F2F4F3] border border-[#E4E8E7] px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl text-2xs sm:text-xs text-[#4A5654] whitespace-nowrap">
              <div className="w-5 h-5 sm:w-6 sm:h-6 bg-[#004643] text-white font-bold rounded-full flex items-center justify-center text-2xs sm:text-2xs shrink-0">
                {currentUser.name.slice(-2)}
              </div>
              <span className="font-bold text-[#4A5654] truncate max-w-[80px] sm:max-w-none">
                {currentUser.name} {currentUser.role === 'admin' ? '(관리자)' : '성도님'}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="p-1.5 text-[#7F8C8A] hover:text-[#004643] hover:bg-[#F2F4F3] rounded-2xl transition cursor-pointer shrink-0"
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
        <div className="hidden md:grid grid-cols-7 gap-1.5 border-b border-[#E4E8E7] bg-[#F2F4F3] p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab('notice')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'notice' ? "bg-[#004643] text-white shadow-sm" : "text-[#7F8C8A] hover:text-[#004643]"
            }`}
          >
            <BookOpen size={15} />
            오늘 말씀
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'feed' ? "bg-[#004643] text-white shadow-sm" : "text-[#7F8C8A] hover:text-[#004643]"
            }`}
          >
            <MessageSquare size={15} />
            묵상 나눔
          </button>
          <button
            onClick={() => setActiveTab('gratitude')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'gratitude' ? "bg-[#004643] text-white shadow-sm" : "text-[#7F8C8A] hover:text-[#004643]"
            }`}
          >
            <HeartHandshake size={15} className={activeTab === 'gratitude' ? "text-[#FFFFFF]" : "text-[#4A5654]"} />
            오늘의 감사
          </button>
          <button
            onClick={() => setActiveTab('bible')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'bible' ? "bg-[#004643] text-white shadow-sm" : "text-[#7F8C8A] hover:text-[#004643]"
            }`}
          >
            <BookMarked size={15} />
            성경 읽기방
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'my' ? "bg-[#004643] text-white shadow-sm" : "text-[#7F8C8A] hover:text-[#004643]"
            }`}
          >
            <Calendar size={15} />
            나의 기록
          </button>
          <button
            onClick={() => setActiveTab('qna')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'qna' ? "bg-[#004643] text-white shadow-sm" : "text-[#7F8C8A] hover:text-[#004643]"
            }`}
          >
            <HelpCircle size={15} />
            성경 Q&A
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
              activeTab === 'settings' ? "bg-[#004643] text-white shadow-sm" : "text-[#7F8C8A] hover:text-[#004643]"
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
                  onVerseSelect={(verse) => handleSelectVerseForMeditation(verse, "")} 
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

            {activeTab === 'qna' && (
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E4E8E7] shadow-[0_-2px_15px_rgba(0,49,31,0.06)] px-1 pt-1 flex items-center justify-around overflow-x-auto pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => {
            setActiveTab('notice');
            setPrefilledVerse(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'notice' ? "text-[#004643]" : "text-[#7F8C8A]"
          }`}
        >
          <BookOpen size={17} />
          <span className="text-2xs font-bold mt-0.5">오늘말씀</span>
        </button>

        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'feed' ? "text-[#004643]" : "text-[#7F8C8A]"
          }`}
        >
          <MessageSquare size={17} />
          <span className="text-2xs font-bold mt-0.5">묵상나눔</span>
        </button>

        <button
          onClick={() => setActiveTab('gratitude')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'gratitude' ? "text-[#004643] font-extrabold" : "text-[#7F8C8A]"
          }`}
        >
          <HeartHandshake size={17} className={activeTab === 'gratitude' ? "text-[#4A5654]" : ""} />
          <span className="text-2xs font-bold mt-0.5">오늘감사</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('bible');
            setPrefilledVerse(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'bible' ? "text-[#004643]" : "text-[#7F8C8A]"
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
          className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'my' ? "text-[#004643]" : "text-[#7F8C8A]"
          }`}
        >
          <Calendar size={17} />
          <span className="text-2xs font-bold mt-0.5">나의기록</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('qna');
            setPrefilledVerse(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'qna' ? "text-[#004643] font-extrabold" : "text-[#7F8C8A]"
          }`}
        >
          <HelpCircle size={17} className={activeTab === 'qna' ? "text-[#4A5654]" : ""} />
          <span className="text-2xs font-bold mt-0.5">성경Q&A</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('settings');
            setPrefilledVerse(null);
          }}
          className={`flex flex-col items-center justify-center p-1.5 rounded-2xl transition cursor-pointer min-w-[50px] ${
            activeTab === 'settings' ? "text-[#004643]" : "text-[#7F8C8A]"
          }`}
        >
          <Bell size={17} />
          <span className="text-2xs font-bold mt-0.5">알림설정</span>
        </button>
      </div>
    </div>
  );
}
