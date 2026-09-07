# StrongIQ — Animated Email Signature Studio

Design animated email signatures with a live preview and export **paste-ready,
email-client-safe HTML** backed by **server-hosted GIF animation**.

Inspired by [customesignature.com](https://www.customesignature.com), this is a
self-contained generator: fill in a form, watch a live CSS-animated preview,
then generate a signature whose animation is served as a hosted `.gif` so it
actually moves inside Gmail, Outlook, and Apple Mail.

## Why a hosted GIF?

Email clients are a hostile rendering environment. Gmail, Outlook, and Apple
Mail strip `<script>`, most `<video>`, and heavily restrict CSS animation — the
crisp CSS effects you see in a browser simply don't run in an inbox. The **one**
thing that animates reliably everywhere is an **animated GIF**.

So the app splits the two concerns:

| Where | How it animates |
| ----- | --------------- |
| On-page live preview | CSS keyframes (crisp, instant feedback) |
| Exported email signature | A server-generated, server-hosted animated **GIF** |

The GIF's first frame is designed to read fine on its own, so it also acts as
the static fallback where animation is disabled.

## Features

- **Live preview** inside a mock email, with light/dark inbox toggle.
- **Four layouts** — **House** (the StrongIQ signature: logo · rust rule ·
  Name / ROLE / phone · email / website; the default), Modern (accent bar +
  photo), Classic (rule divider), Compact (one-line header).
- **Animations**, each rendered server-side to a hosted GIF:
  - `logoShimmer` — one slow shine sweeps across the actual logo, then rests
    (the premium default; clipped to the logo's own pixels)
  - `gradientBar` — a shimmering gradient divider bar
  - `shimmer` — a shine sweeping across the company text
  - `fadeTagline` — the tagline pulsing in and out
- **Photo upload** — a square headshot for the avatar slot, hosted on the
  server (emails can't use `data:` URLs reliably) and returned as a stable URL.
- **Brand logo (wordmark)** — a separate wide-logo slot rendered at natural
  proportions above the name, with an adjustable width. The official StrongIQ
  logo is bundled (`public/samples/strongiq-logo.png`, full-res source in
  `assets/brand/`) and applied by default; one click on **Use StrongIQ logo**
  re-applies it, or upload your own. Relative sample paths are absolutized to
  the request host so the exported email HTML points at a loadable URL.
- **Color controls** + one-click brand presets.
- **Social badges** (LinkedIn, X, GitHub, Instagram, Facebook, YouTube) rendered
  as email-safe colored cells — no external icon CDN.
- **Export**: paste-ready HTML, a hosted animation URL, and a shareable
  showcase page (`/s/:id`).
- **"Copy for Gmail"** writes rich `text/html` to the clipboard so you can paste
  straight into your signature settings.

## Email-safety of the exported HTML

- Table-based layout (Outlook uses Word's rendering engine — no flex/grid).
- All styling inline; no `<style>` blocks, classes, or scripts.
- `bgcolor` attributes alongside CSS `background` for Outlook.
- Safe URL schemes only (`http(s):`, `mailto:`, `tel:`); everything else dropped.

## Getting started

```bash
npm install
npm start          # http://localhost:3000
```

Then open the app, design your signature, and click **Generate hosted
signature**.

### Configuration

| Env var | Default | Purpose |
| ------- | ------- | ------- |
| `PORT` | `3000` | HTTP port |
| `DATA_DIR` | `./data` | Where hosted assets + signature records are written |
| `PUBLIC_BASE_URL` | derived from request | Absolute base for hosted asset URLs (set this in production so emailed image URLs are correct) |

> **Production note:** hosted assets must be reachable at a stable public URL
> for images to load in recipients' inboxes. Set `PUBLIC_BASE_URL` and serve
> `DATA_DIR` from durable storage (the default is local disk under `./data`).

## API

| Method | Path | Description |
| ------ | ---- | ----------- |
| `POST` | `/api/assets` | Upload a base64 image data URL → hosted URL |
| `POST` | `/api/signatures` | Generate + host animation, store record, return paste-ready HTML |
| `POST` | `/api/preview` | Same as above but does not persist a record |
| `GET`  | `/a/:filename` | Serve a hosted asset (GIF / photo) |
| `GET`  | `/api/signatures/:id/html` | Raw stored email HTML |
| `GET`  | `/s/:id` | Shareable showcase page |
| `GET`  | `/api/health` | Liveness check |

## Tests

```bash
npm run smoke      # boots the app and exercises every endpoint + animation type
```

## Project layout

```
server/
  index.js     Express app + routes
  gif.js       animated GIF generation (canvas + gifenc)
  render.js    email-safe signature templates
  store.js     file-backed asset + signature store
public/
  index.html   generator UI
  styles.css   studio styling
  app.js        form wiring, live CSS preview, export/clipboard
scripts/
  smoke.js     end-to-end endpoint tests
```

## Tech

Node + Express, [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) for
frame rendering, and [`gifenc`](https://github.com/mattdesl/gifenc) for GIF
encoding. No build step, no database.

## License

MIT
