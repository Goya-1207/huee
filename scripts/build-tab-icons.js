// scripts/build-tab-icons.js
// 生成小程序 tabBar 图标 PNG（home/map/user × normal/selected 共 6 个）。
// 仅用 Node 内置模块（fs/path/zlib），原理：把 SVG 描边路径光栅化到 RGBA 缓冲区，再编码成 PNG。
// 用法：node scripts/build-tab-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── 输出尺寸 ──
const SIZE = 81;          // tabBar 推荐尺寸
const SS = 4;             // 超采样倍数（抗锯齿）
const N = SIZE * SS;

// ── 颜色（对应 app.wxss 变量） ──
const INK3 = [156, 160, 168];   // var(--ink-3) ≈ oklch(0.56 0.01 260)
const BRAND = [0, 133, 202];    // #0085CA

// ── PNG 编码（与 build-metro-geo.js 同套路） ──
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function pngChunk(type, payload) {
  const len = Buffer.alloc(4); len.writeUInt32BE(payload.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), payload]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  // 每行前置 filter byte (0)
  const rowLen = size * 4 + 1;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    raw[y * rowLen] = 0;
    rgba.copy(raw, y * rowLen + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0))]);
}

// ── 几何基元：返回 (x, y) 处的覆盖度 0..1 ──
// 点到线段距离的覆盖度（描边）
function lineCoverage(x, y, x0, y0, x1, y1, halfWidth) {
  const dx = x1 - x0, dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((x - x0) * dx + (y - y0) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const px = x0 + t * dx, py = y0 + t * dy;
  const ddx = x - px, ddy = y - py;
  const dist = Math.sqrt(ddx * ddx + ddy * ddy);
  if (dist >= halfWidth + 0.5) return 0;
  return Math.max(0, Math.min(1, halfWidth + 0.5 - dist));
}
// 描边多段线
function polylineCoverage(x, y, pts, halfWidth) {
  let max = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const c = lineCoverage(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], halfWidth);
    if (c > max) max = c;
  }
  return max;
}
// 描边圆
function circleCoverage(x, y, cx, cy, r, halfWidth) {
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ringDist = Math.abs(dist - r);
  if (ringDist >= halfWidth + 0.5) return 0;
  return Math.max(0, Math.min(1, halfWidth + 0.5 - ringDist));
}
// 描边弧（从 startAngle 到 endAngle，半径 r）
function arcCoverage(x, y, cx, cy, r, startAngle, endAngle, halfWidth) {
  const dx = x - cx, dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ringDist = Math.abs(dist - r);
  if (ringDist >= halfWidth + 0.5) return 0;
  let ang = Math.atan2(dy, dx);
  if (ang < 0) ang += Math.PI * 2;
  // 归一化角度区间
  let s = startAngle, e = endAngle;
  while (s < 0) s += Math.PI * 2;
  while (e <= s) e += Math.PI * 2;
  let inArc = false;
  if (s <= e) inArc = ang >= s && ang <= e;
  if (!inArc) {
    ang += Math.PI * 2;
    inArc = ang >= s && ang <= e;
  }
  if (!inArc) return 0;
  return Math.max(0, Math.min(1, halfWidth + 0.5 - ringDist));
}

// ── 图标定义（24x24 viewBox，与 utils/icon.js 的 SVG 模板一致） ──
// 所有形状先在 24x24 坐标系定义，渲染时缩放到 N x N。
const HW = 0.9;  // halfWidth = stroke-width 1.8 / 2
function homeShape(x, y) {
  // M4 11 L12 4.5 L20 11 V19.5 a1 1 0 0 1 -1 1 H15 V14.5 H9 V20.5 H5 a1 1 0 0 1 -1 -1 Z
  return polylineCoverage(x, y, [
    [4, 11], [12, 4.5], [20, 11], [20, 19.5], [19, 20.5], [15, 20.5],
    [15, 14.5], [9, 14.5], [9, 20.5], [5, 20.5], [4, 19.5], [4, 11],
  ], HW);
}
function mapShape(x, y) {
  // 外框：M9 4 L4 6 V20 L9 18 L15 20 L20 18 V4 L15 6 Z
  // 折线：M9 4 V18 ; M15 6 V20
  const outer = polylineCoverage(x, y, [
    [9, 4], [4, 6], [4, 20], [9, 18], [15, 20], [20, 18], [20, 4], [15, 6], [9, 4],
  ], HW);
  const fold1 = lineCoverage(x, y, 9, 4, 9, 18, HW);
  const fold2 = lineCoverage(x, y, 15, 6, 15, 20, HW);
  return Math.max(outer, fold1, fold2);
}
function userShape(x, y) {
  // 圆头：cx12 cy8 r4
  // 弧肩：M4.5 20 a7.5 7.5 0 0 1 15 0
  const head = circleCoverage(x, y, 12, 8, 4, HW);
  // 半圆弧（肩）：圆心 (12, 20)，半径 7.5，角度从 180° 到 360°（上半部分）
  // atan2 在弧上的点：左端 (4.5, 20) 角度=π，右端 (19.5, 20) 角度=0；上半弧覆盖角度 (π..2π)
  const shoulders = arcCoverage(x, y, 12, 20, 7.5, Math.PI, 2 * Math.PI, HW);
  return Math.max(head, shoulders);
}

const ICONS = [
  { name: 'home', shape: homeShape },
  { name: 'map', shape: mapShape },
  { name: 'user', shape: userShape },
];

// ── 渲染 ──
function renderIcon(shape, rgb) {
  // 在 N x N 超采样缓冲区上绘制，再降采样到 SIZE x SIZE
  const ssBuf = Buffer.alloc(N * N * 4);
  const scale = N / 24;  // 24x24 viewBox -> N x N
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const u = (x + 0.5) / scale;
      const v = (y + 0.5) / scale;
      const cov = shape(u, v);
      if (cov > 0) {
        const i = (y * N + x) * 4;
        ssBuf[i] = rgb[0];
        ssBuf[i + 1] = rgb[1];
        ssBuf[i + 2] = rgb[2];
        ssBuf[i + 3] = Math.round(cov * 255);
      }
    }
  }
  // 降采样（box filter）：每 SS×SS 块取平均
  const out = Buffer.alloc(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const i = ((y * SS + dy) * N + (x * SS + dx)) * 4;
          r += ssBuf[i];
          g += ssBuf[i + 1];
          b += ssBuf[i + 2];
          a += ssBuf[i + 3];
        }
      }
      const cnt = SS * SS;
      const oi = (y * SIZE + x) * 4;
      out[oi] = Math.round(r / cnt);
      out[oi + 1] = Math.round(g / cnt);
      out[oi + 2] = Math.round(b / cnt);
      out[oi + 3] = Math.round(a / cnt);
    }
  }
  return encodePng(SIZE, out);
}

// ── 输出 ──
const OUT_DIR = path.join(__dirname, '..', 'miniprogram', 'assets', 'tab');
fs.mkdirSync(OUT_DIR, { recursive: true });
for (const { name, shape } of ICONS) {
  fs.writeFileSync(path.join(OUT_DIR, `tab-${name}.png`), renderIcon(shape, INK3));
  fs.writeFileSync(path.join(OUT_DIR, `tab-${name}-on.png`), renderIcon(shape, BRAND));
  console.log(`[tab-icons] tab-${name}.png + tab-${name}-on.png`);
}
console.log(`[tab-icons] done -> ${path.relative(path.join(__dirname, '..'), OUT_DIR)}/`);
