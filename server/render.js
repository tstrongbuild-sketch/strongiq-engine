'use strict';

/**
 * Email-safe signature HTML rendering.
 *
 * Everything here is built to survive the hostile rendering environment of
 * email clients:
 *   - table-based layout (Outlook uses Word's engine, no flex/grid)
 *   - all styling inline, no <style> blocks, no classes, no scripts
 *   - bgcolor attributes alongside CSS background for Outlook
 *   - the animated element is an <img> pointing at a server-hosted GIF; the
 *     GIF's first frame is designed to read fine where animation is disabled,
 *     so it doubles as its own static fallback.
 */

const NETWORKS = {
  linkedin: { label: 'in', name: 'LinkedIn', color: '#0a66c2' },
  twitter: { label: 'X', name: 'X / Twitter', color: '#111827' },
  instagram: { label: 'ig', name: 'Instagram', color: '#e1306c' },
  facebook: { label: 'f', name: 'Facebook', color: '#1877f2' },
  github: { label: 'gh', name: 'GitHub', color: '#111827' },
  youtube: { label: '▶', name: 'YouTube', color: '#ff0000' },
  website: { label: '🌐', name: 'Website', color: '#374151' },
};

const DEFAULTS = {
  name: 'Alex Morgan',
  title: 'Founder & CEO',
  company: 'StrongIQ',
  email: 'alex@strongiq.example',
  phone: '+1 (555) 010-2048',
  website: 'https://strongiq.example',
  address: '',
  tagline: 'Intelligence that compounds.',
  photoUrl: '',
  logoUrl: '',
  logoWidth: 200,
  template: 'house',
  animation: 'logoShimmer',
  colors: {
    primary: '#2563eb',
    accent: '#22d3ee',
    text: '#111827',
    muted: '#6b7280',
    bg: '#ffffff',
  },
  socials: {},
};

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttrUrl(url) {
  const u = String(url || '').trim();
  // Only permit safe schemes; drop javascript:/data: etc.
  if (/^(https?:|mailto:|tel:)/i.test(u) || u.startsWith('/')) {
    return escapeHtml(u);
  }
  if (u && !/^[a-z]+:/i.test(u)) return escapeHtml(`https://${u}`);
  return '';
}

function normalize(input = {}) {
  const c = input.colors || {};
  return {
    name: input.name ?? DEFAULTS.name,
    title: input.title ?? DEFAULTS.title,
    company: input.company ?? DEFAULTS.company,
    email: input.email ?? DEFAULTS.email,
    phone: input.phone ?? DEFAULTS.phone,
    website: input.website ?? DEFAULTS.website,
    address: input.address ?? DEFAULTS.address,
    tagline: input.tagline ?? DEFAULTS.tagline,
    photoUrl: input.photoUrl ?? DEFAULTS.photoUrl,
    logoUrl: input.logoUrl ?? DEFAULTS.logoUrl,
    logoWidth: Math.min(Math.max(parseInt(input.logoWidth, 10) || DEFAULTS.logoWidth, 60), 320),
    template: ['house', 'modern', 'classic', 'compact'].includes(input.template)
      ? input.template
      : DEFAULTS.template,
    animation: ['logoShimmer', 'gradientBar', 'shimmer', 'fadeTagline', 'none'].includes(input.animation)
      ? input.animation
      : DEFAULTS.animation,
    colors: {
      primary: c.primary || DEFAULTS.colors.primary,
      accent: c.accent || DEFAULTS.colors.accent,
      text: c.text || DEFAULTS.colors.text,
      muted: c.muted || DEFAULTS.colors.muted,
      bg: c.bg || DEFAULTS.colors.bg,
    },
    socials: input.socials || {},
  };
}

function socialRow(cfg) {
  const entries = Object.entries(cfg.socials || {})
    .filter(([net, url]) => NETWORKS[net] && String(url || '').trim())
    .slice(0, 7);
  if (!entries.length) return '';

  const cells = entries
    .map(([net, url]) => {
      const meta = NETWORKS[net];
      const href = escapeAttrUrl(url);
      return (
        `<td style="padding:0 6px 0 0;">` +
        `<a href="${href}" target="_blank" style="text-decoration:none;">` +
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>` +
        `<td bgcolor="${meta.color}" width="22" height="22" align="center" ` +
        `style="background:${meta.color};width:22px;height:22px;border-radius:5px;` +
        `font-family:Arial,sans-serif;font-size:11px;line-height:22px;color:#ffffff;` +
        `text-align:center;font-weight:bold;">${escapeHtml(meta.label)}</td>` +
        `</tr></table></a></td>`
      );
    })
    .join('');

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `style="margin-top:10px;"><tr>${cells}</tr></table>`
  );
}

function contactLines(cfg, anim) {
  const { colors } = cfg;
  const line = (inner) =>
    `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;` +
    `line-height:20px;color:${colors.muted};padding:1px 0;">${inner}</td></tr>`;
  const link = (href, text) =>
    `<a href="${href}" style="color:${colors.muted};text-decoration:none;">${escapeHtml(text)}</a>`;

  const rows = [];
  if (cfg.email) {
    rows.push(line(`✉&nbsp; ${link(`mailto:${escapeHtml(cfg.email)}`, cfg.email)}`));
  }
  if (cfg.phone) {
    const tel = cfg.phone.replace(/[^\d+]/g, '');
    rows.push(line(`☎&nbsp; ${link(`tel:${escapeHtml(tel)}`, cfg.phone)}`));
  }
  if (cfg.website) {
    rows.push(line(`🔗&nbsp; ${link(escapeAttrUrl(cfg.website), cfg.website.replace(/^https?:\/\//, ''))}`));
  }
  if (cfg.address) rows.push(line(`📍&nbsp; ${escapeHtml(cfg.address)}`));

  // Animated tagline (fadeTagline) replaces the plain tagline text.
  if (cfg.tagline || anim.type === 'fadeTagline') {
    if (anim.type === 'fadeTagline' && anim.url) {
      rows.push(
        `<tr><td style="padding:6px 0 1px;">` +
        `<img src="${escapeAttrUrl(anim.url)}" width="${anim.width}" height="${anim.height}" ` +
        `alt="${escapeHtml(cfg.tagline)}" style="display:block;border:0;outline:none;" /></td></tr>`
      );
    } else if (cfg.tagline) {
      rows.push(
        `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;` +
        `font-style:italic;line-height:18px;color:${colors.accent};padding:6px 0 1px;">` +
        `${escapeHtml(cfg.tagline)}</td></tr>`
      );
    }
  }
  return rows.join('');
}

// Company name: either shimmer GIF or styled text.
function companyBlock(cfg, anim) {
  if (anim.type === 'shimmer' && anim.url) {
    return (
      `<img src="${escapeAttrUrl(anim.url)}" width="${anim.width}" height="${anim.height}" ` +
      `alt="${escapeHtml(cfg.company)}" style="display:block;border:0;outline:none;margin:2px 0;" />`
    );
  }
  return (
    `<span style="font-family:Arial,Helvetica,sans-serif;font-size:15px;` +
    `font-weight:bold;color:${cfg.colors.primary};">${escapeHtml(cfg.company)}</span>`
  );
}

// Divider bar: either gradientBar GIF or a flat colored rule.
function dividerBlock(cfg, anim, width) {
  if (anim.type === 'gradientBar' && anim.url) {
    return (
      `<img src="${escapeAttrUrl(anim.url)}" width="${anim.width}" height="${anim.height}" ` +
      `alt="" style="display:block;border:0;outline:none;width:${anim.width}px;height:${anim.height}px;" />`
    );
  }
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${width}"><tr>` +
    `<td bgcolor="${cfg.colors.primary}" height="3" ` +
    `style="background:${cfg.colors.primary};height:3px;font-size:0;line-height:0;">&nbsp;</td>` +
    `</tr></table>`
  );
}

function photoCell(cfg, size) {
  if (!cfg.photoUrl) return '';
  return (
    `<td valign="top" style="padding-right:18px;">` +
    `<img src="${escapeAttrUrl(cfg.photoUrl)}" width="${size}" height="${size}" ` +
    `alt="${escapeHtml(cfg.name)}" ` +
    `style="display:block;border:0;outline:none;width:${size}px;height:${size}px;` +
    `border-radius:8px;object-fit:cover;" /></td>`
  );
}

// Wordmark / brand logo shown at natural aspect ratio (not cropped like the
// square avatar). height:auto keeps the wordmark proportions intact. When the
// logoShimmer animation is active, the animated GIF replaces the static logo.
function logoImg(cfg) {
  const anim = cfg._anim || {};
  const animated = anim.target === 'logo' && anim.url;
  const src = animated ? anim.url : cfg.logoUrl;
  if (!src) return '';
  const w = animated ? anim.width : cfg.logoWidth;
  const hAttr = animated ? ` height="${anim.height}"` : '';
  const hStyle = animated ? `height:${anim.height}px;` : 'height:auto;';
  return (
    `<img src="${escapeAttrUrl(src)}" width="${w}"${hAttr} ` +
    `alt="${escapeHtml(cfg.company)}" ` +
    `style="display:block;border:0;outline:none;width:${w}px;${hStyle}" />`
  );
}

function logoBanner(cfg, marginTop) {
  const img = logoImg(cfg);
  if (!img) return '';
  return `<div style="margin:${marginTop || 0}px 0 8px;">${img}</div>`;
}

function nameTitle(cfg) {
  const rows = [
    `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:19px;` +
    `font-weight:bold;line-height:24px;color:${cfg.colors.text};padding-bottom:1px;">` +
    `${escapeHtml(cfg.name)}</td></tr>`,
  ];
  if (cfg.title) {
    rows.push(
      `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;` +
      `line-height:18px;color:${cfg.colors.muted};padding-bottom:2px;">` +
      `${escapeHtml(cfg.title)}</td></tr>`
    );
  }
  rows.push(`<tr><td style="padding-bottom:4px;">${companyBlock(cfg, cfg._anim)}</td></tr>`);
  return rows.join('');
}

/* ----------------------------- templates ------------------------------ */

function templateModern(cfg) {
  const anim = cfg._anim;
  const details =
    logoBanner(cfg) +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0">` +
    nameTitle(cfg) +
    `</table>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">` +
    contactLines(cfg, anim) +
    `</table>` +
    socialRow(cfg);

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `style="background:${cfg.colors.bg};" bgcolor="${cfg.colors.bg}"><tr>` +
    `<td valign="top" width="4" bgcolor="${cfg.colors.primary}" ` +
    `style="background:${cfg.colors.primary};width:4px;border-radius:4px;">&nbsp;</td>` +
    `<td valign="top" style="padding:2px 0 2px 16px;"><table role="presentation" ` +
    `cellpadding="0" cellspacing="0" border="0"><tr>` +
    photoCell(cfg, 84) +
    `<td valign="top">${details}</td></tr></table>` +
    `<div style="margin-top:12px;">${dividerBlock(cfg, anim, 440)}</div>` +
    `</td></tr></table>`
  );
}

function templateClassic(cfg) {
  const anim = cfg._anim;
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `style="background:${cfg.colors.bg};" bgcolor="${cfg.colors.bg}"><tr>` +
    photoCell(cfg, 96) +
    `<td valign="top" style="border-left:2px solid ${cfg.colors.primary};padding-left:18px;">` +
    logoBanner(cfg) +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0">` +
    nameTitle(cfg) +
    `</table>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;">` +
    contactLines(cfg, anim) +
    `</table>` +
    socialRow(cfg) +
    `<div style="margin-top:10px;">${dividerBlock(cfg, anim, 360)}</div>` +
    `</td></tr></table>`
  );
}

function templateCompact(cfg) {
  const anim = cfg._anim;
  const nameLine =
    `<span style="font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;` +
    `color:${cfg.colors.text};">${escapeHtml(cfg.name)}</span>` +
    (cfg.title
      ? `<span style="font-family:Arial,Helvetica,sans-serif;font-size:13px;color:${cfg.colors.muted};"> · ${escapeHtml(cfg.title)}</span>`
      : '');

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `style="background:${cfg.colors.bg};" bgcolor="${cfg.colors.bg}"><tr>` +
    `<td valign="top">` +
    logoBanner(cfg) +
    `<div style="padding-bottom:2px;">${nameLine}</div>` +
    `<div style="padding-bottom:4px;">${companyBlock(cfg, anim)}</div>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0">` +
    contactLines(cfg, anim) +
    `</table>` +
    socialRow(cfg) +
    `<div style="margin-top:8px;">${dividerBlock(cfg, anim, 320)}</div>` +
    `</td></tr></table>`
  );
}

// "House" template — matches the StrongIQ signature: logo on the left, a rust
// vertical rule, then name / ROLE (accent caps) / phone · email / website.
function houseContact(cfg) {
  const { colors } = cfg;
  const link = (href, text, color, bold) =>
    `<a href="${href}" style="color:${color};text-decoration:none;${bold ? 'font-weight:bold;' : ''}">${escapeHtml(text)}</a>`;
  const bits = [];
  if (cfg.phone) {
    const tel = cfg.phone.replace(/[^\d+]/g, '');
    bits.push(link(`tel:${escapeHtml(tel)}`, cfg.phone, colors.muted));
  }
  if (cfg.email) bits.push(link(`mailto:${escapeHtml(cfg.email)}`, cfg.email, colors.muted));
  const line1 = bits.length
    ? `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;` +
      `line-height:20px;color:${colors.muted};padding-top:10px;">${bits.join(' &nbsp;·&nbsp; ')}</td></tr>`
    : '';
  const web = cfg.website
    ? `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:20px;padding-top:2px;">` +
      link(escapeAttrUrl(cfg.website), cfg.website.replace(/^https?:\/\//, ''), colors.accent, true) +
      `</td></tr>`
    : '';
  return line1 + web;
}

function templateHouse(cfg) {
  const { colors } = cfg;
  const logo = logoImg(cfg);
  const name =
    `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;` +
    `line-height:22px;color:${colors.text};">${escapeHtml(cfg.name)}</td></tr>`;
  const role = cfg.title
    ? `<tr><td style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;` +
      `letter-spacing:0.14em;text-transform:uppercase;color:${colors.accent};padding-top:3px;">` +
      `${escapeHtml(cfg.title)}</td></tr>`
    : '';
  const details =
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${name}${role}</table>` +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0">${houseContact(cfg)}</table>` +
    socialRow(cfg);

  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ` +
    `style="background:${colors.bg};" bgcolor="${colors.bg}"><tr>` +
    (logo ? `<td valign="middle" style="padding-right:22px;">${logo}</td>` : '') +
    `<td valign="middle" style="border-left:2px solid ${colors.accent};padding-left:22px;">` +
    `${details}</td></tr></table>`
  );
}

const TEMPLATES = {
  house: templateHouse,
  modern: templateModern,
  classic: templateClassic,
  compact: templateCompact,
};

/**
 * Render the email-safe signature HTML fragment.
 * @param {object} input signature config
 * @param {object} anim  { type, url, width, height } for the hosted GIF (optional)
 */
function renderSignatureHtml(input, anim = { type: 'none' }) {
  const cfg = normalize(input);
  cfg._anim = anim && anim.url ? { type: cfg.animation, ...anim } : { type: 'none' };
  const tmpl = TEMPLATES[cfg.template] || templateModern;
  return tmpl(cfg).trim();
}

/** A standalone, shareable HTML page that showcases the signature. */
function renderSharePage(input, anim, meta = {}) {
  const cfg = normalize(input);
  const sig = renderSignatureHtml(input, anim);
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>${escapeHtml(cfg.name)} — email signature</title>
<style>
  body{margin:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;}
  .wrap{max-width:640px;margin:40px auto;padding:0 20px;}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:32px;box-shadow:0 10px 30px rgba(0,0,0,.06);}
  h1{font-size:15px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin:0 0 20px;}
  .foot{margin-top:18px;font-size:12px;color:#9ca3af;text-align:center;}
</style></head>
<body><div class="wrap"><div class="card">
<h1>Email signature</h1>
${sig}
</div>
<p class="foot">Generated ${escapeHtml(meta.date || '')} · paste-ready HTML available in the generator.</p>
</div></body></html>`;
}

module.exports = {
  renderSignatureHtml,
  renderSharePage,
  normalize,
  NETWORKS,
  DEFAULTS,
  escapeHtml,
};
