import React from "react";
import { createPortal } from "react-dom";

/**
 * 팝업을 화면(body) 바로 밑에 그린다.
 *
 * 왜 필요한가 —
 * `position: fixed` 는 보통 **화면**을 기준으로 자리를 잡지만,
 * 위쪽 조상 중에 `transform` 이나 `will-change: transform` 이 걸린 것이 하나라도 있으면
 * 그 조상 상자를 기준으로 바뀐다. 탭 전환을 부드럽게 하려고 탭 화면에 그 속성을 걸어 둔 탓에,
 * 팝업 뒤의 검은 막이 화면 전체가 아니라 탭 내용만큼만 덮여 어중간하게 보였다.
 *
 * 팝업을 body 로 옮기면 그런 조상이 아예 없으므로, 어떤 화면에서 열든 늘 화면 전체를 덮는다.
 */
export default function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
