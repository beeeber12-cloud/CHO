import React from "react";
import { ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

/**
 * 설정 화면의 공통 부품 (시안의 .section-label / .rowgroup / .row / .chip / .switch).
 *
 * 시안은 줄마다 **따로 떨어진 옅은 상자**다 — 한 상자 안에 구분선으로 나누던
 * 예전 방식과 다르다. 줄이 각각 눌리는 것이라는 게 눈으로 바로 보인다.
 * 내용이 긴 설정은 줄을 누르면 팝업으로 열린다.
 */

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-2xs font-bold text-[#6F8377] tracking-[0.08em] mb-2.5 ml-1.5">
      {children}
    </p>
  );
}

export function RowGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

interface RowProps {
  /** 왼쪽 동그란 아이콘 자리 */
  icon: React.ReactNode;
  title: string;
  sub?: string;
  /** 오른쪽 노란 뱃지 (예: 관리자) */
  badge?: string;
  /** 화살표 대신 놓을 것 (스위치·버튼 등) */
  right?: React.ReactNode;
  onClick?: () => void;
  /** 오른쪽 화살표를 보일지 (누르면 열리는 줄) */
  chevron?: boolean;
  danger?: boolean;
}

export function Row({
  icon,
  title,
  sub,
  badge,
  right,
  onClick,
  chevron,
  danger = false
}: RowProps) {
  const showChevron = chevron ?? (!!onClick && !right);
  const body = (
    <>
      <span
        className={`w-[34px] h-[34px] rounded-full flex items-center justify-center shrink-0 ${
          danger ? "bg-[#FBE6E4] text-[#B3261E]" : "bg-[#D2DDD3] text-[#4A6B57]"
        }`}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span
          className={`block text-sm font-semibold truncate ${
            danger ? "text-[#B3261E]" : "text-[#14261E]"
          }`}
        >
          {title}
        </span>
        {sub && <span className="block text-2xs text-[#6F8377] mt-px">{sub}</span>}
      </span>
      {badge && (
        <span className="text-2xs font-bold text-[#4A3600] bg-[#FFBA00] px-2 py-0.5 rounded-full shrink-0">
          {badge}
        </span>
      )}
      {right}
      {showChevron && <ChevronRight size={17} className="text-[#6F8377] shrink-0" />}
    </>
  );

  const cls =
    "w-full flex items-center gap-3 p-3 bg-[#F9F9F9] rounded-[18px] transition hover:bg-[#F0F0F0]";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${cls} cursor-pointer text-left`}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}

/** 켜고 끄는 작은 스위치 (시안의 .switch) */
export function Switch({
  checked,
  onChange,
  disabled = false,
  label
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-[42px] h-[25px] rounded-full shrink-0 transition cursor-pointer disabled:opacity-50 ${
        checked ? "bg-[#4A6B57]" : "bg-[#D8DED9]"
      }`}
    >
      <span
        className={`absolute top-[2.5px] left-[2.5px] w-5 h-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-transform duration-200 ${
          checked ? "translate-x-[17px]" : ""
        }`}
      />
    </button>
  );
}

/**
 * 설정에서 여는 팝업.
 * 휴대폰·PC 모두 **화면 맨 위**에 붙는다 — 버튼을 누르자마자 바로 눈에 들어오도록.
 * 내용이 길면 창 안에서만 스크롤된다.
 */
export function SettingModal({
  open,
  title,
  sub,
  onClose,
  children
}: {
  open: boolean;
  title: string;
  sub?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          // 창은 **화면 맨 위**에 붙는다 — 누르자마자 바로 눈에 들어오도록.
          // (위쪽이 가려지는 기기에서는 그 높이만큼만 띄운다)
          className="fixed inset-0 bg-black/50 z-[70] flex items-start justify-center px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.6 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg max-h-[calc(100vh-env(safe-area-inset-top)-1.5rem)] rounded-[26px] flex flex-col shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3.5">
              <div className="min-w-0">
                <h4 className="font-bold text-[#0C3B2E] text-base">{title}</h4>
                {sub && <p className="text-2xs text-[#6F8377] mt-0.5 leading-relaxed">{sub}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-[#F9F9F9] hover:bg-[#F0F0F0] flex items-center justify-center text-[#6F8377] shrink-0 cursor-pointer"
                aria-label="닫기"
              >
                <X size={17} />
              </button>
            </div>
            <div className="px-5 pb-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
