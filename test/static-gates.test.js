import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

test("static landing cannot expose legacy provider links or hidden gated actions", () => {
  assert.doesNotMatch(html, /tally\.so|buy\.stripe\.com/i);
  assert.doesNotMatch(html, /https?:\/\//i);
  assert.doesNotMatch(css, /https?:\/\//i);
  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important/s);
  assert.match(main, /const delivered = status\.status === "complete"/);
  assert.match(main, /announcementLink\.hidden\s*=\s*!delivered/);
});

test("landing exposes the synthetic workflow without replacing the TEST-A intake", () => {
  assert.match(html, /href="\/demo"[^>]*>Voir la démo du parcours<\/a>/);
  assert.match(html, /id="intake-form"/);
});
