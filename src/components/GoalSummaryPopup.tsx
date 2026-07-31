import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { Meditation, GratitudeNote, SharingGoal, UserBibleProgress } from "../types";

/**
 * 앱에 들어올 때마다 띄우는 목표 진행률 요약.
 * "내가 어디까지 왔는지" 상기시키는 용도라 나눔·통독 두 가지만 담는다.
 * 바깥을 누르거나 X 로 닫을 수 있다.
 */

const WEEKS_PER_MONTH = 4;

interface Props {
  currentUser: { id: string; name: string };
}

interface Row {
  label: string;
  done: number;
  target: number;
  unit: string;
  /** 달이 막 바뀌어 0으로 보일 때 붙이는 지난달 결과 한 줄 */
  note?: string;
}

export default function GoalSummaryPopup({ currentUser }: Props) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!currentUser?.id) return;

    let cancelled = false;

    (async () => {
      try {
        const [medRes, gratRes, goalRes, progRes] = await Promise.all([
          fetch("/api/meditations"),
          fetch("/api/gratitudes"),
          fetch(`/api/sharing-goal/${currentUser.id}`),
          fetch(`/api/bible-progress/${currentUser.id}`)
        ]);

        const meds: Meditation[] = medRes.ok ? await medRes.json() : [];
        const grats: GratitudeNote[] = gratRes.ok ? await gratRes.json() : [];
        const goal: SharingGoal | null = goalRes.ok ? await goalRes.json() : null;
        const prog: UserBibleProgress | null = progRes.ok ? await progRes.json() : null;

        const now = new Date();
        const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const mine = (uid: string) => uid === currentUser.id;
        const thisMonth = (d?: string) => !!d && d.startsWith(monthPrefix);

        const monthMed = meds.filter((m) => mine(m.userId) && thisMonth(m.date)).length;
        const monthGrat = grats.filter((g) => mine(g.userId) && thisMonth(g.date)).length;

        // 매월 1일에 0부터 다시 시작하므로, 지난달 결과를 함께 알려준다.
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
        const prevMonth = (d?: string) => !!d && d.startsWith(prevPrefix);
        const prevTotal =
          meds.filter((m) => mine(m.userId) && prevMonth(m.date)).length +
          grats.filter((g) => mine(g.userId) && prevMonth(g.date)).length;

        const next: Row[] = [
          {
            label: "이번 달 나눔",
            done: monthMed + monthGrat,
            target:
              ((goal?.weeklyMeditations ?? 3) + (goal?.weeklyGratitudes ?? 3)) * WEEKS_PER_MONTH,
            unit: "회",
            note: prevTotal > 0 ? `지난달(${prevDate.getMonth() + 1}월)에는 ${prevTotal}회 나누셨어요` : undefined
          },
          {
            label: "성경 통독",
            done: prog?.completedChapters?.length ?? 0,
            target: prog?.targetChapters ?? 1189,
            unit: "장"
          }
        ];

        if (!cancelled) {
          setRows(next);
          setOpen(true);
        }
      } catch (err) {
        console.error("목표 요약 조회 실패:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  const pct = (done: number, target: number) =>
    target <= 0 ? 100 : Math.min(100, Math.round((done / target) * 100));

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}   // 바깥을 눌러도 닫힌다
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}  // 안쪽 클릭은 닫히지 않게
            className="bg-white rounded-[32px] w-full max-w-sm p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-[#0C3B2E] text-base">
                  {currentUser.name}님, 지금까지 이만큼 오셨어요
                </h3>
                <p className="text-xs text-[#6F8377] font-medium mt-0.5">
                  오늘도 한 걸음 더 나아가 보세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[#85888F] hover:text-[#4A6B57] cursor-pointer shrink-0"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5">
              {rows.map((r) => {
                const p = pct(r.done, r.target);
                return (
                  <div key={r.label}>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-bold text-[#0C3B2E]">{r.label}</span>
                      <span className="font-bold text-[#4A6B57]">
                        {r.done} / {r.target}
                        {r.unit} ({p}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#F0F0F0] rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-[#6D9773] to-[#FFBA00] h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(2, p)}%` }}
                      />
                    </div>
                    {r.note && (
                      <p className="text-2xs text-[#6F8377] font-semibold mt-1">{r.note}</p>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2.5 bg-[#0C3B2E] hover:bg-[#072A20] text-white text-xs font-bold rounded-3xl transition cursor-pointer"
            >
              확인
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
