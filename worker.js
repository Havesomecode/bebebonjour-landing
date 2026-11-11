const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=63072000',
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

function temporaryRedirect(location) {
  return new Response('Redirecting...\n', {
    status: 307,
    headers: {
      'location': location,
      'content-type': 'text/plain',
      'cache-control': 'public, max-age=0, must-revalidate',
      'strict-transport-security': SECURITY_HEADERS['Strict-Transport-Security'],
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'bebebonjour.com') {
      url.hostname = 'www.bebebonjour.com';
      url.protocol = 'https:';
      return temporaryRedirect(url.toString());
    }
    if (url.pathname === '/delivery') {
      return temporaryRedirect(`https://tacit-antelope-577.convex.site/delivery${url.search}`);
    }
    if (url.pathname === '/index.html') url.pathname = '/';
    else if (url.pathname === '/demo.html') url.pathname = '/demo';
    else if (url.pathname === '/demo/') url.pathname = '/';
    else if (/^\/demo\/announcements\/(amal|bayane)\/(fr|ar)(?:\/index\.html)?$/.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/index\.html$/, '') + '/';
    }
    const response = await env.ASSETS.fetch(new Request(url, request));
    const headers = new Headers(response.headers);
    headers.set('cache-control', 'public, max-age=0, must-revalidate');
    headers.set('access-control-allow-origin', '*');
    headers.set('content-disposition', 'inline');
    if (headers.get('content-type') === 'text/javascript; charset=utf-8') {
      headers.set('content-type', 'application/javascript; charset=utf-8');
    } else if (headers.get('content-type') === 'application/json') {
      headers.set('content-type', 'application/json; charset=utf-8');
    }
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  },
};
