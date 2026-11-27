import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
const main = await readFile(new URL("../src/main.js", import.meta.url), "utf8");
const fulfillmentClient = await readFile(
  new URL("../src/fulfillment-client.js", import.meta.url),
  "utf8",
);
const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
const vercel = JSON.parse(
  await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
);

const hostedOrigin = "https://bebebonjour-fulfillment.vercel.app";

test("public landing exposes no provider, operator, or hidden test controls", () => {
  assert.doesNotMatch(html, /buy\.stripe\.com|bebebonjour-fulfillment|id="intake-form"|id="job-status"/i);
  assert.doesNotMatch(main, /createFulfillmentClient|window\.prompt|sessionStorage/i);
  assert.doesNotMatch(css, /https?:\/\//i);
  assert.doesNotMatch(html, /tally\.so/i);
  assert.equal([...html.matchAll(/href="\/delivery"/g)].length, 4);
});

test("the Amal example is a static, non-indexed copy with no private capability", async () => {
  const example = await readFile(new URL("../public/exemple/amal/index.html", import.meta.url), "utf8");
  const audio = await readFile(new URL("../public/exemple/amal/recit-fr.mp3", import.meta.url));
  assert.match(example, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(example, /<script src="\/exemple\/amal\/announcement\.js"><\/script>/);
  assert.doesNotMatch(example, /<script>|convex|\/announcements\/|[a-f0-9]{64}/i);
  assert.equal(audio[0], 0xff, "MPEG frame sync");
  assert.equal(audio[1] & 0xe0, 0xe0, "MPEG frame sync");
  assert.ok(audio.length > 100_000);
});

test("robots.txt points to a sitemap of indexable pages only", async () => {
  const robots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
  const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  assert.match(robots, /^User-agent: \*$/m);
  assert.match(robots, /^Sitemap: https:\/\/www\.bebebonjour\.com\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /announcements/, "noindex must stay readable by crawlers");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(urls, ["https://www.bebebonjour.com/", "https://www.bebebonjour.com/confidentialite/", ...["adam", "mohamed", "inaya", "noor", "lina"].map((name) => `https://www.bebebonjour.com/prenoms/${name}/`)]);
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
});

test("dormant hosted client remains pinned but is absent from the public bundle entry", () => {
  assert.match(fulfillmentClient, new RegExp(
    `const CANONICAL_HOSTED_API_BASE_URL = ${JSON.stringify(`${hostedOrigin}/api/customer-flow`)}`,
  ));
  assert.doesNotMatch(main, /fulfillment-client/);
  assert.doesNotMatch(main, /VITE_[A-Z_]*TEST_ACCESS_TOKEN/);
});

test("public CSP permits first-party runtime resources only", () => {
  const cspHeaders = vercel.headers
    .flatMap(({ headers }) => headers)
    .filter(({ key }) => key === "Content-Security-Policy");
  assert.equal(cspHeaders.length, 1);

  const directiveEntries = cspHeaders[0].value.split(";").map((directive) => {
    const [name, ...sources] = directive.trim().split(/\s+/);
    return [name, sources];
  });
  assert.equal(
    new Set(directiveEntries.map(([name]) => name)).size,
    directiveEntries.length,
  );

  assert.deepEqual(Object.fromEntries(directiveEntries), {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "connect-src": ["'self'"],
    "font-src": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "img-src": ["'self'", "data:"],
    "object-src": ["'none'"],
    "script-src": ["'self'"],
    "style-src": ["'self'", "'unsafe-inline'"],
  });
});

test("internal operating notes keep the hosted boundary explicit", () => {
  assert.doesNotMatch(readme, /VITE_FULFILLMENT_API_APPROVED_HOSTED_ORIGIN/);
  assert.match(readme, /memory only/i);
  assert.match(readme, /Content-Security-Policy/);
});

test("release notes describe the paid, operator-read order path", () => {
  assert.match(readme, /All four public CTAs use `\/delivery`/i);
  assert.match(readme, /https:\/\/api-production-c9013a1c\.up\.railway\.app/);
  assert.match(readme, /private Operations console is not a customer-facing status portal/i);
  assert.match(readme, /operator reads every request before any generation/i);
  assert.match(readme, /€39/);
});

test("delivery, announcements and interest routes proxy to the exact Railway origin on the same domain", () => {
  const origin = "https://api-production-c9013a1c.up.railway.app";
  assert.equal(vercel.redirects, undefined);
  assert.deepEqual(vercel.rewrites, [
    { source: "/delivery", destination: `${origin}/delivery` },
    { source: "/delivery/:path*", destination: `${origin}/delivery/:path*` },
    { source: "/announcements/:path*", destination: `${origin}/announcements/:path*` },
    { source: "/demo", destination: "/demo.html" },
    { source: "/interest/subscribe", destination: `${origin}/interest/subscribe` },
    { source: "/interest/confirm", destination: `${origin}/interest/confirm` },
    { source: "/interest/unsubscribe", destination: `${origin}/interest/unsubscribe` },
    { source: "/(.*)", destination: "/index.html" },
  ]);
});

test("landing CSP does not apply to the proxied delivery pages, which send their own", () => {
  const source = new RegExp(`^${vercel.headers[0].source.replace(/^\//, "/")}$`);
  for (const path of ["/", "/demo", "/anything"]) assert.match(path, source);
  for (const path of ["/delivery", "/delivery/review", "/announcements/abc"]) assert.doesNotMatch(path, source);
  assert.match("/deliveryfoo", source);
});
