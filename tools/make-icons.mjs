/**
 * 앱 아이콘 세트 생성기 — 익투스(물고기) 로고
 *
 *   npm install --no-save sharp && node tools/make-icons.mjs
 *
 * (sharp 는 이 도구에서만 쓰므로 package.json 에 넣지 않는다 — 배포 빌드가 느려진다)
 *
 * 원본: tools/assets/app-logo-src.png (둥근 사각형 아이콘 1024, 바깥은 투명)
 * 만드는 것:
 *   public/icon-192.png            홈화면·알림 큰 아이콘
 *   public/icon-512.png            스플래시·설치 창
 *   public/icon-maskable-512.png   안드로이드 적응형 (안전영역 안으로 조금 줄인 판)
 *   public/apple-touch-icon.png    iOS 홈화면 (180)
 *   public/badge-96.png            안드로이드 상태표시줄 (투명도만 읽으므로 흰 실루엣)
 *
 * 원본은 모서리가 둥글고 그 바깥이 비어 있다. OS 가 알아서 모서리를 깎으므로
 * 아이콘은 **모서리까지 꽉 찬 정사각형**이어야 한다. 그래서 빈 자리를 배경
 * 그라데이션이 이어지도록 메운다(확산 방식 — 가장자리 색을 번지게 한 뒤 문질러 편다).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "tools", "assets", "app-logo-src.png");
const OUT = path.join(ROOT, "public");

/** 빈 자리를 가장 가까운 불투명 화소 색으로 번지게 한다 (1차 채움 — 아직 결이 남는다) */
function spread(data, W, H, known) {
  const N = [-1, 1, -W, W, -W - 1, -W + 1, W - 1, W + 1];
  for (;;) {
    const grown = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (known[p]) continue;
        let r = 0, g = 0, b = 0, n = 0;
        for (const d of N) {
          const q = p + d;
          if (q < 0 || q >= W * H) continue;
          if (Math.abs((q % W) - x) > 1) continue; // 줄이 넘어가지 않게
          if (!known[q]) continue;
          r += data[q * 4]; g += data[q * 4 + 1]; b += data[q * 4 + 2]; n++;
        }
        if (n) grown.push([p, r / n, g / n, b / n]);
      }
    }
    if (!grown.length) return;
    for (const [p, r, g, b] of grown) {
      data[p * 4] = Math.round(r); data[p * 4 + 1] = Math.round(g); data[p * 4 + 2] = Math.round(b);
      data[p * 4 + 3] = 255; known[p] = 1;
    }
  }
}

/** 채운 자리만 반복해서 문질러 편다 — 원래 그림 화소는 손대지 않는다 */
async function smooth(data, W, H, filled, rounds, sigma) {
  for (let i = 0; i < rounds; i++) {
    const blurred = await sharp(Buffer.from(data), { raw: { width: W, height: H, channels: 4 } })
      .blur(sigma).raw().toBuffer();
    for (let p = 0; p < W * H; p++) {
      if (!filled[p]) continue;
      data[p * 4] = blurred[p * 4];
      data[p * 4 + 1] = blurred[p * 4 + 1];
      data[p * 4 + 2] = blurred[p * 4 + 2];
    }
  }
}

/** 모서리까지 꽉 찬 정사각 판을 만든다. inset 은 그림을 안쪽으로 줄이는 비율(적응형용) */
async function master(size, inset = 0) {
  const inner = Math.round(size * (1 - inset * 2));
  const pad = Math.round((size - inner) / 2);
  let img = sharp(SRC).resize(inner, inner, { fit: "fill" });
  if (pad > 0 || size !== inner) {
    img = sharp(await img.png().toBuffer()).extend({
      top: pad, bottom: size - inner - pad, left: pad, right: size - inner - pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    });
  }
  const { data } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  const known = new Uint8Array(size * size);
  for (let p = 0; p < size * size; p++) known[p] = data[p * 4 + 3] > 250 ? 1 : 0;
  // 둥근 가장자리의 반투명 화소는 흰색이 섞여 있다. 몇 줄 깎아내고 다시 채워야
  // 모서리에 허연 테두리가 남지 않는다.
  for (let i = 0; i < 4; i++) {
    const eroded = Uint8Array.from(known);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        if (!known[p]) continue;
        const out =
          (x > 0 && !known[p - 1]) || (x < size - 1 && !known[p + 1]) ||
          (y > 0 && !known[p - size]) || (y < size - 1 && !known[p + size]);
        if (out) eroded[p] = 0;
      }
    }
    known.set(eroded);
  }
  const filled = new Uint8Array(size * size);
  for (let p = 0; p < size * size; p++) filled[p] = known[p] ? 0 : 1;
  spread(data, size, size, known);
  await smooth(data, size, size, filled, 3, size / 26);
  return data;
}

/** 상태표시줄 배지 — 물고기 모양만 흰색으로 오려낸다 */
async function badge(size) {
  const S = 512;
  const { data } = await sharp(SRC).resize(S, S, { fit: "fill" }).ensureAlpha()
    .raw().toBuffer({ resolveWithObject: true });
  // 배경(아주 어두운 그라데이션)은 가장 밝은 채널이 60 을 넘지 않는다
  const a = Buffer.alloc(S * S * 4);
  let x0 = S, y0 = S, x1 = -1, y1 = -1;
  for (let p = 0; p < S * S; p++) {
    const mx = Math.max(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]);
    // 둥근 가장자리의 반투명 화소는 흰색이 섞여 밝게 보인다 — 물고기가 아니다
    let v = data[p * 4 + 3] < 250 ? 0 : Math.min(1, Math.max(0, (mx - 62) / 34));
    a[p * 4] = 255; a[p * 4 + 1] = 255; a[p * 4 + 2] = 255;
    a[p * 4 + 3] = Math.round(v * 255);
    if (v > 0.5) {
      const x = p % S, y = (p / S) | 0;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const inner = Math.round(size * 0.88);
  const fish = await sharp(a, { raw: { width: S, height: S, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize(inner, inner, { fit: "inside" })
    .png().toBuffer();
  const m = await sharp(fish).metadata();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fish, left: Math.round((size - m.width) / 2), top: Math.round((size - m.height) / 2) }])
    .png({ compressionLevel: 9 });
}

const raw = (data, size) =>
  sharp(data, { raw: { width: size, height: size, channels: 4 } }).removeAlpha();

const full = await master(512);
const mask = await master(512, 0.05);

const jobs = [
  ["icon-512.png", () => raw(full, 512).png({ compressionLevel: 9 })],
  ["icon-192.png", () => raw(full, 512).resize(192, 192).png({ compressionLevel: 9 })],
  ["apple-touch-icon.png", () => raw(full, 512).resize(180, 180).png({ compressionLevel: 9 })],
  ["icon-maskable-512.png", () => raw(mask, 512).png({ compressionLevel: 9 })],
  // 예전부터 있던 원본 보관용 파일 — 로고가 바뀌면 같이 갈아 끼운다
  ["app_icon.jpg", () => raw(full, 512).jpeg({ quality: 92 })],
  ["badge-96.png", () => badge(96)]
];

for (const [name, make] of jobs) {
  const buf = await (await make()).toBuffer();
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`${name} — ${(buf.length / 1024).toFixed(1)}KB`);
}
