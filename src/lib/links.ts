/**
 * 글 속의 인터넷 주소를 찾아낸다.
 *
 * 지체들이 찬양 영상이나 설교 링크를 묵상에 붙여 넣으실 때가 많은데,
 * 그동안은 그냥 **글자**였다 — 길게 눌러 복사한 뒤 브라우저에 붙여 넣어야 열렸다.
 * 이제는 눌러서 바로 열리고, 유튜브면 그 자리에서 바로 재생된다.
 */

/** http(s) 로 시작하는 주소. 뒤에 붙은 문장부호는 주소가 아니므로 떼어낸다. */
const URL_RE = /(https?:\/\/[^\s<>"']+)/g;

/** 주소 끝에 딸려온 문장부호 — "…watch?v=abc." 의 마침표 같은 것 */
const TAIL = /[.,!?;:)\]}"'…]+$/;

export interface TextPiece {
  text: string;
  /** 주소면 그 주소 (누르면 열린다) */
  url?: string;
}

/** 글을 '보통 글자' 와 '주소' 조각으로 나눈다 */
export function splitLinks(text: string): TextPiece[] {
  const out: TextPiece[] = [];
  let last = 0;

  for (const m of text.matchAll(URL_RE)) {
    const start = m.index ?? 0;
    let url = m[0];

    // 뒤에 붙은 문장부호는 글자로 돌려보낸다
    const tail = url.match(TAIL)?.[0] || "";
    if (tail) url = url.slice(0, -tail.length);
    if (!url) continue;

    if (start > last) out.push({ text: text.slice(last, start) });
    out.push({ text: url, url });
    if (tail) out.push({ text: tail });
    last = start + m[0].length;
  }

  if (last < text.length) out.push({ text: text.slice(last) });
  return out.length > 0 ? out : [{ text }];
}

/** 아이디로 쓸 수 있는 글자인지 (엉뚱한 것을 영상 자리에 넣지 않는다) */
function safeId(id: string): string {
  return /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : "";
}

/**
 * 유튜브 주소면 영상 아이디를 돌려준다 (아니면 빈 문자열).
 * youtu.be/… · youtube.com/watch?v=… · /shorts/… · /embed/… · /live/… 를 모두 알아본다.
 */
export function youtubeId(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");

    if (host === "youtu.be") return safeId(u.pathname.slice(1).split("/")[0]);

    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (u.pathname === "/watch") return safeId(u.searchParams.get("v") || "");
      const m = u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
      if (m) return safeId(m[2]);
    }
  } catch {
    // 주소 모양이 아니면 영상이 아니다
  }
  return "";
}

/** 글에 담긴 유튜브 영상들 (같은 영상이 여러 번 나와도 한 번만) */
export function youtubeIdsIn(text: string): string[] {
  const ids: string[] = [];
  for (const piece of splitLinks(text)) {
    if (!piece.url) continue;
    const id = youtubeId(piece.url);
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}
