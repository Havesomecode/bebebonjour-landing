import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker.js';

const csp = "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'";
test('routes static content and preserves headers and delivery redirect', async () => {
  const seen = [];
  const env = { ASSETS: { async fetch(request) { seen.push(new URL(request.url).pathname); return new Response('fixture', {headers: {'content-type': 'text/html'}}); } } };
  for (const [path, expected] of [['/demo', '/demo'], ['/demo.html', '/demo'], ['/demo/', '/'], ['/demo/announcements/bayane/fr', '/demo/announcements/bayane/fr/'], ['/demo/announcements/bayane/fr/', '/demo/announcements/bayane/fr/'], ['/missing', '/missing']]) {
    const response = await worker.fetch(new Request(`https://www.bebebonjour.com${path}`), env);
    assert.equal(response.status, 200); assert.equal(seen.at(-1), expected);
    assert.equal(response.headers.get('content-security-policy'), csp);
    assert.equal(response.headers.get('x-frame-options'), 'DENY');
  }
  const apex = await worker.fetch(new Request('https://bebebonjour.com/demo?x=1'), env);
  assert.equal(apex.status, 307);
  assert.equal(apex.headers.get('location'), 'https://www.bebebonjour.com/demo?x=1');
  const redirect = await worker.fetch(new Request('https://www.bebebonjour.com/delivery?synthetic=1'), env);
  assert.equal(redirect.status, 307);
  assert.equal(redirect.headers.get('location'), 'https://tacit-antelope-577.convex.site/delivery?synthetic=1');
});
