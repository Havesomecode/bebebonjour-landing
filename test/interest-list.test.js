import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
const config = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
const privacyText = "Si vous laissez votre courriel pour être prévenu·e des nouveautés, nous enregistrons votre adresse, la date de votre demande et de votre confirmation, et le texte que vous avez accepté. Ces données servent uniquement à vous écrire sur Bébé Bonjour. Elles ne sont ni vendues ni mélangées avec votre commande. Une adresse non confirmée sous 7 jours est supprimée. Vous vous désinscrivez par le lien présent dans chaque courriel, ou en écrivant à contact@bebebonjour.com. Sur simple demande à la même adresse, nous effaçons vos données.";

test("interest block offers explicit consent and requested copy", () => {
  assert.ok(html.indexOf('id="questions"') < html.indexOf('id="liste"') && html.indexOf('id="liste"') < html.indexOf('class="closing"'));
  for (const text of ["Pas pour tout de suite ?", "Laissez votre courriel. Nous vous écrivons quand Bébé Bonjour a du nouveau, pas avant.", "Votre courriel", "prenom@exemple.fr", "Je souhaite recevoir par courriel des nouvelles de Bébé Bonjour.", "Me prévenir", "Seule votre adresse est enregistrée, uniquement pour ces courriels. Un lien de désinscription figure dans chacun. Détails dans notre", "politique de confidentialité"]) assert.ok(html.includes(text), text);
  const checkbox = html.match(/<input[^>]*type="checkbox"[^>]*>/)[0];
  assert.match(checkbox, /\brequired\b/); assert.doesNotMatch(checkbox, /\bchecked\b/);
  assert.match(html, /<input[^>]*name="website"[^>]*tabindex="-1"[^>]*autocomplete="off"[^>]*aria-hidden="true"/);
  assert.match(main, /\/interest\/subscribe/);
});

test("interest routes and privacy page preserve the boundary", async () => {
  const catchall = config.rewrites.findIndex(x => x.source === "/(.*)");
  for (const name of ["subscribe", "confirm", "unsubscribe"]) {
    const path = `/interest/${name}`;
    const index = config.rewrites.findIndex(x => x.source === path);
    assert.ok(index >= 0 && index < catchall);
    assert.equal(config.rewrites[index].destination, `https://api-production-c9013a1c.up.railway.app${path}`);
  }
  assert.equal(config.headers[0].source, "/((?!delivery(?:/|$)|announcements/|interest/).*)");
  const privacy = await readFile(new URL("../public/confidentialite/index.html", import.meta.url), "utf8");
  assert.ok(privacy.includes(privacyText));
  assert.match(privacy, /Les informations du formulaire de commande servent uniquement à créer et livrer votre annonce\./);
  assert.doesNotMatch(privacy, /<script/i);
});

test("submission exposes validation and response failures and unlocks retries", async () => {
  for (const [response, expected] of [
    [{ status: 400, body: { error: "email" } }, "Cette adresse ne semble pas complète."],
    [{ status: 400, body: { error: "consent" } }, "Cochez la case pour que nous puissions vous écrire."],
    [{ status: 429 }, "Trop de demandes. Réessayez dans une heure."],
    [{ status: 500, body: {} }, "Votre demande n'a pas pu être enregistrée. Réessayez dans un moment."],
    [null, "Votre demande n'a pas pu être enregistrée. Réessayez dans un moment."],
  ]) {
    const handlers = {}, error = { textContent: "" }, button = { disabled: false };
    const field = (extra) => ({ setAttribute(){}, removeAttribute(){}, focus(){}, ...extra });
    const email = field({value: "a@example.test", validity: {valid: true}});
    const form = { elements: {email, consent: field({checked: true}), website: {value: "trap"}}, querySelector: s => s === '[data-interest-error]' ? error : button, addEventListener: (e, f) => {handlers[e] = f;} };
    const document = {querySelector: s => s === '[data-interest-form]' ? form : s === '[data-interest-success]' ? {} : null};
    runInNewContext(main.replace('import "./styles.css";', ''), {document, window: {scrollY: 0, addEventListener(){}}, fetch: async () => {if (!response) throw Error('offline'); return {status: response.status, json: async () => response.body};}});
    await handlers.submit({preventDefault(){}});
    assert.equal(error.textContent, expected); assert.equal(button.disabled, false);
    email.value = ''; await handlers.submit({preventDefault(){}});
    assert.equal(error.textContent, "Cette adresse ne semble pas complète.");
  }
});

test("submission validates consent and submits only the requested JSON", async () => {
  const handlers = {};
  const email = { value: "a@example.test", validity: { valid: true }, setAttribute(){}, removeAttribute(){}, focus(){} };
  const consent = { checked: false, setAttribute(){}, removeAttribute(){}, focus(){} };
  const website = { value: "" }, error = { textContent: "" }, button = { disabled: false }, success = { hidden: true, focus(){ this.focused = true; } };
  const form = { elements: { email, consent, website }, hidden: false, querySelector(s){ return s === '[data-interest-error]' ? error : button; }, addEventListener(e, f){ handlers[e] = f; } };
  let request;
  const document = { querySelector(s){ return s === '[data-interest-form]' ? form : s === '[data-interest-success]' ? success : null; } };
  runInNewContext(main.replace('import "./styles.css";', ''), { document, window: {scrollY: 0, addEventListener(){}}, fetch: async (...args) => { request = args; return {status: 200, json: async () => ({ok: true})}; } });
  await handlers.submit({preventDefault(){}});
  assert.equal(error.textContent, "Cochez la case pour que nous puissions vous écrire.");
  assert.equal(request, undefined);
  consent.checked = true;
  await handlers.submit({preventDefault(){}});
  assert.equal(request[0], "/interest/subscribe");
  assert.deepEqual(JSON.parse(request[1].body), { email: "a@example.test", consent: true, website: "", source: "landing" });
  assert.equal(form.hidden, true); assert.equal(success.hidden, false); assert.equal(success.focused, true);
});
