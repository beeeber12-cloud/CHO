import { useEffect, RefObject } from "react";

/**
 * 본문 상자를 **화면 높이에 맞춰** 늘린다.
 *
 * 예전에는 `max-h-[60vh]` 처럼 숫자를 박아 두었다. 그러면 기기마다 남는 자리가
 * 달라서, 어떤 폰에서는 아래가 휑하게 비고 어떤 폰에서는 몇 줄 못 보고 굴려야 했다.
 *
 * 그래서 재서 정한다 — 상자 위에 무엇이 얼마나 쌓여 있는지(`anchor` 부터 상자까지의
 * 거리)를 실제로 재고, 화면 높이에서 그만큼과 아래 탭 바를 뺀 값을 상자 높이로 준다.
 * 화면을 굴려도 이 거리는 변하지 않으므로 값이 춤추지 않는다.
 *
 * @param boxRef   높이를 맞출 상자
 * @param anchorRef 상자가 딸린 카드(이 지점이 화면 맨 위로 온다고 보고 잰다)
 * @param deps     본문이 바뀌는 등 다시 재야 할 때 넣는다
 */
export function useFillHeight(
  boxRef: RefObject<HTMLElement | null>,
  anchorRef: RefObject<HTMLElement | null>,
  deps: unknown[] = []
): void {
  useEffect(() => {
    const fit = () => {
      const box = boxRef.current;
      const anchor = anchorRef.current;
      if (!box || !anchor) return;

      // 카드 머리부터 상자까지 쌓여 있는 것들의 높이 (제목·번역본 고르기 등)
      const above = box.getBoundingClientRect().top - anchor.getBoundingClientRect().top;
      // 아래 탭 바가 가리는 만큼 (PC 는 탭 바가 없다)
      const below = window.matchMedia("(min-width: 768px)").matches ? 32 : 104;

      const h = window.innerHeight - above - below;
      // 너무 짧아지면 오히려 읽기 나쁘다 — 바닥을 둔다
      box.style.maxHeight = `${Math.max(380, Math.round(h))}px`;
    };

    fit();
    // 글씨 크기를 바꾸거나 번역본을 하나 더 얹으면 위에 쌓인 높이가 달라진다
    const ro = new ResizeObserver(fit);
    if (anchorRef.current) ro.observe(anchorRef.current);
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
