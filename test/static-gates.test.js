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

test("the synthetic proof route remains unlinked while customer examples remain reachable", () => {
  assert.doesNotMatch(html, /href="\/demo"(?:\s|>)/);
  assert.match(html, /href="\/demo\/announcements\/bayane\/fr\/"/);
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

test("release notes identify the real intake, waiver, and automatic first-version boundary", () => {
  assert.match(readme, /All four public CTAs use `\/delivery`/i);
  assert.match(readme, /https:\/\/tacit-antelope-577\.convex\.site\/delivery/);
  assert.match(readme, /private Operations console is not a customer-facing status portal/i);
  assert.match(readme, /payment waiver, not a payment record/i);
  assert.match(readme, /automatically before human review/i);
  assert.match(readme, /owner approval gates the final email/i);
  assert.match(readme, /Email addresses and review links remain private/i);
});

test("delivery redirects to the exact Convex intake without altering existing SPA routes", () => {
  assert.deepEqual(vercel.redirects, [{
    source: "/delivery",
    destination: "https://tacit-antelope-577.convex.site/delivery",
    permanent: false,
  }]);
  assert.deepEqual(vercel.rewrites, [
    { source: "/demo", destination: "/demo.html" },
    { source: "/(.*)", destination: "/index.html" },
  ]);
});
