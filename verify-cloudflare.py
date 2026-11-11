"""Compare public GET/HEAD responses to local Workers without following redirects.

Run from the repository root after building and starting Wrangler on port 8794.
No request is sent to the intake or TEST-A backend.
"""
import hashlib
import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


opener = urllib.request.build_opener(NoRedirect)
headers = [
    "content-type", "content-security-policy", "permissions-policy",
    "referrer-policy", "x-content-type-options", "x-frame-options",
    "strict-transport-security", "cache-control", "access-control-allow-origin",
    "content-disposition", "location",
]
paths = [
    "/", "/index.html", "/demo", "/demo.html", "/demo/", "/missing",
    "/missing.js", "/missing/nested", "/delivery", "/delivery?synthetic=1",
    "/delivery/", "/favicon.ico",
]
for name in ["amal", "bayane"]:
    for lang in ["fr", "ar"]:
        paths += [f"/demo/announcements/{name}/{lang}{suffix}"
                  for suffix in ["", "/", "/index.html"]]
build = {"/" + str(p.relative_to("dist")): hashlib.sha256(p.read_bytes()).hexdigest()
         for p in sorted(Path("dist").rglob("*")) if p.is_file()}
assert build, "Build dist first"
paths = list(dict.fromkeys(paths + list(build)))
cases = [(path, method, False) for path in paths for method in ["GET", "HEAD"]]
cases += [(path, "GET", True) for path in ["/", "/demo?synthetic=1", "/delivery?synthetic=1"]]
rows = []
for path, method, apex in cases:
    pair = []
    for local in [False, True]:
        base = "http://127.0.0.1:8794" if local else (
            "https://bebebonjour.com" if apex else "https://www.bebebonjour.com")
        request = urllib.request.Request(base + path, method=method,
                                        headers={"Host": "bebebonjour.com"} if local and apex else {})
        try:
            response = opener.open(request, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        body = response.read()
        pair.append({
            "status": response.status, "sha256": hashlib.sha256(body).hexdigest(),
            "bytes": len(body), "headers": {h: response.headers.get(h) for h in headers},
        })
    a, b = pair
    variations = {h: [a["headers"][h], b["headers"][h]]
                  for h in headers if a["headers"][h] != b["headers"][h]}
    # Suggested filenames differ by CDN; require the same inline disposition.
    differences = {h: values for h, values in variations.items()
                   if not (h == "content-disposition" and
                           all(value and value.split(";")[0] == "inline" for value in values))}
    row = {
        "path": path, "method": method, "apex": apex, "public": a, "local": b,
        "same_body": a["sha256"] == b["sha256"], "same_status": a["status"] == b["status"],
        "header_differences": differences, "header_variations": variations,
        "build_equal": b["sha256"] == build[path] if method == "GET" and not apex and path in build else None,
    }
    rows.append(row)
    if differences or not row["same_body"] or not row["same_status"] or row["build_equal"] is False:
        print(json.dumps(row, ensure_ascii=False))
receipt = {
    "checked_at": datetime.now(timezone.utc).isoformat(), "build": build,
    "worker_sha256": hashlib.sha256(Path("worker.js").read_bytes()).hexdigest(),
    "wrangler_sha256": hashlib.sha256(Path("wrangler.jsonc").read_bytes()).hexdigest(),
    "comparisons": rows,
}
Path(".evidence").mkdir(exist_ok=True)
Path(".evidence/parity.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
assert all(row["same_body"] and row["same_status"] and not row["header_differences"]
           and row["build_equal"] is not False for row in rows), "Parity differs; see .evidence/parity.json"
print(json.dumps({"comparisons": len(rows), "build_files": len(build), "verdict": "PASS"}))
