'use strict';

/**
 * Tiny file-backed store for hosted assets (animated GIFs + uploaded photos)
 * and signature records. Everything lives under ./data so the process is
 * stateless-friendly and easy to wipe. No database needed for this scope.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');
const ASSET_DIR = path.join(DATA_DIR, 'assets');
const SIG_DIR = path.join(DATA_DIR, 'signatures');

const EXT_TO_MIME = {
  gif: 'image/gif',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

function ensureDirs() {
  for (const d of [DATA_DIR, ASSET_DIR, SIG_DIR]) {
    fs.mkdirSync(d, { recursive: true });
  }
}

function shortId() {
  return crypto.randomBytes(9).toString('base64url');
}

function safeName(id) {
  // Ids come from shortId (base64url) — reject anything else to avoid traversal.
  return /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : null;
}

function saveAsset(buffer, ext) {
  ensureDirs();
  const cleanExt = String(ext).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!EXT_TO_MIME[cleanExt]) throw new Error(`unsupported asset type: ${ext}`);
  const id = shortId();
  const filename = `${id}.${cleanExt}`;
  fs.writeFileSync(path.join(ASSET_DIR, filename), buffer);
  return { id, filename, ext: cleanExt, mime: EXT_TO_MIME[cleanExt] };
}

function readAsset(filename) {
  const base = path.basename(filename);
  const [id, ext] = base.split('.');
  if (!safeName(id) || !ext || !EXT_TO_MIME[ext.toLowerCase()]) return null;
  const full = path.join(ASSET_DIR, `${id}.${ext.toLowerCase()}`);
  if (!fs.existsSync(full)) return null;
  return { buffer: fs.readFileSync(full), mime: EXT_TO_MIME[ext.toLowerCase()] };
}

function saveSignature(record) {
  ensureDirs();
  const id = shortId();
  const full = { id, createdAt: new Date().toISOString(), ...record };
  fs.writeFileSync(path.join(SIG_DIR, `${id}.json`), JSON.stringify(full, null, 2));
  return full;
}

function getSignature(id) {
  if (!safeName(id)) return null;
  const full = path.join(SIG_DIR, `${id}.json`);
  if (!fs.existsSync(full)) return null;
  try {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch {
    return null;
  }
}

module.exports = {
  ensureDirs,
  saveAsset,
  readAsset,
  saveSignature,
  getSignature,
  DATA_DIR,
  EXT_TO_MIME,
};
