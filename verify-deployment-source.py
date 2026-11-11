"""Re-read only this deployment's allowlisted non-secret source files.

Usage: python3 verify-deployment-source.py /path/to/vercel/dist/vc.js
Existing native Vercel authentication is used by the CLI, never copied or logged.
"""
import base64
import concurrent.futures
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

DEPLOYMENT = "dpl_73az3x1osxdxkTASWRrPPZqPvswa"
TEAM = "team_lpN3ikyEWpXFfrV53eNYNWQd"
cli = sys.argv[1]
output = Path(".evidence")
output.mkdir(exist_ok=True)


def get(endpoint):
    result = subprocess.run(
        ["node", cli, "api", f"{endpoint}?teamId={TEAM}", "--method", "GET", "--scope", TEAM],
        capture_output=True, check=True, timeout=60,
    )
    return json.loads(result.stdout)


def files(nodes, prefix=""):
    found = {}
    for node in nodes:
        path = prefix + node["name"]
        if node["type"] == "directory":
            found.update(files(node["children"], path + "/"))
        else:
            found[path] = node["uid"]
    return found


metadata = get(f"/v13/deployments/{DEPLOYMENT}")
assert metadata["id"] == DEPLOYMENT
metadata["meta"] = {key: metadata.get("meta", {}).get(key) for key in ["sourceSnapshotSha256", "sourceHead", "sourceDirty", "releaseScope"]}
manifest = json.loads(Path("deployment-source-manifest.json").read_text())
expected = {entry["path"]: entry["uid"] for entry in manifest}
assert all(not path.startswith("/") and ".." not in Path(path).parts and not any(part.startswith(".env") for part in Path(path).parts) for path in expected)
listing = get(f"/v6/deployments/{DEPLOYMENT}/files")
assert len(listing) == 1 and listing[0]["name"] == "src"
assert files(listing[0]["children"]) == expected, "Deployment source inventory differs"


def check(entry):
    data = get(f"/v8/deployments/{DEPLOYMENT}/files/{entry['uid']}")
    raw = base64.b64decode(data["data"], validate=True)
    digest = hashlib.sha256(raw).hexdigest()
    assert digest == entry["sha256"], f"Source hash changed: {entry['path']}"
    local = Path(entry["path"]).read_bytes()
    target = output / "published-source" / entry["path"]
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(raw)
    return {**entry, "local_sha256": hashlib.sha256(local).hexdigest(), "local_equal": raw == local}


with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    rows = list(pool.map(check, manifest))
receipt = {
    "checked_at": datetime.now(timezone.utc).isoformat(),
    "deployment": {key: metadata.get(key) for key in ["id", "url", "name", "readyState", "alias", "gitSource", "meta"]},
    "inventory_equal": True,
    "source_files": rows,
}
(output / "source-readback.json").write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps({"deployment": DEPLOYMENT, "source_files_verified": len(rows), "local_differences": [row["path"] for row in rows if not row["local_equal"]]}, indent=2))
