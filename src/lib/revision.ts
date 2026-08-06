/**
 * 실시간 갱신을 가볍게 만드는 공용 구독기.
 *
 * 전에는 화면마다 4초짜리 타이머를 따로 돌리며 목록 전체를 다시 받아왔다.
 * (묵상나눔·감사칭찬·나의기록이 각각 돌아 글이 쌓일수록 그대로 무거워졌다)
 *
 * 이제는 타이머 하나가 4초마다 /api/revision(수십 바이트)만 확인하고,
 * 실제로 바뀌었을 때에만 각 화면에 알려 다시 받게 한다.
 */

const POLL_MS = 4000;

let lastRevision: number | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

async function checkRevision() {
  // 화면이 가려져 있으면 확인할 이유가 없다 (배터리·트래픽 절약)
  if (typeof document !== "undefined" && document.hidden) return;

  try {
    const res = await fetch("/api/revision");
    if (!res.ok) return;
    const data = await res.json();
    const rev = Number(data?.revision);
    if (!Number.isFinite(rev)) return;

    if (lastRevision === null) {
      // 첫 확인은 기준점만 잡는다 (화면들은 이미 자기 데이터를 받아둔 상태)
      lastRevision = rev;
      return;
    }
    if (rev !== lastRevision) {
      lastRevision = rev;
      listeners.forEach((fn) => {
        try {
          fn();
        } catch (err) {
          console.error("데이터 갱신 처리 실패:", err);
        }
      });
    }
  } catch {
    /* 일시적인 통신 실패는 다음 주기에 다시 확인한다 */
  }
}

/** 데이터가 바뀌면 콜백을 호출한다. 반환값을 호출하면 구독이 해제된다. */
export function subscribeToDataChanges(onChange: () => void): () => void {
  listeners.add(onChange);
  if (timer === null) {
    timer = setInterval(checkRevision, POLL_MS);
  }

  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}
