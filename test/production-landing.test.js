import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

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

test("public landing has one real intake path and one customer-facing example", () => {
  const intakeLinks = [...html.matchAll(/href="https:\/\/tally\.so\/r\/D49r2j"/g)];
  assert.ok(intakeLinks.length >= 2, "primary and offer CTAs should share the intake path");
  assert.match(html, /href="\/demo\/announcements\/bayane\/fr\/"/);
  assert.doesNotMatch(html, /href="\/demo"(?:\s|>)/);
});

test("landing removes unsupported social proof and unavailable-plan clutter", () => {
  assert.doesNotMatch(html, /parents adorent|Bientôt dispo|Sur-mesure|Accompagné/i);
  assert.match(html, /Essentiel/);
  assert.match(html, /39(?:&nbsp;|\s*)€/);
});

test("intake states the no-automatic-payment boundary", () => {
  assert.match(html, /La demande ne déclenche aucun paiement automatique\./i);
  assert.match(html, /Nous vous confirmons la suite avant toute étape payante\./i);
  assert.doesNotMatch(publicSurface, /buy\.stripe\.com|checkout|carte bancaire/i);
});

test("customer journey promises only private review and approval-gated delivery", () => {
  assert.match(html, /Nous préparons votre aperçu en privé\./i);
  assert.match(html, /Rien n’est publié ni envoyé sans votre accord\./i);
  assert.match(html, /Le délai dépend du contenu\s+et des langues choisies\./i);
  assert.doesNotMatch(publicSurface, /espace client|suivre ma demande|bebebonjour-ops/i);
});

test("every external intake link is isolated from the landing window", () => {
  const intakeLinks = [...html.matchAll(/<a[\s\S]*?href="https:\/\/tally\.so\/r\/D49r2j"[\s\S]*?<\/a>/g)];
  assert.ok(intakeLinks.length >= 2);
  for (const [link] of intakeLinks) {
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="[^"]*noopener[^"]*noreferrer[^"]*"/);
  }
});

test("landing uses the warm editorial design system without gradient decoration", () => {
  assert.match(css, /--paper:\s*#[0-9a-f]{6}/i);
  assert.match(css, /--ink:\s*#[0-9a-f]{6}/i);
  assert.match(css, /--forest:\s*#[0-9a-f]{6}/i);
  assert.match(css, /--clay:\s*#[0-9a-f]{6}/i);
  assert.match(css, /Newsreader/);
  assert.doesNotMatch(css, /(?:linear|radial|conic)-gradient/i);
});

test("primary actions remain usable on touch and reduced-motion is explicit", () => {
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.match(css, /animation:\s*none\s*!important/);
  assert.match(css, /transition:\s*none\s*!important/);
});

test("small editorial labels and focus indicators retain accessible contrast", () => {
  assert.match(css, /--clay:\s*#924a39/);
  assert.match(css, /outline:\s*3px solid var\(--forest\)/);
});
