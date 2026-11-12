#!/usr/bin/env python3
"""Build a WordPress installable ZIP from an explicit distribution allowlist."""
import json
from pathlib import Path
import re
import sys
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
SLUG = "od-webgl-effects"
entry = ROOT / f"{SLUG}.php"
version = re.search(r"^ \* Version: (.+)$", entry.read_text(), re.M).group(1)
if not re.fullmatch(r"[0-9]+\.[0-9]+\.[0-9]+", version):
    sys.exit("Plugin version must use x.x.x")
if len(sys.argv) > 1 and sys.argv[1] != version:
    sys.exit(f"Tag {sys.argv[1]} does not match plugin version {version}")
if not re.search(r"^Stable tag: " + re.escape(version) + r"$", (ROOT / "readme.txt").read_text(), re.M):
    sys.exit("readme.txt and plugin versions differ")
if json.loads((ROOT / "package.json").read_text())["version"] != version:
    sys.exit("package.json and plugin versions differ")
if not (ROOT / "vendor/autoload.php").is_file():
    sys.exit("Run composer install --no-dev before packaging")
installed = json.loads((ROOT / "vendor/composer/installed.json").read_text())
packages = installed["packages"] if isinstance(installed, dict) else installed
names = {package["name"] for package in packages}
if "inc2734/wp-github-plugin-updater" not in names:
    sys.exit("Updater dependency is missing")
if names.intersection({"wp-coding-standards/wpcs", "squizlabs/php_codesniffer", "dealerdirect/phpcodesniffer-composer-installer"}):
    sys.exit("Development dependencies found: run composer install --no-dev")
for required in ("build/editor.js", "build/editor.asset.php", "build/frontend.js", "build/frontend.asset.php", "assets/background.css", "schemas/effects.json", "schemas/common.json"):
    if not (ROOT / required).is_file():
        sys.exit(f"Missing build asset: {required}. Run npm run build")
files = [entry, ROOT / "LICENSE", ROOT / "readme.txt", ROOT / "README.md", ROOT / "THIRD_PARTY_LICENSES.txt"]
for directory in ("vendor", "languages", "includes", "build", "assets", "schemas"):
    base = ROOT / directory
    if base.exists():
        files.extend(p for p in base.rglob("*") if p.is_file() and not any(part.startswith(".") for part in p.relative_to(base).parts))
output = ROOT / "dist" / f"{SLUG}.zip"
output.parent.mkdir(exist_ok=True)
with ZipFile(output, "w", ZIP_DEFLATED) as archive:
    for path in sorted(files):
        archive.write(path, f"{SLUG}/{path.relative_to(ROOT).as_posix()}")
with ZipFile(output) as archive:
    if archive.testzip():
        sys.exit("Corrupt ZIP")
print(f"Created {output} ({len(files)} files), version {version}")
