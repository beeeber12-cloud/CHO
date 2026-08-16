import { useRef } from "react";

/**
 * 좌우로 밀어 넘기는 손짓을 읽는다.
 *
 * 까다로운 점 두 가지를 처리한다.
 *  ① 세로로 훑어 내리는 동작과 헷갈리면 안 된다 → 가로 이동이 세로보다 뚜렷할 때만 넘긴다.
 *  ② 민 다음에는 손을 뗀 자리의 절이 선택되면 안 된다 → `justSwiped()` 로 그 한 번을 걸러낸다.
 */
export interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** 이만큼(px) 넘게 밀어야 넘어간다 */
  threshold?: number;
}

export function useSwipe({ onSwipeLeft, onSwipeRight, threshold = 60 }: SwipeOptions) {
  const start = useRef<{ x: number; y: number; time: number } | null>(null);
  // 손가락이 조금이라도 움직였는지. 움직였으면 '누른 것'이 아니라 '민 것'이다.
  const moved = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      start.current = null;
      return;
    }
    const t = e.touches[0];
    start.current = { x: t.clientX, y: t.clientY, time: Date.now() };
    moved.current = false;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!start.current || e.touches.length !== 1) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - start.current.x) > 10 || Math.abs(t.clientY - start.current.y) > 10) {
      moved.current = true;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const from = start.current;
    start.current = null;
    if (!from) return;

    const t = e.changedTouches[0];
    if (!t) return;

    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    const elapsed = Date.now() - from.time;

    // 가로로 충분히, 세로보다 뚜렷하게, 너무 느리지 않게 밀었을 때만
    const isHorizontal = Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * 1.5;
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

  return { swipeHandlers: { onTouchStart, onTouchMove, onTouchEnd }, justSwiped };
}
