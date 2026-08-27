// 알림 상태표시줄용 배지 아이콘을 만든다.
// 안드로이드는 이 그림의 '투명도'만 읽고 색은 버린다.
// 그래서 흰 글자 모양 + 나머지는 완전 투명이어야 하고,
// 지금처럼 꽉 찬 사각형 아이콘을 쓰면 그냥 네모로 보인다.
import zlib from "node:zlib";
import fs from "node:fs";

const SIZE = 96;
const SS = 4; // 가장자리를 매끄럽게 하려고 4x4 로 잘게 나눠 본다

// ── 모양 정의 (96x96 좌표계) ──────────────────────────
const poly = (px, py, pts) => {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const ellipse = (px, py, cx, cy, rx, ry, deg) => {
  const a = (deg * Math.PI) / 180;
  const dx = px - cx, dy = py - cy;
  const X = dx * Math.cos(a) + dy * Math.sin(a);
  const Y = -dx * Math.sin(a) + dy * Math.cos(a);
  return (X * X) / (rx * rx) + (Y * Y) / (ry * ry) <= 1;
};
const rect = (px, py, x0, y0, x1, y1) => px >= x0 && px <= x1 && py >= y0 && py <= y1;

// 펼친 성경책 + 새싹 (앱 아이콘과 같은 모티프, 작게도 알아보이도록 단순화)
function inside(x, y) {
  // 24px 로 줄었을 때도 형태가 남도록 굵게, 사이를 넓게 잡는다.
  // 새싹 줄기
  if (rect(x, y, 44.5, 16, 51.5, 42)) return true;
  // 새싹 잎 두 장 — 둥글고 도톰하게, 좌우로 벌려서 붙어 보이지 않게
  if (ellipse(x, y, 34, 24, 11, 7.5, -30)) return true;
  if (ellipse(x, y, 62, 24, 11, 7.5, 30)) return true;
  // 펼친 책 — 가운데 홈을 10px 벌려 두 면이 구분되게
  if (poly(x, y, [[8, 47], [43, 55], [43, 84], [8, 76]])) return true;
  if (poly(x, y, [[88, 47], [53, 55], [53, 84], [88, 76]])) return true;
  return false;
}

// ── 픽셀 만들기 ──────────────────────────────────────
const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
let p = 0;
for (let y = 0; y < SIZE; y++) {
  raw[p++] = 0; // 필터 없음
  for (let x = 0; x < SIZE; x++) {
    let hit = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        if (inside(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS)) hit++;
      }
    }
    const alpha = Math.round((hit / (SS * SS)) * 255);
    raw[p++] = 255; raw[p++] = 255; raw[p++] = 255; raw[p++] = alpha; // 흰색 + 투명도
  }
}

// ── PNG 로 묶기 ──────────────────────────────────────
const table = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = table[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0); ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
  chunk("IEND", Buffer.alloc(0))
]);

fs.writeFileSync("public/badge-96.png", png);

// 확인용 수치
let opaque = 0, transparent = 0;
for (let i = 3; i < raw.length; i += 4) {} // 필터 바이트 때문에 아래에서 다시 센다
let idx = 0;
for (let y = 0; y < SIZE; y++) {
  idx++;
  for (let x = 0; x < SIZE; x++) {
    const a = raw[idx + 3];
    if (a > 200) opaque++; else if (a < 20) transparent++;
    idx += 4;
  }
}
console.log(`badge-96.png 생성 (${png.length} bytes)`);
console.log(`  불투명 픽셀 ${opaque} / 완전투명 ${transparent} / 전체 ${SIZE * SIZE}`);
console.log(`  → 투명 비율 ${((transparent / (SIZE * SIZE)) * 100).toFixed(1)}% (사각형이면 0% 가 된다)`);
