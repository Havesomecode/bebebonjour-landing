const SECURITY_HEADERS = {
  'Content-Security-Policy': "default-src 'self'; base-uri 'self'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=()',
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === 'bebebonjour.com') {
      url.hostname = 'www.bebebonjour.com';
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 307);
    }
    if (url.pathname === '/delivery') {
      return Response.redirect(`https://tacit-antelope-577.convex.site/delivery${url.search}`, 307);
    }
    if (url.pathname === '/demo.html') url.pathname = '/demo';
    else if (url.pathname === '/demo/') url.pathname = '/';
    else if (/^\/demo\/announcements\/(amal|bayane)\/(fr|ar)(?:\/index\.html)?$/.test(url.pathname)) {
      url.pathname = url.pathname.replace(/\/index\.html$/, '') + '/';
    }
    const response = await env.ASSETS.fetch(new Request(url, request));
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) headers.set(name, value);
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  },
};
