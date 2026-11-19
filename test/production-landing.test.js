import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

const publicSurface = `${html}\n${main}`;

test("public landing speaks as a finished service rather than a test harness", () => {
  for (const internalPhrase of [
    /TEST-A/i,
    /synth[ée]tique/i,
    /\.test\b/i,
    /paiement test/i,
    /demande test/i,
    /d[ée]mo du parcours/i,
    /jeton d’accès/i,
  ]) {
    assert.doesNotMatch(publicSurface, internalPhrase);
  }
  assert.doesNotMatch(html, /id="intake-form"|id="job-status"/);
  assert.doesNotMatch(main, /window\.prompt|createFulfillmentClient|SESSION_KEY/);
});

test("public landing has one real intake path and a listenable real example", () => {
  const intakeLinks = [...html.matchAll(/<a\b[^>]*href="\/delivery"[^>]*>[\s\S]*?<\/a>/g)];
  assert.equal(intakeLinks.length, 4, "all four public CTAs must share the intake path");
  for (const [link] of intakeLinks) assert.doesNotMatch(link, /target=/);
  assert.doesNotMatch(publicSurface, /tally\.so/i);
  assert.match(html, /href="\/exemple\/amal\/"/);
  assert.match(html, /<audio data-example-audio preload="none" src="\/exemple\/amal\/amal-fr\.mp3"><\/audio>/);
  assert.match(html, /<button class="listen" type="button" data-listen/);
  assert.match(main, /audio\.play\(\)/);
  assert.doesNotMatch(html, /href="\/demo/);
});

test("price and the paid order flow are stated without an offer password", () => {
  assert.match(html, /39&nbsp;€ en une fois/);
  const steps = [...html.matchAll(/<h3>([^<]+)<\/h3>/g)].map(([, title]) => title);
  assert.deepEqual(steps, [
    "Vous décrivez",
    "Nous lisons votre demande",
    "Vous payez 39&nbsp;€",
    "Votre annonce arrive",
  ]);
  assert.match(html, /La création commence dès que\s+le paiement est reçu\./);
  assert.match(html, /Rien n’est\s+demandé ni prélevé quand vous envoyez le formulaire\./);
  assert.doesNotMatch(publicSurface, /mot de passe|offerte|aucun paiement automatique|buy\.stripe\.com/i);
});

test("the landing tells buyers the voice is synthetic and who can open the page", () => {
  assert.match(html, /voix de synthèse/);
  assert.match(html, /Toute personne à qui vous donnez le lien\./);
  assert.match(html, /n’apparaît pas dans les\s+moteurs de recherche/);
  assert.doesNotMatch(publicSurface, /espace client|bebebonjour-ops|convex/i);
});

test("the copyright year has a no-JavaScript fallback", () => {
  assert.match(html, /<span data-year>2026<\/span>/);
});

test("landing uses the warm editorial design system without gradient decoration", () => {
  assert.match(css, /--paper:\s*#[0-9a-f]{6}/i);
  assert.match(css, /--ink:\s*#[0-9a-f]{6}/i);
  assert.match(html, /<h1[^>]*>Son prénom, révélé à la fin\.<\/h1>/);
  assert.match(css, /--forest:\s*#2f5443/i);
  assert.match(css, /--clay:\s*#94432f/i);
  for (const [family, file] of [["Newsreader", "newsreader"], ["Newsreader", "newsreader-italic"], ["Instrument Sans", "instrument-sans"]]) {
    assert.match(css, new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*["']${family}["'][^}]*url\\(["']?\/fonts\/${file}\\.woff2`, "i"));
  }
  assert.doesNotMatch(css, /https?:\/\//i);
  assert.doesNotMatch(css, /(?:linear|radial|conic)-gradient/i);
});

test("self-hosted fonts are valid WOFF2 files", async () => {
  for (const name of ["newsreader", "newsreader-italic", "instrument-sans"]) {
    const font = await readFile(new URL(`../public/fonts/${name}.woff2`, import.meta.url));
    assert.equal(font.subarray(0, 4).toString(), "wOF2");
  }
});

test("Amal player provides the three chapter phrases", () => {
  for (const phrase of ["Sa présence emplit déjà nos jours de tendresse.", "Nous lui souhaitons une vie entourée d’amour et de sérénité.", "Bienvenue Amal, notre petite lumière."]) {
    assert.ok(main.includes(phrase));
  }
  assert.match(main, /textContent/);
  assert.match(main, /currentTime/);
  assert.match(main, /duration/);
});

test("player advances chapter thirds and resets after playback", async () => {
  const handlers = {};
  const label = { textContent: "Écouter l’annonce d’Amal" };
  const icon = { textContent: "▶" };
  const chapter = { textContent: "" };
  const number = { textContent: "" };
  const phrase = { textContent: "" };
  const bars = Array.from({ length: 3 }, () => ({ style: {} }));
  const listen = {
    querySelector: (selector) => selector === "[data-listen-label]" ? label : icon,
    setAttribute: (_name, value) => { listen.pressed = value; },
    addEventListener: (event, callback) => { handlers[`button:${event}`] = callback; },
  };
  const audio = {
    duration: 90, currentTime: 0, paused: true,
    addEventListener: (event, callback) => { handlers[event] = callback; },
    play: async () => { audio.paused = false; handlers.play(); },
    pause: () => { audio.paused = true; handlers.pause(); },
  };
  const elements = { "[data-listen]": listen, "[data-example-audio]": audio,
    "[data-chapter-label]": chapter, "[data-chapter-number]": number, "[data-chapter-phrase]": phrase };
  const document = { querySelector: (selector) => elements[selector], querySelectorAll: () => bars };
  runInNewContext(main.replace('import "./styles.css";', ""), {
    document, window: { scrollY: 0, addEventListener() {} },
  });
  await handlers["button:click"]();
  assert.equal(label.textContent, "Pause");
  assert.equal(listen.pressed, "true");
  audio.currentTime = 45;
  handlers.timeupdate();
  assert.equal(chapter.textContent, "Pour les jours à venir");
  assert.equal(number.textContent, "2 / 3");
  assert.equal(phrase.textContent, "Nous lui souhaitons une vie entourée d’amour et de sérénité.");
  assert.deepEqual(bars.map((bar) => bar.style.width), ["100%", "50%", "0%"]);
  audio.currentTime = 75;
  handlers.timeupdate();
  assert.equal(phrase.textContent, "Bienvenue Amal, notre petite lumière.");
  assert.deepEqual(bars.map((bar) => bar.style.width), ["100%", "100%", "50%"]);
  handlers.ended();
  assert.equal(number.textContent, "1 / 3");
  assert.equal(label.textContent, "Écouter l’annonce d’Amal");
  assert.deepEqual(bars.map((bar) => bar.style.width), ["0%", "0%", "0%"]);
});

test("primary actions remain usable on touch and reduced-motion is explicit", () => {
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation:\s*none\s*!important/);
  assert.match(css, /transition:\s*none\s*!important/);
});

test("small editorial labels and focus indicators retain accessible contrast", () => {
  assert.match(css, /--clay:\s*#94432f/i);
  assert.match(css, /outline:\s*3px solid var\(--forest\)/);
});
