import React, { useState } from "react";
import { Play } from "lucide-react";

/**
 * 글에 붙은 유튜브 영상 — 그 자리에서 바로 재생된다.
 *
 * 처음에는 **그림 한 장**만 보여 준다. 영상 재생기(iframe)는 무겁고 느려서,
 * 글이 여럿 있는 화면에서 전부 미리 띄우면 화면이 굼떠진다.
 * 누르신 그 영상만 재생기로 바뀐다 (누른 직후라 소리와 함께 바로 시작된다).
 */
interface Props {
  id: string;
  className?: string;
}

export default function YouTubeCard({ id, className = "" }: Props) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-black/90 aspect-video mt-2.5 ${className}`}
    >
      {playing ? (
        <iframe
          // 광고 추적을 덜 남기는 주소를 쓴다
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title="유튜브 영상"
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 w-full h-full cursor-pointer group"
          aria-label="영상 재생"
        >
          <img
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <span className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-14 h-14 rounded-full bg-white/95 text-[#12503B] flex items-center justify-center shadow-xl group-hover:scale-105 transition">
              <Play size={26} fill="currentColor" className="ml-1" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
