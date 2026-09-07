import React from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  buildRjSchedule,
  rjDateKey,
  rjDateLabel,
  rjDayOn,
  rjFinishDate,
  rjNormalizeSettings,
  rjRangeLabel,
  RJBreak,
  RJ_DAY_LABELS,
  RJ_DAY_PRESETS,
  RJ_TOTAL_DAYS,
  RJ_WEEKS
} from "../lib/readingJesus";

/**
 * 리딩지저스 통독 일정을 정하는 칸 — 시작날 · 읽는 요일 · 쉬는 기간.
 *
 * 관리자가 공동체 일정을 정할 때(오늘의 말씀 설정)와
 * 지체가 자기 일정을 정할 때(성경통독) **같은 칸을 쓴다.**
 * 그래야 둘이 따로 놀지 않고, 고칠 곳도 한 군데다.
 */
export interface ReadingJesusScheduleFormProps {
  startDate: string;
  onStartDate: (v: string) => void;
  readingDays: number[];
  onReadingDays: (v: number[]) => void;
  breaks: RJBreak[];
  onBreaks: (v: RJBreak[]) => void;
  /** 시작날 밑에 덧붙일 설명 */
  startHint?: string;
  /** 미리보기 첫 줄의 이름 (예: "오늘 올라갈 말씀" / "오늘 읽을 말씀") */
  todayLabel?: string;
}

export default function ReadingJesusScheduleForm({
  startDate,
  onStartDate,
  readingDays,
  onReadingDays,
  breaks,
  onBreaks,
  startHint = "이 날 1주차 첫 분량(창세기 1~4장)부터 시작합니다.",
  todayLabel = "오늘 읽을 말씀"
}: ReadingJesusScheduleFormProps) {
  const settings = React.useMemo(
    () => rjNormalizeSettings({ startDate, readingDays, breaks }),
    [startDate, readingDays, breaks]
  );
  const schedule = React.useMemo(() => buildRjSchedule(settings), [settings]);
  const today = React.useMemo(() => rjDayOn(schedule, rjDateKey(new Date())), [schedule]);
  const finish = React.useMemo(() => rjFinishDate(schedule), [schedule]);

  const toggleDay = (day: number) =>
    onReadingDays(
      readingDays.includes(day)
        ? readingDays.filter((d) => d !== day)
        : [...readingDays, day].sort((a, b) => a - b)
    );

  const patchBreak = (i: number, patch: Partial<RJBreak>) =>
    onBreaks(breaks.map((b, k) => (k === i ? { ...b, ...patch } : b)));

  return (
    <div className="space-y-3.5 text-xs">
      {/* ① 시작날 */}
      <div>
        <label className="block text-2xs font-bold text-[#4E7568] mb-1">통독 시작날</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDate(e.target.value)}
          className="w-full text-xs px-3 py-2.5 bg-[#EFF6E2] rounded-xl text-[#0B2A20] font-semibold"
        />
        <p className="mt-1 text-2xs text-[#4E7568]">{startHint}</p>
      </div>

      {/* ② 읽는 요일 */}
      <div>
        <label className="block text-2xs font-bold text-[#4E7568] mb-1">읽는 요일</label>
        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {RJ_DAY_LABELS.map((label, day) => {
            const on = readingDays.includes(day);
            const weekend = day === 0 || day === 6;
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`h-10 rounded-2xl text-sm font-bold transition cursor-pointer ${
                  on
                    ? "grad-forest text-white"
                    : weekend
                    ? "bg-[#EFF6E2] text-[#B3261E] hover:bg-[#E4EFD1]"
                    : "bg-[#EFF6E2] text-[#1E6B57] hover:bg-[#E4EFD1]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {RJ_DAY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onReadingDays([...preset.days])}
              className="px-3 py-1.5 rounded-full bg-[#EFF6E2] hover:bg-[#CFE0C2] text-2xs font-bold text-[#1E6B57] transition cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
        {readingDays.length === 0 && (
          <p className="text-2xs text-[#8F1E17] mt-1.5">읽는 요일을 하나 이상 골라 주세요.</p>
        )}
      </div>

      {/* ③ 쉬는 기간 — 그만큼 뒤가 밀린다 */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-1">
          <label className="text-2xs font-bold text-[#4E7568]">쉬는 기간 (방학 · 특별주간)</label>
          <button
            type="button"
            onClick={() => onBreaks([...breaks, { from: "", to: "", label: "" }])}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#EFF6E2] hover:bg-[#CFE0C2] text-2xs font-bold text-[#1E6B57] transition cursor-pointer"
          >
            <Plus size={12} />
            기간 추가
          </button>
        </div>

        {breaks.length === 0 ? (
          <p className="text-2xs text-[#4E7568] bg-[#EFF6E2] rounded-xl px-3 py-2.5">
            쉬는 기간이 없습니다. 방학이나 특별주간을 넣으면 그만큼 통독이 미뤄집니다.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {breaks.map((br, idx) => (
              <div key={idx} className="bg-[#EFF6E2] rounded-2xl p-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={br.label || ""}
                    onChange={(e) => patchBreak(idx, { label: e.target.value })}
                    placeholder="이름 (예: 여름 방학)"
                    className="flex-1 min-w-0 text-xs px-3 py-2 bg-white rounded-xl text-[#0B2A20] font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => onBreaks(breaks.filter((_, k) => k !== idx))}
                    className="w-8 h-8 rounded-full bg-white text-[#B3261E] flex items-center justify-center shrink-0 hover:bg-[#FBE6E4] transition cursor-pointer"
                    aria-label="이 기간 지우기"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={br.from}
                    onChange={(e) => patchBreak(idx, { from: e.target.value })}
                    className="flex-1 min-w-0 text-xs px-2.5 py-2 bg-white rounded-xl text-[#0B2A20] font-semibold"
                  />
                  <span className="text-2xs text-[#4E7568] shrink-0">~</span>
                  <input
                    type="date"
                    value={br.to}
                    onChange={(e) => patchBreak(idx, { to: e.target.value })}
                    className="flex-1 min-w-0 text-xs px-2.5 py-2 bg-white rounded-xl text-[#0B2A20] font-semibold"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 지금 정한 대로 계획이 어떻게 짜이는지 바로 보여준다 */}
      <div className="bg-[#EFF6E2] rounded-2xl px-3 py-2.5 space-y-1">
        {schedule.length === 0 ? (
          <p className="text-2xs text-[#8F1E17] font-bold">
            시작날과 읽는 요일을 정하면 여기에 계획이 나옵니다.
          </p>
        ) : (
          <>
            <p className="text-2xs text-[#1E6B57] font-bold">
              {todayLabel}:{" "}
              {today
                ? `${rjRangeLabel(today.entry)} (${today.entry.week}주 ${today.index + 1}일차)`
                : "없음 — 오늘은 읽는 날이 아닙니다"}
            </p>
            <p className="text-2xs text-[#4E7568]">
              {RJ_WEEKS}주 {RJ_TOTAL_DAYS}일 계획 · 마치는 날 {finish ? rjDateLabel(finish) : "-"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
