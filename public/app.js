'use strict';

/* StrongIQ Animated Email Signature Studio — front-end controller.
 * Live preview uses CSS animation; export calls the API which returns
 * paste-ready HTML backed by a server-hosted animated GIF. */

const NETWORKS = {
  linkedin: { label: 'in', color: '#0a66c2' },
  twitter: { label: 'X', color: '#111827' },
  github: { label: 'gh', color: '#111827' },
  instagram: { label: 'ig', color: '#e1306c' },
  facebook: { label: 'f', color: '#1877f2' },
  youtube: { label: '▶', color: '#ff0000' },
};

const state = {
  name: 'Alex Morgan',
  title: 'Founder & CEO',
  company: 'StrongIQ',
  email: 'alex@strongiq.com',
  phone: '+1 (555) 010-2048',
  website: 'strongiq.com',
  address: '',
  tagline: 'Intelligence that compounds.',
  photoUrl: '',
  logoUrl: '/samples/strongiq-logo.png',
  logoWidth: 190,
  template: 'modern',
  animation: 'gradientBar',
  colors: { primary: '#121721', accent: '#a9784b', text: '#121721', muted: '#6e7076', bg: '#f5f2ec' },
  socials: { linkedin: 'linkedin.com/in/alexmorgan', twitter: '', github: 'github.com/alexmorgan' },
};

const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
const withProto = (u) => {
  const t = String(u || '').trim();
  if (!t) return '';
  return /^[a-z]+:\/\//i.test(t) || t.startsWith('mailto:') || t.startsWith('tel:') ? t : `https://${t}`;
};

/* ------------------------------ live preview ----------------------------- */

function badges() {
  const items = Object.entries(state.socials)
    .filter(([net, url]) => NETWORKS[net] && url.trim())
    .map(([net, url]) => {
      const m = NETWORKS[net];
      return `<a class="sig-badge" href="${esc(withProto(url))}" style="background:${m.color}">${esc(m.label)}</a>`;
    })
    .join('');
  return items ? `<div class="sig-badges">${items}</div>` : '';
}

function companyMarkup() {
  const { colors, animation, company } = state;
  if (animation === 'shimmer') {
    return `<span class="sig-company anim-shimmer" style="--sc-primary:${colors.primary};--sc-accent:${colors.accent}">${esc(company)}</span>`;
  }
  return `<span class="sig-company" style="color:${colors.primary}">${esc(company)}</span>`;
}

function taglineMarkup() {
  const { colors, animation, tagline } = state;
  if (!tagline && animation !== 'fadeTagline') return '';
  const cls = animation === 'fadeTagline' ? 'anim-fade' : '';
  return `<div class="sig-title ${cls}" style="color:${colors.accent};font-style:italic;margin-top:6px">${esc(tagline)}</div>`;
}

function barMarkup(width) {
  const { colors, animation } = state;
  if (animation === 'gradientBar') {
    return `<div class="anim-bar" style="--sc-primary:${colors.primary};--sc-accent:${colors.accent};max-width:${width}px;margin-top:12px"></div>`;
  }
  return `<div style="height:3px;background:${colors.primary};max-width:${width}px;margin-top:12px"></div>`;
}

function contactMarkup() {
  const { colors } = state;
  const rows = [];
  const line = (inner) => `<div style="color:${colors.muted}">${inner}</div>`;
  if (state.email) rows.push(line(`✉&nbsp; <a href="mailto:${esc(state.email)}" style="color:${colors.muted}">${esc(state.email)}</a>`));
  if (state.phone) rows.push(line(`☎&nbsp; ${esc(state.phone)}`));
  if (state.website) rows.push(line(`🔗&nbsp; <a href="${esc(withProto(state.website))}" style="color:${colors.muted}">${esc(state.website.replace(/^https?:\/\//, ''))}</a>`));
  if (state.address) rows.push(line(`📍&nbsp; ${esc(state.address)}`));
  return `<div class="sig-contact" style="margin-top:6px">${rows.join('')}</div>`;
}

function photoMarkup(size) {
  if (!state.photoUrl) return '';
  return `<img class="sig-photo" src="${esc(state.photoUrl)}" alt="" style="width:${size}px;height:${size}px;margin-right:18px" />`;
}

function logoMarkup() {
  if (!state.logoUrl) return '';
  return `<img src="${esc(state.logoUrl)}" alt="${esc(state.company)}" style="display:block;width:${state.logoWidth}px;height:auto;margin:0 0 8px" />`;
}

function renderPreview() {
  const { colors, template } = state;
  const nameBlock =
    `<div class="sig-name" style="color:${colors.text}">${esc(state.name)}</div>` +
    (state.title ? `<div class="sig-title" style="color:${colors.muted}">${esc(state.title)}</div>` : '') +
    `<div style="margin-top:4px">${companyMarkup()}</div>`;

  const logo = logoMarkup();
  let html = '';
  if (template === 'compact') {
    html =
      `<div class="sig" style="background:${colors.bg};padding:4px">` +
      logo +
      `<div><span class="sig-name" style="font-size:15px;color:${colors.text}">${esc(state.name)}</span>` +
      (state.title ? ` <span style="color:${colors.muted};font-size:13px">· ${esc(state.title)}</span>` : '') + `</div>` +
      `<div style="margin-top:2px">${companyMarkup()}</div>` +
      contactMarkup() + taglineMarkup() + badges() + barMarkup(320) +
      `</div>`;
  } else if (template === 'classic') {
    html =
      `<div class="sig" style="background:${colors.bg};display:flex;padding:4px">` +
      photoMarkup(96) +
      `<div style="border-left:2px solid ${colors.primary};padding-left:18px">` +
      logo + nameBlock + contactMarkup() + taglineMarkup() + badges() + barMarkup(340) +
      `</div></div>`;
  } else {
    html =
      `<div class="sig" style="background:${colors.bg};display:flex;padding:4px">` +
      `<div style="width:4px;border-radius:4px;background:${colors.primary};margin-right:16px"></div>` +
      `<div style="flex:1">` +
      logo +
      `<div style="display:flex">${photoMarkup(84)}<div>${nameBlock}${contactMarkup()}${taglineMarkup()}${badges()}</div></div>` +
      barMarkup(440) +
      `</div></div>`;
  }
  $('#signature-preview').innerHTML = html;
  $('#mm-name').textContent = state.name || 'You';
}

/* ------------------------------- form wiring ----------------------------- */

function bindText(id, key) {
  const el = $(id);
  el.value = state[key];
  el.addEventListener('input', () => { state[key] = el.value; renderPreview(); });
}
function bindSocial(id, net) {
  const el = $(id);
  el.value = state.socials[net] || '';
  el.addEventListener('input', () => { state.socials[net] = el.value; renderPreview(); });
}
function bindColor(id, key) {
  const el = $(id);
  el.value = state.colors[key];
  el.addEventListener('input', () => { state.colors[key] = el.value; renderPreview(); });
}

function selectChoice(rowId, attr, key) {
  const row = $(rowId);
  row.querySelectorAll('.choice').forEach((btn) => {
    btn.addEventListener('click', () => {
      row.querySelectorAll('.choice').forEach((b) => b.setAttribute('aria-checked', 'false'));
      btn.setAttribute('aria-checked', 'true');
      state[key] = btn.dataset[attr];
      renderPreview();
    });
  });
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ----------------------------- photo & logo ------------------------------ */

async function uploadDataUrl(dataUrl) {
  const r = await fetch('/api/assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'upload failed');
  return data.url;
}

function readFileDataUrl(file) {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(file);
  });
}

// Wires an upload control that stores its hosted URL into state[stateKey].
function setupUpload({ inputId, btnId, clearId, previewId, stateKey, label }) {
  const input = $(inputId);
  const preview = $(previewId);
  $(btnId).addEventListener('click', () => input.click());
  $(clearId).addEventListener('click', () => {
    state[stateKey] = '';
    preview.innerHTML = '✚';
    $(clearId).hidden = true;
    renderPreview();
  });
  input.addEventListener('change', async () => {
    const file = input.files[0];
    if (!file) return;
    const dataUrl = await readFileDataUrl(file);
    preview.innerHTML = `<img src="${dataUrl}" alt="" />`;
    try {
      state[stateKey] = await uploadDataUrl(dataUrl);
      $(clearId).hidden = false;
      renderPreview();
      toast(`${label} hosted ✓`);
    } catch (e) {
      toast('Upload failed: ' + e.message);
    }
  });
}

function setupPhoto() {
  setupUpload({ inputId: '#f-photo', btnId: '#photo-btn', clearId: '#photo-clear',
    previewId: '#photo-preview', stateKey: 'photoUrl', label: 'Photo' });

  setupUpload({ inputId: '#f-logo', btnId: '#logo-btn', clearId: '#logo-clear',
    previewId: '#logo-preview', stateKey: 'logoUrl', label: 'Logo' });

  // One-click: use the bundled StrongIQ wordmark (served from /samples).
  $('#logo-sample').addEventListener('click', () => {
    state.logoUrl = '/samples/strongiq-logo.png';
    $('#logo-preview').innerHTML = `<img src="${state.logoUrl}" alt="StrongIQ" />`;
    $('#logo-clear').hidden = false;
    renderPreview();
    toast('StrongIQ logo applied ✓');
  });

  // Logo width slider.
  const w = $('#f-logowidth');
  w.value = state.logoWidth;
  w.addEventListener('input', () => { state.logoWidth = parseInt(w.value, 10); renderPreview(); });

  // Reflect the pre-loaded StrongIQ logo in its preview box on load.
  if (state.logoUrl) {
    $('#logo-preview').innerHTML = `<img src="${state.logoUrl}" alt="StrongIQ" />`;
    $('#logo-clear').hidden = false;
  }
}

/* -------------------------------- generate ------------------------------- */

async function generate() {
  const btn = $('#generate-btn');
  btn.disabled = true;
  btn.textContent = 'Generating…';
  try {
    const r = await fetch('/api/signatures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(state),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'generation failed');

    $('#html-out').value = data.html;
    const links = [];
    if (data.animationUrl) links.push(`<div><span>Hosted animation:</span> <a href="${esc(data.animationUrl)}" target="_blank">${esc(data.animationUrl)}</a></div>`);
    links.push(`<div><span>Share page:</span> <a href="${esc(data.viewUrl)}" target="_blank">${esc(data.viewUrl)}</a></div>`);
    $('#export-links').innerHTML = links.join('');
    $('#open-share').href = data.viewUrl;
    $('#export').hidden = false;
    $('#export').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    toast('Signature generated & hosted ✓');
  } catch (e) {
    toast('Error: ' + e.message);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate hosted signature';
  }
}

async function copyRich() {
  // Ensure we have export HTML; if not, generate first.
  if (!$('#html-out').value) await generate();
  const html = $('#html-out').value;
  if (!html) return;
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([html], { type: 'text/plain' }),
        }),
      ]);
    } else {
      await navigator.clipboard.writeText(html);
    }
    toast('Copied — paste into your email signature settings');
  } catch (e) {
    toast('Copy failed — select the HTML box and copy manually');
  }
}

async function copyHtml() {
  const html = $('#html-out').value;
  if (!html) return;
  try {
    await navigator.clipboard.writeText(html);
    toast('HTML copied ✓');
  } catch {
    $('#html-out').select();
    document.execCommand('copy');
    toast('HTML copied ✓');
  }
}

/* ---------------------------------- init --------------------------------- */

function init() {
  bindText('#f-name', 'name');
  bindText('#f-title', 'title');
  bindText('#f-company', 'company');
  bindText('#f-email', 'email');
  bindText('#f-phone', 'phone');
  bindText('#f-website', 'website');
  bindText('#f-address', 'address');
  bindText('#f-tagline', 'tagline');

  bindSocial('#s-linkedin', 'linkedin');
  bindSocial('#s-twitter', 'twitter');
  bindSocial('#s-github', 'github');
  bindSocial('#s-instagram', 'instagram');
  bindSocial('#s-facebook', 'facebook');
  bindSocial('#s-youtube', 'youtube');

  bindColor('#c-primary', 'primary');
  bindColor('#c-accent', 'accent');
  bindColor('#c-text', 'text');
  bindColor('#c-muted', 'muted');
  bindColor('#c-bg', 'bg');

  selectChoice('#template-row', 'template', 'template');
  selectChoice('#animation-row', 'animation', 'animation');

  // color presets
  $('#preset-row').querySelectorAll('.preset').forEach((p) => {
    p.addEventListener('click', () => {
      const [primary, accent, text, muted, bg] = p.dataset.p.split(',').map((h) => `#${h}`);
      Object.assign(state.colors, { primary, accent, text, muted, bg });
      $('#c-primary').value = primary; $('#c-accent').value = accent;
      $('#c-text').value = text; $('#c-muted').value = muted; $('#c-bg').value = bg;
      renderPreview();
    });
  });

  // preview light/dark frame
  $('#theme-seg').querySelectorAll('.seg-btn').forEach((b) => {
    b.addEventListener('click', () => {
      $('#theme-seg').querySelectorAll('.seg-btn').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      $('#mail-frame').classList.toggle('dark', b.dataset.bg === 'dark');
    });
  });

  setupPhoto();
  $('#generate-btn').addEventListener('click', generate);
  $('#copy-rich-btn').addEventListener('click', copyRich);
  $('#copy-html-btn').addEventListener('click', copyHtml);

  renderPreview();
}

document.addEventListener('DOMContentLoaded', init);
