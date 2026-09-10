import React from "react";
import { splitMentions } from "../lib/mentions";
import { splitLinks, youtubeIdsIn } from "../lib/links";
import YouTubeCard from "./YouTubeCard";

interface MentionTextProps {
  text: string;
  /** 나눔방 지체 이름 목록 */
  names: string[];
  className?: string;
  /** 유튜브 영상을 글 아래에 붙여 그 자리에서 재생되게 한다 (댓글에는 붙이지 않는다) */
  embedVideo?: boolean;
}

/**
 * 글에 섞인 "@이름" 을 눈에 띄게 보여주고, 인터넷 주소는 눌러서 열리게 한다.
 *
 * 찬양 영상 링크를 붙여 넣으시는 일이 잦은데 그동안은 그냥 글자였다 —
 * 길게 눌러 복사해 브라우저에 붙여 넣어야 열렸다. 이제는 눌러서 바로 열리고,
 * 유튜브면 글 아래에 그림이 붙어 **그 자리에서 재생**된다.
 */
export default function MentionText({
  text,
  names,
  className = "",
  embedVideo = false
}: MentionTextProps) {
  const pieces = splitMentions(text, names);
  // 한 글에 여럿을 붙이면 화면이 무거워진다 — 앞의 둘까지만
  const videos = embedVideo ? youtubeIdsIn(text).slice(0, 2) : [];

  return (
    // 영상 상자는 문단(p) 안에 들어갈 수 없어 바깥을 div 로 둔다
    <div className={className}>
      {pieces.map((p, i) =>
        p.isMention ? (
          <span
            key={i}
            className="font-bold text-[#0C3B2E] bg-[#E8F0E9] rounded-md px-1 py-0.5 whitespace-nowrap"
          >
            {p.text}
          </span>
        ) : (
          <React.Fragment key={i}>
            {splitLinks(p.text).map((piece, j) =>
              piece.url ? (
                <a
                  key={j}
                  href={piece.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  // 누르는 것이 글이 아니라 '링크' 임이 보여야 한다
                  className="text-[#1F6FB2] underline underline-offset-2 break-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {piece.text}
                </a>
              ) : (
                <React.Fragment key={j}>{piece.text}</React.Fragment>
              )
            )}
          </React.Fragment>
        )
      )}

      {videos.map((id) => (
        <YouTubeCard key={id} id={id} />
      ))}
    </div>
  );
}
