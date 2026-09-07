import React, { useState, useEffect } from "react";
import { WeeklySummary } from "../types";
import { Sparkles, Calendar, BookOpen, Clock, Loader, MessageSquareQuote, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WeeklySummarizerProps {
  currentUser: { id: string; name: string; role: 'admin' | 'member' };
}

export default function WeeklySummarizer({ currentUser }: WeeklySummarizerProps) {
  const [summaries, setSummaries] = useState<WeeklySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [weekLabel, setWeekLabel] = useState<string>("");
  const [daysCount, setDaysCount] = useState<number>(7);
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    fetchSummaries();
  }, []);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/summaries");
      if (res.ok) {
        const data = await res.json();
        setSummaries(data);
      }
    } catch (err) {
      console.error("Failed to load summaries:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    setError("");
    setSuccess("");

    try {
      const label = weekLabel.trim() || `${new Date().getMonth() + 1}월 ${Math.ceil(new Date().getDate() / 7)}주차 묵상 요약`;
      const res = await fetch("/api/summaries/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekLabel: label, daysCount })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("AI 보고서가 성공적으로 생성되었습니다!");
        setSummaries(prev => [data, ...prev]);
        setWeekLabel("");
      } else {
        setError(data.error || "보고서 생성에 실패했습니다. 분석 대상 기간에 묵상 글이 있는지 확인해 주세요.");
      }
    } catch (err) {
      setError("서버 통신 오류가 발생했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  // Helper to parse simple markdown to html tags cleanly
  const renderMarkdown = (text: string) => {
    return text.split("\n").map((line, index) => {
      let trimmed = line.trim();
      if (trimmed.startsWith("###")) {
        return <h4 key={index} className="text-base font-bold text-[#14261E] mt-4 mb-2">{trimmed.replace("###", "").trim()}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={index} className="text-lg font-bold text-[#0C3B2E] mt-5 mb-2.5 border-b border-[#E3E9E2] pb-1">{trimmed.replace("##", "").trim()}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={index} className="text-xl font-bold text-[#0C3B2E] mt-6 mb-3">{trimmed.replace("#", "").trim()}</h2>;
      }
      if (trimmed.startsWith("*") || trimmed.startsWith("-")) {
        const itemText = trimmed.substring(1).trim();
        // Check for sub-bolding like **bold**
        if (itemText.includes("**")) {
          const parts = itemText.split("**");
          return (
            <li key={index} className="ml-4 list-disc text-xs text-[#4A6B57] leading-relaxed py-0.5">
              {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-[#0C3B2E]">{p}</strong> : p)}
            </li>
          );
        }
        return <li key={index} className="ml-4 list-disc text-xs text-[#4A6B57] leading-relaxed py-0.5">{itemText}</li>;
      }
      if (trimmed.includes("**")) {
        const parts = trimmed.split("**");
        return (
          <p key={index} className="text-xs text-[#4A6B57] leading-relaxed my-2">
            {parts.map((p, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-[#0C3B2E]">{p}</strong> : p)}
          </p>
        );
      }
      if (trimmed === "") {
        return <div key={index} className="h-2"></div>;
      }
      return <p key={index} className="text-xs text-[#4A6B57] leading-relaxed my-1.5">{trimmed}</p>;
    });
  };

  return (
    <div className="bg-white rounded-3xl sm:rounded-[32px] shadow-sm p-3.5 sm:p-6">
      <div className="flex items-center gap-2 border-b border-[#E3E9E2] pb-3 mb-4">
        <div className="p-1.5 sm:p-2 bg-[#F5F5F5] text-[#0C3B2E] rounded-3xl shrink-0">
          <Sparkles size={18} />
        </div>
        <div>
          <h3 className="font-bold text-[#0C3B2E] text-base sm:text-lg whitespace-nowrap">AI 주간 묵상 요약방</h3>
          <p className="text-2xs sm:text-xs text-[#6F8377]">성도들이 작성한 묵상을 목회적 은혜 가이드로 자동 요약합니다</p>
        </div>
      </div>

      {/* Generation control panel for Admin */}
      <div className="bg-[#F5F5F5] rounded-3xl sm:rounded-[32px] p-3.5 sm:p-5 mb-5">
        <h4 className="text-sm font-bold text-[#0C3B2E] mb-1 flex items-center">
          <Sparkles className="mr-1 text-[#4A6B57] animate-pulse shrink-0" size={16} />
          {currentUser.role === "admin" ? "새로운 주간 묵상 종합 요약 생성" : "주간 요약 보고서 정보"}
        </h4>
        <p className="text-xs text-[#4A6B57] leading-relaxed mb-4">
          {currentUser.role === "admin" 
            ? "최근 성도들이 작성하여 나눈 개별 묵상 글들의 키워드와 고백, 기도 제목을 분석하여 하나의 종합 보고서로 요약합니다."
            : "우리 소그룹 지체들의 묵상 흐름 and 은혜의 방향을 한눈에 볼 수 있도록 정기적인 주간 요약 보고서가 발행됩니다."
          }
        </p>

        {currentUser.role === "admin" ? (
          <form onSubmit={handleGenerate} className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-2xs font-bold text-[#0C3B2E] uppercase tracking-wider mb-1">보고서 이름 (예: 7월 3주차 종합)</label>
                <input
                  type="text"
                  value={weekLabel}
                  onChange={(e) => setWeekLabel(e.target.value)}
                  placeholder={`${new Date().getMonth() + 1}월 ${Math.ceil(new Date().getDate() / 7)}주차 묵상 종합`}
                  className="w-full text-xs px-3 py-2 bg-[#F5F5F5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4A6B57] text-[#14261E] font-semibold"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-[#0C3B2E] uppercase tracking-wider mb-1">분석 대상 기간 (일 수)</label>
                <select
                  value={daysCount}
                  onChange={(e) => setDaysCount(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 bg-[#F5F5F5] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4A6B57] text-[#14261E] font-semibold cursor-pointer"
                >
                  <option value={3}>최근 3일 동안의 묵상 분석</option>
                  <option value={7}>최근 7일 동안의 묵상 분석 (기본)</option>
                  <option value={14}>최근 14일 동안의 묵상 분석</option>
                  <option value={30}>최근 30일 동안의 묵상 분석</option>
                </select>
              </div>
            </div>

            {error && <p className="text-xs text-[#B3261E] font-semibold bg-[#FDF3F3] p-2 rounded-xl">{error}</p>}
            {success && <p className="text-xs text-[#4A6B57] font-semibold bg-[#F5F5F5] p-2 rounded-xl">{success}</p>}

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={generating}
                className="flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-[#4A6B57] hover:bg-[#072A20] px-4 py-2.5 rounded-3xl shadow-md transition cursor-pointer"
              >
                {generating ? (
                  <>
                    <Loader className="animate-spin" size={14} />
                    AI 목양비서 분석 가동 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    목회적 AI 주간 요약 생성
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-2 text-xs bg-white/70 p-3 rounded-3xl">
            <Check size={16} className="text-[#4A6B57]" />
            <span className="text-[#0C3B2E] font-medium">관리자(목사님/소그룹장) 계정으로 로그인 시 보고서 신규 생성이 활성화됩니다.</span>
          </div>
        )}
      </div>

      {/* Historical Summaries list */}
      <div className="space-y-6">
        <h4 className="text-sm font-bold text-[#14261E] border-b border-[#E3E9E2] pb-2 flex items-center gap-1.5">
          <Calendar size={16} className="text-[#4A6B57]" />
          발행된 묵상 종합 요약 역사 ({summaries.length}건)
        </h4>

        {loading ? (
          <div className="text-center py-10 text-[#6F8377]">
            <Loader className="animate-spin mx-auto text-[#4A6B57] mb-2" size={24} />
            <p className="text-sm">종합 보고서를 불러오고 있습니다...</p>
          </div>
        ) : summaries.length > 0 ? (
          <div className="space-y-5">
            {summaries.map((sum) => (
              <motion.div
                key={sum.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[#F5F5F5]/60 rounded-[32px] p-5 space-y-3"
              >
                <div className="flex justify-between items-start flex-wrap gap-2">
                  <h5 className="font-bold text-base text-[#0C3B2E] flex items-center gap-1.5 font-serif">
                    <MessageSquareQuote size={18} className="text-[#4A6B57]" />
                    {sum.weekLabel}
                  </h5>
                  <div className="flex items-center gap-1 text-2xs text-[#6F8377] font-medium">
                    <Clock size={11} />
                    <span>생성일: {new Date(sum.generatedAt).toLocaleString()}</span>
                  </div>
                </div>

                {/* Markdown content container */}
                <div className="bg-white rounded-3xl p-5 shadow-sm leading-relaxed max-w-none">
                  {renderMarkdown(sum.summaryText)}
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-[#F5F5F5] rounded-[32px] text-[#6F8377]">
            <BookOpen className="mx-auto text-[#6F8377] mb-2" size={28} />
            <p className="text-sm">아직 생성된 묵상 요약 보고서가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}
