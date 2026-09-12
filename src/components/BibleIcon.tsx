import React from "react";

/**
 * 성경통독 탭 아이콘 — 표지에 십자가가 있는 성경책.
 *
 * '오늘 말씀' 탭은 **펼친 책**(BookOpen)이다. 오늘 읽을 한 장이라는 뜻이다.
 * 여기는 **덮인 성경책 한 권** — 성경 전체를 처음부터 끝까지 읽는 자리라는 뜻이다.
 *
 * 하단 바에서 19px 로 그려진다. 그 크기에서 알아볼 수 있어야 하므로 선을 더 넣지 않았다
 * (책갈피·책장 선까지 넣으면 작은 크기에서 다 뭉개진다).
 * 다른 탭 아이콘이 전부 lucide 라서 같은 규격(24 칸, 선 굵기 1.8, 둥근 끝)을 따른다.
 */
export default function BibleIcon({
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
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
      <path d="M13.2 5.6v6.8" />
      <path d="M10 8.4h6.4" />
    </svg>
  );
}
