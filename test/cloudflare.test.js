import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

const csp = "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'";
test('routes static content and preserves headers and delivery redirect', async () => {
  const seen = [];
  const env = { ASSETS: { async fetch(request) { seen.push(new URL(request.url).pathname); return new Response('fixture', {headers: {'content-type': 'text/html'}}); } } };
  for (const [path, expected] of [['/index.html', '/'], ['/demo', '/demo'], ['/demo.html', '/demo'], ['/demo/', '/'], ['/demo/announcements/bayane/fr', '/demo/announcements/bayane/fr/'], ['/demo/announcements/bayane/fr/', '/demo/announcements/bayane/fr/'], ['/missing', '/missing']]) {
    const response = await worker.fetch(new Request(`https://www.bebebonjour.com${path}`), env);
    assert.equal(response.status, 200); assert.equal(seen.at(-1), expected);
    assert.equal(response.headers.get('content-security-policy'), csp);
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
    assert.equal(response.headers.get('strict-transport-security'), 'max-age=63072000');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
    assert.equal(response.headers.get('content-disposition'), 'inline');
  }
  const apex = await worker.fetch(new Request('https://bebebonjour.com/demo?x=1'), env);
  assert.equal(apex.status, 307);
  assert.equal(apex.headers.get('location'), 'https://www.bebebonjour.com/demo?x=1');
  const redirect = await worker.fetch(new Request('https://www.bebebonjour.com/delivery?synthetic=1'), env);
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get('location'), 'https://tacit-antelope-577.convex.site/delivery?synthetic=1');
  for (const response of [apex, redirect]) {
    assert.equal(response.headers.get('content-type'), 'text/plain');
    assert.equal(response.headers.get('strict-transport-security'), 'max-age=63072000');
    assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
    assert.equal(await response.text(), 'Redirecting...\n');
  }
});

test('static MIME types match the published JS and JSON, not the request suffix', async () => {
  for (const [original, expected] of [
    ['text/javascript; charset=utf-8', 'application/javascript; charset=utf-8'],
    ['application/json', 'application/json; charset=utf-8'],
    ['text/html; charset=utf-8', 'text/html; charset=utf-8'],
  ]) {
    const env = { ASSETS: { fetch: async () => new Response('fixture', {headers: {'content-type': original}}) } };
    const response = await worker.fetch(new Request('https://www.bebebonjour.com/missing.js'), env);
    assert.equal(response.headers.get('content-type'), expected);
  }
});
