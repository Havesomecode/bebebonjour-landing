import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const names = ['adam', 'mohamed', 'inaya', 'noor', 'lina'];
const catalog = JSON.parse(readFileSync('content/prenoms/catalog-excerpt.json', 'utf8'));
const esc = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

test('generated name pages are current and preserve catalog verse bytes', () => {
  const check = spawnSync(process.execPath, ['scripts/prenoms.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
  const sitemap = readFileSync('public/sitemap.xml', 'utf8');
  for (const name of names) {
    const path = `public/prenoms/${name}/index.html`;
    assert.ok(existsSync(path), path);
    const html = readFileSync(path, 'utf8');
    const md = readFileSync(`content/prenoms/${name}.md`, 'utf8');
    const title = md.match(/^title: (.*)$/m)[1];
    const desc = md.match(/^meta_description: (.*)$/m)[1];
    const canonical = `https://www.bebebonjour.com/prenoms/${name}/`;
    assert.ok(html.includes(`<title>${esc(title)}</title>`));
    assert.ok(html.includes(`<meta name="description" content="${esc(desc)}">`));
    assert.ok(html.includes(`<link rel="canonical" href="${canonical}">`));
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`));
    assert.doesNotMatch(html, /noindex|<script\b/i);
    assert.match(html, /href="\/exemple\/amal\/"/);
    assert.match(html, /href="\/#liste"/);
    assert.doesNotMatch(html, /https?:\/\/(?!www\.bebebonjour\.com\/)/);
    if (['adam', 'mohamed', 'noor'].includes(name)) {
      const quote = catalog[name === 'mohamed' ? 'muhammad' : name].religious.islam[0].verses.ar[0].quote;
      assert.ok(html.includes(quote), name);
      if (quote !== quote.normalize('NFC')) assert.ok(!html.includes(quote.normalize('NFC')), name);
    } else assert.doesNotMatch(html, /<blockquote\b/);
  }
});
