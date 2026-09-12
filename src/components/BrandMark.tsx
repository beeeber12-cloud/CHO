import React from "react";

/**
 * 앱 로고 — 말씀(가운데 줄기)과 두 손이 감싸는 모양.
 * 머리말의 공동체 이름 옆, 로그인·공동체 선택 화면에 쓴다.
 *
 * 하단 '성경통독' 탭에도 쓰다가 뺐다 — 선이 많아 19px 에서 뭉개져
 * 무슨 그림인지 알아볼 수가 없었다. 그 자리는 BibleIcon(십자가 성경책)이 맡는다.
 */
export default function BrandMark({
  size = 20,
  className = ""
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 3v13" />
      <path d="M12 6c-2.5-2.5-6-2.5-8 0 0 4 3.5 6.5 8 8.5" />
      <path d="M12 6c2.5-2.5 6-2.5 8 0 0 4-3.5 6.5-8 8.5" />
    </svg>
  );
}
