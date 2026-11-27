import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const names = ['adam', 'mohamed', 'inaya', 'noor', 'lina'];
const labels = ['Adam', 'Mohamed', 'Inaya', 'Noor', 'Lina'];
const catalog = JSON.parse(read('content/prenoms/catalog-excerpt.json'));
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function text(s) {
  return s.split(/([\u0600-\u06ff]+(?:[\s\u0600-\u06ff]*[\u0600-\u06ff])?)/g).map((part, i) => i % 2 ? `<span lang="ar" dir="rtl">${escape(part)}</span>` : escape(part)).join('');
}
function inline(s) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  return s.split(pattern).map(part => {
    if (part.startsWith('**') && part.endsWith('**')) return `<strong>${text(part.slice(2, -2))}</strong>`;
    if (part.startsWith('*') && part.endsWith('*')) return `<em>${text(part.slice(1, -1))}</em>`;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const url = link[2].replace(/^https:\/\/www\.bebebonjour\.com(?=\/)/, '');
      if (!url.startsWith('/') || url.startsWith('//')) throw new Error(`Unexpected link: ${url}`);
      return `<a href="${escape(url)}">${text(link[1])}</a>`;
    }
    return text(part);
  }).join('');
}
const looseFrench = s => s.replace(/^\s*«\s*/, '').replace(/\s*»\s*$/, '').replace(/[.\s]+$/, '').replaceAll('’', "'").normalize('NFC');
function renderBody(body, entry) {
  return body.trim().split(/\n\s*\n/).map(block => {
    const lines = block.split('\n');
    if (lines[0].startsWith('> ')) {
      if (lines.length !== 3 || lines.some(line => !line.startsWith('> '))) throw new Error('Expected a three-line verse');
      const [ar, fr, citation] = lines.map(line => line.slice(2));
      const verse = entry?.religious?.islam?.[0]?.verses;
      const originalAr = verse?.ar?.[0]?.quote;
      const originalFr = verse?.fr?.[0]?.quote;
      if (!originalAr || !originalFr || ar.normalize('NFC') !== originalAr.normalize('NFC') || looseFrench(fr) !== looseFrench(originalFr)) throw new Error('Draft verse differs from catalog');
      return `<blockquote>\n  <p class="verse-ar" lang="ar" dir="rtl">${escape(originalAr)}</p>\n  <p class="verse-fr">« ${escape(originalFr)} »</p>\n  <cite>${escape(citation)}</cite>\n</blockquote>`;
    }
    if (lines.every(line => line.startsWith('- '))) return `<ul>\n${lines.map(line => `  <li>${inline(line.slice(2))}</li>`).join('\n')}\n</ul>`;
    const heading = block.match(/^(#{1,2}) (.*)$/);
    if (heading) return `<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`;
    if (lines.length !== 1) throw new Error('Unexpected multiline paragraph');
    return `<p>${inline(block)}</p>`;
  }).join('\n');
}
function makePage(name) {
  const source = read(`content/prenoms/${name}.md`);
  const match = source.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error(`Invalid front matter: ${name}`);
  const meta = Object.fromEntries(match[1].split('\n').map(line => { const at = line.indexOf(': '); if (at < 1) throw new Error(`Invalid field: ${line}`); return [line.slice(0, at), line.slice(at + 2)]; }));
  if (meta.slug !== `/prenoms/${name}/` || !meta.title || !meta.meta_description || !catalog[meta.catalog]) throw new Error(`Invalid metadata: ${name}`);
  const url = `https://www.bebebonjour.com${meta.slug}`;
  const links = names.map((item, i) => item === name ? `<span aria-current="page">${labels[i]}</span>` : `<a href="/prenoms/${item}/">${labels[i]}</a>`).join(' · ');
  return `<!doctype html>\n<html lang="fr">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${escape(meta.title)}</title>\n  <meta name="description" content="${escape(meta.meta_description)}">\n  <link rel="canonical" href="${url}">\n  <meta property="og:type" content="article">\n  <meta property="og:title" content="${escape(meta.title)}">\n  <meta property="og:description" content="${escape(meta.meta_description)}">\n  <meta property="og:url" content="${url}">\n  <meta property="og:locale" content="fr_FR">\n  <meta property="og:site_name" content="Bébé Bonjour">\n  <meta name="theme-color" content="#f5f0e6">\n  <link rel="icon" href="/favicon.ico">\n  <link rel="stylesheet" href="/prenoms/prenoms.css">\n</head>\n<body>\n  <header class="site-header">\n    <a class="wordmark" href="/" aria-label="Bébé Bonjour, accueil"><span>Bébé</span> Bonjour</a>\n    <a class="button" href="/delivery">Commander</a>\n  </header>\n  <main><article>\n${renderBody(match[2], catalog[meta.catalog])}\n  </article></main>\n  <footer>\n    <a class="wordmark" href="/">Bébé Bonjour</a>\n    <p>Faire-part de naissance à écouter · Français &amp; arabe</p>\n    <p>© 2026 Bébé Bonjour · <a href="/confidentialite/">Confidentialité</a></p>\n    <p>Sens des prénoms : ${links}</p>\n  </footer>\n</body>\n</html>\n`;
}
const check = process.argv.slice(2);
if (check.some(arg => arg !== '--check') || check.length > 1) throw new Error('Usage: node scripts/prenoms.mjs [--check]');
let different = false;
for (const name of names) {
  const output = makePage(name);
  const path = resolve(root, `public/prenoms/${name}/index.html`);
  if (check.length) {
    if (!existsSync(path) || readFileSync(path, 'utf8') !== output) { console.error(`Out of date: ${path}`); different = true; }
  } else { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, output); }
}
if (different) process.exitCode = 1;
