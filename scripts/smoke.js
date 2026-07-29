'use strict';

/* Boots the app on an ephemeral port and exercises the core endpoints:
 * asset upload, signature generation (all animation types), hosted GIF
 * serving, share page, and stored-HTML retrieval. Exits non-zero on failure. */

const app = require('../server');

// 1x1 transparent PNG.
const PNG_1x1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  ok — ' + msg);
}

async function main() {
  const server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const json = (path, body) =>
    fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  try {
    // health
    const h = await fetch(base + '/api/health');
    assert(h.ok, 'health endpoint responds');

    // asset upload
    const up = await json('/api/assets', { dataUrl: PNG_1x1 });
    const upData = await up.json();
    assert(up.ok && /\/a\/.+\.png$/.test(upData.url), 'photo upload returns hosted URL');

    // bad upload rejected
    const bad = await json('/api/assets', { dataUrl: 'not-an-image' });
    assert(bad.status === 400, 'invalid upload rejected');

    // signature generation for every animation type
    for (const animation of ['gradientBar', 'shimmer', 'fadeTagline', 'none']) {
      const r = await json('/api/signatures', {
        name: 'Test User',
        company: 'StrongIQ',
        tagline: 'Testing signatures',
        photoUrl: upData.url,
        animation,
        template: 'modern',
        socials: { linkedin: 'linkedin.com/in/test' },
      });
      const d = await r.json();
      assert(r.ok, `signature (${animation}) generated`);
      assert(d.html.includes('Test User'), `signature (${animation}) html contains name`);
      if (animation === 'none') {
        assert(d.animationUrl === null, 'none: no animation asset');
      } else {
        assert(/\/a\/.+\.gif$/.test(d.animationUrl), `${animation}: hosted GIF url`);
        assert(d.html.includes(d.animationUrl), `${animation}: html embeds hosted GIF`);
        // fetch the hosted GIF
        const g = await fetch(d.animationUrl);
        const buf = Buffer.from(await g.arrayBuffer());
        assert(
          g.headers.get('content-type') === 'image/gif' &&
            buf.slice(0, 6).toString('ascii') === 'GIF89a',
          `${animation}: hosted GIF serves valid data`
        );
      }
      // stored HTML + share page
      const stored = await fetch(base + `/api/signatures/${d.id}/html`);
      assert((await stored.text()).includes('Test User'), `${animation}: stored HTML retrievable`);
      const share = await fetch(base + `/s/${d.id}`);
      assert(share.ok && (await share.text()).includes('<!doctype html>'), `${animation}: share page renders`);
    }

    // 404s
    const nf = await fetch(base + '/a/deadbeef.gif');
    assert(nf.status === 404, 'missing asset 404s');

    console.log('\nAll smoke tests passed.');
  } finally {
    server.close();
  }
}

main().catch((e) => {
  console.error('\n' + e.message);
  process.exit(1);
});
