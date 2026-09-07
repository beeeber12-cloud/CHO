import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface CollapsibleTextProps {
  children: React.ReactNode;
  /** 접었을 때 보여줄 높이(px). 이 높이를 넘을 때만 '더 보기'가 나온다. */
  collapsedHeight?: number;
  /** 아래쪽 흐림 효과가 자연스럽도록 감싸는 상자의 배경색을 그대로 넣는다. */
  fadeColor?: string;
  className?: string;
}

/**
 * 긴 글을 접어 두고 눌러서 펴는 상자.
 *
 * 글이 길면 다음 사람 묵상까지 한참 내려가야 해서, 윗부분만 보여준다.
 * 짧은 글에는 '더 보기'가 아예 안 나오도록 실제 높이를 재서 판단한다.
 * (글씨 크기 설정을 바꾸면 높이가 달라지므로 ResizeObserver 로 다시 잰다)
 */
export default function CollapsibleText({
  children,
  collapsedHeight = 150,
  fadeColor = "#F0F0F0",
  className = ""
}: CollapsibleTextProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [isLong, setIsLong] = useState(false);
  const [fullHeight, setFullHeight] = useState<number | undefined>(undefined);

  const measure = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    setFullHeight(el.scrollHeight);
    // 여유를 조금 둔다. 한두 줄 넘치는 정도로 '더 보기'가 뜨면 오히려 번거롭다.
    setIsLong(el.scrollHeight > collapsedHeight + 32);
  }, [collapsedHeight]);

  useEffect(() => {
    measure();
    const el = innerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, children]);

  const collapsed = isLong && !expanded;

  return (
    <div className={className}>
      <div
        className="relative overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: collapsed ? collapsedHeight : fullHeight }}
      >
        <div ref={innerRef}>{children}</div>

        {collapsed && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
            style={{ background: `linear-gradient(to bottom, transparent, ${fadeColor})` }}
          />
        )}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1.5 w-full flex items-center justify-center gap-1 py-1.5 text-2xs font-bold text-[#4A6B57] hover:text-[#0C3B2E] cursor-pointer rounded-3xl hover:bg-black/5 transition"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "접기" : "더 보기"}
        </button>
      )}
    </div>
  );
}
