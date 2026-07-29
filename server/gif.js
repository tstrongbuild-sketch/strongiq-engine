'use strict';

/**
 * Server-side animated GIF generation.
 *
 * These GIFs are the "hosted animation" that gets embedded into the exported
 * email signature. Real email clients (Gmail, Outlook, Apple Mail) strip
 * <script> and most CSS animation, but they *do* render animated GIFs, so
 * this is what actually moves inside a recipient's inbox. The on-page preview
 * uses CSS for a crisp look; the exported HTML points at one of these GIFs.
 */

const { createCanvas } = require('@napi-rs/canvas');
const gifenc = require('gifenc');

const { GIFEncoder, quantize, applyPalette } = gifenc;

const FONT_STACK = 'sans-serif';

function clampHex(hex, fallback) {
  if (typeof hex === 'string' && /^#?[0-9a-fA-F]{6}$/.test(hex.trim())) {
    const h = hex.trim();
    return h.startsWith('#') ? h : `#${h}`;
  }
  return fallback;
}

function hexToRgb(hex) {
  const h = clampHex(hex, '#000000').slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function mix(a, b, t) {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const r = Math.round(ca.r + (cb.r - ca.r) * t);
  const g = Math.round(ca.g + (cb.g - ca.g) * t);
  const bl = Math.round(ca.b + (cb.b - ca.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function encodeFrames(width, height, frames, delay) {
  const enc = GIFEncoder();
  for (const data of frames) {
    // gifenc wants a flat RGBA Uint8ClampedArray/Uint8Array.
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    enc.writeFrame(index, width, height, { palette, delay });
  }
  enc.finish();
  return Buffer.from(enc.bytes());
}

/**
 * Animated gradient underline/divider bar. A soft highlight sweeps across a
 * gradient from primary -> accent. Great as a brand divider under the details.
 */
function gradientBar(opts) {
  const width = Math.min(Math.max(opts.width || 460, 120), 900);
  const height = 8;
  const frameCount = 24;
  const primary = clampHex(opts.primary, '#2563eb');
  const accent = clampHex(opts.accent, '#22d3ee');
  const bg = clampHex(opts.bg, '#ffffff');

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const frames = [];

  for (let f = 0; f < frameCount; f++) {
    const t = f / frameCount;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, primary);
    grad.addColorStop(1, accent);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 2, width, 4);

    // Moving highlight band.
    const cx = ((t * 1.6) % 1.3 - 0.15) * width;
    const hl = ctx.createLinearGradient(cx - 70, 0, cx + 70, 0);
    hl.addColorStop(0, 'rgba(255,255,255,0)');
    hl.addColorStop(0.5, 'rgba(255,255,255,0.85)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.fillRect(0, 2, width, 4);

    frames.push(ctx.getImageData(0, 0, width, height).data);
  }

  return { buffer: encodeFrames(width, height, frames, 60), width, height };
}

/**
 * Shimmering brand/logo text. The word is drawn in the primary color and a
 * bright band sweeps across it, giving a metallic "shine" pulse.
 */
function shimmerText(opts) {
  const text = (opts.text || 'Your Company').slice(0, 40);
  const height = 44;
  const fontPx = 26;
  const bg = clampHex(opts.bg, '#ffffff');
  const primary = clampHex(opts.primary, '#111827');
  const accent = clampHex(opts.accent, '#2563eb');
  const frameCount = 26;

  // Measure with a temp canvas.
  const tmp = createCanvas(10, 10).getContext('2d');
  tmp.font = `700 ${fontPx}px ${FONT_STACK}`;
  const textW = Math.ceil(tmp.measureText(text).width);
  const pad = 4;
  const width = Math.min(Math.max(textW + pad * 2, 80), 900);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const frames = [];

  for (let f = 0; f < frameCount; f++) {
    const t = f / frameCount;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    ctx.font = `700 ${fontPx}px ${FONT_STACK}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = primary;
    ctx.fillText(text, pad, height / 2 + 1);

    // Shine band, clipped to the drawn glyphs via source-atop.
    const sweep = (t * 1.4 - 0.2) * (width + 160) - 80;
    const shine = ctx.createLinearGradient(sweep - 60, 0, sweep + 60, 0);
    shine.addColorStop(0, 'rgba(255,255,255,0)');
    shine.addColorStop(0.5, accent);
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = shine;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    frames.push(ctx.getImageData(0, 0, width, height).data);
  }

  return { buffer: encodeFrames(width, height, frames, 55), width, height };
}

/**
 * Tagline that fades in, holds, and fades out on a loop. Good for a rotating
 * value prop or slogan under the name block.
 */
function fadeTagline(opts) {
  const text = (opts.text || 'Building something great').slice(0, 60);
  const height = 30;
  const fontPx = 16;
  const bg = clampHex(opts.bg, '#ffffff');
  const color = clampHex(opts.accent, '#2563eb');
  const frameCount = 30;

  const tmp = createCanvas(10, 10).getContext('2d');
  tmp.font = `600 ${fontPx}px ${FONT_STACK}`;
  const textW = Math.ceil(tmp.measureText(text).width);
  const width = Math.min(Math.max(textW + 12, 80), 900);

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const frames = [];
  const base = hexToRgb(color);

  for (let f = 0; f < frameCount; f++) {
    const t = f / frameCount;
    // Triangle-ish alpha envelope: fade in, hold, fade out.
    let alpha;
    if (t < 0.25) alpha = t / 0.25;
    else if (t < 0.75) alpha = 1;
    else alpha = 1 - (t - 0.75) / 0.25;
    alpha = Math.max(0.05, alpha);

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);
    ctx.font = `600 ${fontPx}px ${FONT_STACK}`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = `rgba(${base.r},${base.g},${base.b},${alpha.toFixed(3)})`;
    ctx.fillText(text, 4, height / 2 + 1);

    frames.push(ctx.getImageData(0, 0, width, height).data);
  }

  return { buffer: encodeFrames(width, height, frames, 70), width, height };
}

const GENERATORS = {
  gradientBar,
  shimmer: shimmerText,
  fadeTagline,
};

/**
 * @param {string} type one of: gradientBar | shimmer | fadeTagline
 * @param {object} opts { text, primary, accent, bg, width }
 * @returns {{ buffer: Buffer, width: number, height: number }}
 */
function generateAnimation(type, opts = {}) {
  const gen = GENERATORS[type] || gradientBar;
  return gen(opts);
}

module.exports = { generateAnimation, GENERATORS };
