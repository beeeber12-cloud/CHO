/**
 * 영성일기를 쓸지 말지 — 각자 자기 기기에서 정한다.
 *
 * '나만 보는 일기'는 필요하신 분께는 귀한 자리지만, 대부분은 쓰지 않으신다.
 * 그런데도 묵상일기 화면에 단추가 늘 있어 '내 묵상방' 과 헷갈렸다.
 * 그래서 **기본은 없는 것**으로 두고, 설정에서 켜신 분께만 보인다.
 *
 * 켜고 끄는 것은 **보이느냐 마느냐**일 뿐이다 — 써 두신 일기는 그대로 남아 있고,
 * 다시 켜시면 그대로 다 보인다.
 */

const KEY = "journalEnabled";

export function journalOn(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setJournalOn(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // 저장이 막힌 기기 — 이번 한 번은 화면에만 반영된다
  }
}
