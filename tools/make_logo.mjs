// Draft StrongIQ logo built to the Brand Guide direction:
// wordmark-led, emphasis on "IQ", subtle structural geometry, premium.
// Palette: graphite ink + one controlled muted-bronze accent on warm stone.
// Outputs a horizontal lockup, a reversed (light) lockup, and a square mark.
import { createCanvas } from '@napi-rs/canvas';
import { writeFileSync } from 'fs';

const OUT = process.argv[2] || '.';
const INK = '#23272E';       // graphite
const INK_SOFT = '#3A3F47';
const BRONZE = '#A9784B';     // muted bronze accent
const BRONZE_DEEP = '#8A6238';
const STONE = '#F5F2EC';

// The structural mark: a graphite tile with three ascending "diagnostic" bars,
// the tallest capped in bronze — growth / measurement / intelligence.
function drawMark(ctx, x, y, s, { onDark = false } = {}) {
  const r = s * 0.22;
  // tile
  ctx.save();
  ctx.beginPath();
  const tile = onDark ? STONE : INK;
  roundRect(ctx, x, y, s, s, r);
  ctx.fillStyle = tile;
  ctx.fill();
  // bars
  const barW = s * 0.15;
  const gap = s * 0.095;
  const baseY = y + s * 0.74;
  const startX = x + s * 0.235;
  const heights = [s * 0.20, s * 0.33, s * 0.46];
  const barColor = onDark ? INK : STONE;
  heights.forEach((h, i) => {
    const bx = startX + i * (barW + gap);
    ctx.fillStyle = i === 2 ? BRONZE : barColor;
    roundRect(ctx, bx, baseY - h, barW, h, barW * 0.28);
    ctx.fill();
  });
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wordmark(ctx, x, y, fontPx, { onDark = false } = {}) {
  ctx.textBaseline = 'alphabetic';
  ctx.font = `800 ${fontPx}px sans-serif`;
  const strong = 'Strong';
  const iq = 'IQ';
  const strongColor = onDark ? STONE : INK;
  ctx.fillStyle = strongColor;
  // tighten tracking slightly by manual advance
  let cx = x;
  const track = -fontPx * 0.012;
  for (const ch of strong) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + track;
  }
  // "IQ" in bronze accent — the emphasis called for in the guide
  ctx.fillStyle = BRONZE;
  for (const ch of iq) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + track;
  }
  return cx; // right edge
}

function lockup({ onDark = false } = {}) {
  const scale = 3;
  const s = 92 * scale;                 // mark size
  const fontPx = 78 * scale;
  const padX = 34 * scale;
  const gapMW = 30 * scale;
  // measure wordmark width
  const tmp = createCanvas(10, 10).getContext('2d');
  tmp.font = `800 ${fontPx}px sans-serif`;
  const wmWidth = tmp.measureText('StrongIQ').width;
  const width = Math.ceil(padX * 2 + s + gapMW + wmWidth);
  const height = Math.ceil(s + 44 * scale);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const my = (height - s) / 2;
  drawMark(ctx, padX, my, s, { onDark });
  // baseline roughly centered to mark
  const baseline = height / 2 + fontPx * 0.35;
  wordmark(ctx, padX + s + gapMW, baseline, fontPx, { onDark });
  return canvas;
}

function markOnly({ onDark = false } = {}) {
  const scale = 4;
  const s = 200 * scale;
  const pad = 22 * scale;
  const size = s + pad * 2;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  drawMark(ctx, pad, pad, s, { onDark });
  return canvas;
}

writeFileSync(`${OUT}/strongiq-logo.png`, lockup({ onDark: false }).toBuffer('image/png'));
writeFileSync(`${OUT}/strongiq-logo-reversed.png`, lockup({ onDark: true }).toBuffer('image/png'));
writeFileSync(`${OUT}/strongiq-mark.png`, markOnly({ onDark: false }).toBuffer('image/png'));
console.log('logo assets written to', OUT);
