import { useRef } from "react";

/**
 * 좌우로 밀어 넘기는 손짓을 읽는다.
 *
 * 까다로운 점 세 가지를 처리한다.
 *  ① 세로로 훑어 내리는 동작과 헷갈리면 안 된다 → 가로 이동이 세로보다 뚜렷할 때만 넘긴다.
 *  ② 민 다음에는 손을 뗀 자리의 절이 선택되면 안 된다 → `justSwiped()` 로 그 한 번을 걸러낸다.
 *  ③ 손가락을 따라 화면이 같이 움직여야 넘어가는 느낌이 난다 → `dragRef` 를 직접 밀어준다.
 *     (그릴 때마다 React 를 다시 돌리면 글이 많은 화면에서 끊기므로 DOM 을 직접 만진다)
 */
export interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** 그쪽으로 넘어갈 데가 있는지. 없으면 살짝만 밀리고 되돌아온다 */
  canSwipeLeft?: boolean;
  canSwipeRight?: boolean;
  /** 이만큼(px) 넘게 밀어야 넘어간다 */
  threshold?: number;
}

/** 손가락 이동을 화면 이동으로 옮길 때 쓰는 비율 (그대로 따라가면 과하다) */
const FOLLOW = 0.38;
/** 넘어갈 데가 없을 때의 비율 — 뻑뻑하게 해서 끝이라는 걸 손으로 알게 한다 */
const FOLLOW_BLOCKED = 0.12;
/** 아무리 밀어도 이 이상은 안 밀린다 */
const MAX_FOLLOW = 96;
const SNAP_BACK = "transform .32s cubic-bezier(.22,1,.36,1)";

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft = true,
  canSwipeRight = true,
  threshold = 60
}: SwipeOptions) {
  const start = useRef<{ x: number; y: number; time: number } | null>(null);
  // 손가락이 조금이라도 움직였는지. 움직였으면 '누른 것'이 아니라 '민 것'이다.
  const moved = useRef(false);
  // 가로로 미는 중이라고 판단했는지 (세로 스크롤 중에는 화면을 밀지 않는다)
  const horizontal = useRef(false);
  /** 손가락을 따라 밀어줄 층 */
  const dragRef = useRef<HTMLDivElement>(null);

  const setDrag = (px: number, animated: boolean) => {
    const el = dragRef.current;
    if (!el) return;
    el.style.transition = animated ? SNAP_BACK : "";
    el.style.transform = px === 0 ? "" : `translate3d(${px}px,0,0)`;
  };

  const release = () => {
    setDrag(0, true);
    const el = dragRef.current;
    if (el) window.setTimeout(() => { if (el) el.style.transition = ""; }, 340);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      start.current = null;
      return;
    }
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    moved.current = false;
    horizontal.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;

    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) moved.current = true;

    // 한 번 가로로 정해지면 그 손짓이 끝날 때까지 유지한다 (중간에 흔들려도 튀지 않게)
    if (!horizontal.current && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
      horizontal.current = true;
    }
    if (!horizontal.current || prefersReducedMotion()) return;

    const blocked = dx < 0 ? !canSwipeLeft : !canSwipeRight;
    const factor = blocked ? FOLLOW_BLOCKED : FOLLOW;
    const shifted = Math.max(-MAX_FOLLOW, Math.min(MAX_FOLLOW, dx * factor));
    setDrag(shifted, false);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const from = start.current;
    start.current = null;
    const wasHorizontal = horizontal.current;
    horizontal.current = false;

    if (!from) return;
    release();

    const t = e.changedTouches[0];
    if (!t || !wasHorizontal) return;

    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    const elapsed = Date.now() - from.time;

    // 가로로 충분히, 세로보다 뚜렷하게, 너무 느리지 않게 밀었을 때만.
    // 짧아도 빠르게 튕기면(플릭) 넘어가게 해서 손맛을 살린다.
    const far = Math.abs(dx) >= threshold;
    const flick = Math.abs(dx) >= 28 && elapsed <= 250;
    const isHorizontal = (far || flick) && Math.abs(dx) > Math.abs(dy) * 1.5;
    if (!isHorizontal || elapsed > 800) return;

    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  };

  /** 방금 민 동작이었는지 (눌러서 고르는 동작과 구별하는 용도). 확인하면 표시는 지워진다. */
  const justSwiped = () => {
    if (!moved.current) return false;
    moved.current = false;
    return true;
  };

  return {
    swipeHandlers: { onTouchStart, onTouchMove, onTouchEnd },
    justSwiped,
    dragRef,
    reducedMotion: prefersReducedMotion()
  };
}
