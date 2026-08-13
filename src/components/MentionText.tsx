import React from "react";
import { splitMentions } from "../lib/mentions";

interface MentionTextProps {
  text: string;
  /** 나눔방 지체 이름 목록 */
  names: string[];
  className?: string;
}

/** 글에 섞인 "@이름" 을 눈에 띄게 보여준다. 불렀는지 아닌지가 한눈에 보여야 한다. */
export default function MentionText({ text, names, className = "" }: MentionTextProps) {
  const pieces = splitMentions(text, names);

  return (
    <p className={className}>
      {pieces.map((p, i) =>
        p.isMention ? (
          <span
            key={i}
            className="font-bold text-[#0C3B2E] bg-[#E8F0E9] rounded-md px-1 py-0.5 whitespace-nowrap"
          >
            {p.text}
          </span>
        ) : (
          <React.Fragment key={i}>{p.text}</React.Fragment>
        )
      )}
    </p>
  );
}
