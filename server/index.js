'use strict';

const path = require('path');
const express = require('express');

const store = require('./store');
const { generateAnimation, logoShimmer } = require('./gif');
const { renderSignatureHtml, renderSharePage, normalize } = require('./render');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB per uploaded photo/logo

app.use(express.json({ limit: '8mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

/* ------------------------------- helpers ------------------------------- */

function baseUrl(req) {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// Which text a given animation type animates.
function animationText(cfg) {
  if (cfg.animation === 'shimmer') return cfg.company || 'Your Company';
  if (cfg.animation === 'fadeTagline') return cfg.tagline || 'Your tagline here';
  return '';
}

// Map a logo URL (already absolutized) back to a local file we can rasterize:
//   .../samples/<f>  -> public/samples/<f>   (bundled assets)
//   .../a/<f>        -> DATA_DIR/assets/<f>   (uploaded assets)
function resolveLogoPath(logoUrl) {
  if (!logoUrl) return null;
  let pathname;
  try {
    pathname = new URL(logoUrl).pathname;
  } catch {
    pathname = String(logoUrl);
  }
  let m = pathname.match(/\/samples\/([A-Za-z0-9._-]+)$/);
  if (m) return path.join(__dirname, '..', 'public', 'samples', m[1]);
  m = pathname.match(/\/a\/([A-Za-z0-9._-]+)$/);
  if (m) return path.join(store.DATA_DIR, 'assets', m[1]);
  return null;
}

// Build (and host) the animated GIF for a signature config, if any.
async function buildAnimationAsset(cfg) {
  if (!cfg.animation || cfg.animation === 'none') return null;

  // Logo shimmer animates the actual logo image and replaces the static logo.
  if (cfg.animation === 'logoShimmer') {
    const logoPath = resolveLogoPath(cfg.logoUrl);
    if (!logoPath || !require('fs').existsSync(logoPath)) return null;
    const { buffer, width, height } = await logoShimmer({
      logoPath,
      bg: cfg.colors.bg,
      width: cfg.logoWidth || 200,
    });
    const asset = store.saveAsset(buffer, 'gif');
    return { asset, width, height, target: 'logo' };
  }

  const { buffer, width, height } = generateAnimation(cfg.animation, {
    text: animationText(cfg),
    primary: cfg.colors.primary,
    accent: cfg.colors.accent,
    bg: cfg.colors.bg,
    width: 440,
  });
  return { asset: store.saveAsset(buffer, 'gif'), width, height };
}

// Relative asset paths (e.g. the bundled sample logo "/samples/..") must become
// absolute in the exported email HTML, or they break in recipients' inboxes.
function absolutizeAssets(body, base) {
  const fix = (u) => (typeof u === 'string' && u.startsWith('/') ? base + u : u);
  return { ...body, photoUrl: fix(body.photoUrl), logoUrl: fix(body.logoUrl) };
}

function decodeDataUrl(dataUrl) {
  const m = /^data:(image\/(png|jpe?g|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(
    String(dataUrl || '').trim()
  );
  if (!m) return null;
  const mime = m[1];
  const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
  const buffer = Buffer.from(m[3], 'base64');
  if (buffer.length === 0 || buffer.length > MAX_UPLOAD_BYTES) return null;
  return { buffer, ext };
}

/* -------------------------------- routes ------------------------------- */

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Upload a photo/logo -> returns a hosted URL (emails need hosted images).
app.post('/api/assets', (req, res) => {
  const decoded = decodeDataUrl(req.body && req.body.dataUrl);
  if (!decoded) {
    return res.status(400).json({ error: 'Expected a base64 image data URL under 5 MB.' });
  }
  const asset = store.saveAsset(decoded.buffer, decoded.ext);
  res.json({ url: `${baseUrl(req)}/a/${asset.filename}`, filename: asset.filename });
});

// Create a signature: generates + hosts the animated GIF, stores the record,
// returns paste-ready email HTML plus hosted/share URLs.
app.post('/api/signatures', async (req, res) => {
  try {
    const base = baseUrl(req);
    const body = absolutizeAssets(req.body || {}, base);
    const cfg = normalize(body);
    const built = await buildAnimationAsset(cfg);

    const anim = built
      ? {
          type: cfg.animation,
          url: `${base}/a/${built.asset.filename}`,
          width: built.width,
          height: built.height,
          target: built.target || null,
        }
      : { type: 'none' };

    const html = renderSignatureHtml(body, anim);
    const record = store.saveSignature({
      config: cfg,
      animation: built ? { filename: built.asset.filename, ...anim } : null,
    });

    res.json({
      id: record.id,
      html,
      animationUrl: built ? anim.url : null,
      viewUrl: `${base}/s/${record.id}`,
      htmlUrl: `${base}/api/signatures/${record.id}/html`,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to build signature.' });
  }
});

// Preview HTML without persisting — used for iterative live rendering.
app.post('/api/preview', async (req, res) => {
  try {
    const base = baseUrl(req);
    const body = absolutizeAssets(req.body || {}, base);
    const cfg = normalize(body);
    const built = await buildAnimationAsset(cfg);
    const anim = built
      ? { type: cfg.animation, url: `${base}/a/${built.asset.filename}`, width: built.width, height: built.height, target: built.target || null }
      : { type: 'none' };
    res.json({ html: renderSignatureHtml(body, anim), animationUrl: built ? anim.url : null });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to preview.' });
  }
});

// Serve a hosted asset (animated GIF or uploaded photo).
app.get('/a/:filename', (req, res) => {
  const asset = store.readAsset(req.params.filename);
  if (!asset) return res.status(404).send('Not found');
  res.setHeader('Content-Type', asset.mime);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(asset.buffer);
});

// Raw email HTML for a stored signature.
app.get('/api/signatures/:id/html', (req, res) => {
  const rec = store.getSignature(req.params.id);
  if (!rec) return res.status(404).send('Not found');
  const html = renderSignatureHtml(rec.config, rec.animation || { type: 'none' });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// Shareable showcase page for a stored signature.
app.get('/s/:id', (req, res) => {
  const rec = store.getSignature(req.params.id);
  if (!rec) return res.status(404).send('Not found');
  const page = renderSharePage(rec.config, rec.animation || { type: 'none' }, {
    date: (rec.createdAt || '').slice(0, 10),
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(page);
});

if (require.main === module) {
  store.ensureDirs();
  app.listen(PORT, () => {
    console.log(`StrongIQ signature engine listening on http://localhost:${PORT}`);
  });
}

module.exports = app;
