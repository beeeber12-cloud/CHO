import { useEffect } from "react";

/**
 * 성경을 읽는 동안 화면이 꺼지지 않게 붙잡아 둔다.
 *
 * 한 구절을 곱씹고 있으면 손을 안 대니 금방 화면이 꺼져 버린다.
 * 브라우저의 화면 잠금 방지(Wake Lock)를 걸어 두면, 그 화면을 보고 있는 동안에는 켜져 있다.
 *
 * 알아 둘 점 세 가지.
 *  ① 다른 앱으로 넘어가거나 화면을 내리면 잠금이 **저절로 풀린다**.
 *     그래서 돌아왔을 때 다시 걸어 준다(visibilitychange).
 *  ② 성경 화면을 떠나면 바로 놓아준다 — 배터리를 계속 붙잡고 있으면 안 된다.
 *  ③ 지원하지 않는 기기(구형 아이폰 등)나 절전 모드에서는 조용히 넘어간다.
 *     원래대로 화면이 꺼질 뿐, 앱이 잘못되지는 않는다.
 */
export function useKeepAwake(active: boolean = true): void {
  useEffect(() => {
    if (!active) return;

    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<any> };
    };
    if (!nav.wakeLock?.request) return;

    let lock: any = null;
    let stopped = false;

    const acquire = async () => {
      if (stopped || lock || document.visibilityState !== "visible") return;
      try {
        lock = await nav.wakeLock!.request("screen");
        // 시스템이 알아서 풀어버린 경우를 기억해 둔다 (다시 걸 수 있도록)
        lock.addEventListener?.("release", () => {
          lock = null;
        });
      } catch {
        // 절전 모드 등으로 거절될 수 있다 — 그냥 평소처럼 쓰시면 된다
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      lock?.release?.().catch(() => {});
      lock = null;
    };
  }, [active]);
}
