/**
 * "@이름" 으로 지체를 부르는 기능의 공통 규칙.
 * 서버(server.ts 의 findMentionedUserIds)와 같은 방식으로 이름을 맞춘다.
 */

/** "관리자(목사님)" 처럼 괄호가 붙은 이름은 괄호 앞부분으로도 부를 수 있다 */
export function mentionAliases(name: string): string[] {
  const full = (name || "").trim();
  if (!full) return [];
  const short = full.replace(/\s*\(.*\)\s*$/, "").trim();
  return short && short !== full && short.length >= 2 ? [full, short] : [full];
}

export interface MentionPiece {
  text: string;
  isMention: boolean;
}

/**
 * 글을 "@이름" 조각과 보통 글 조각으로 나눈다.
 * 화면에서 부른 이름을 눈에 띄게 보여주는 데 쓴다.
 */
export function splitMentions(text: string, names: string[]): MentionPiece[] {
  if (!text) return [];

  // 긴 이름부터 맞춰야 "김민"이 "김민석"을 가로채지 않는다
  const aliases = [...new Set(names.flatMap(mentionAliases))].sort((a, b) => b.length - a.length);
  if (aliases.length === 0) return [{ text, isMention: false }];

  const pieces: MentionPiece[] = [];
  let buffer = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === "@") {
      const rest = text.slice(i + 1);
      const hit = aliases.find((a) => rest.startsWith(a));
      if (hit) {
        if (buffer) {
          pieces.push({ text: buffer, isMention: false });
          buffer = "";
        }
        pieces.push({ text: "@" + hit, isMention: true });
        i += 1 + hit.length;
        continue;
      }
    }
    buffer += text[i];
    i++;
  }

  if (buffer) pieces.push({ text: buffer, isMention: false });
  return pieces;
}

/** 입력칸 끝에 "@이름 " 을 덧붙인다 (앞에 공백이 필요하면 넣어준다) */
export function appendMention(current: string, name: string): string {
  const base = current.endsWith(" ") || current === "" ? current : current + " ";
  return `${base}@${name} `;
}
