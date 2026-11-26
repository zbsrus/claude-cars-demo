"""Build a clean release archive from the current project."""
import argparse
import json
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from catalogue import initial_draft


def build(output):
    files = [
        "serve.py", "preview.py", "catalogue.py", "enquiries.py", "site_stats.py", "backup.py",
        "requirements.txt", "vehicle-directory.js", "deploy/Caddyfile", "deploy/claude-cars.service",
        "deploy/README.md", "assets/fonts/eb-garamond-regular.woff2", "assets/fonts/OFL-EB-Garamond.txt",
        "assets/identity/loop.svg", "assets/identity/z3-studio.webp", "assets/identity/claude-portrait.webp",
        "assets/identity/claude-portrait-600.webp", "assets/identity/claude-cars-social.jpg",
    ]
    for component in ("public", "owner", "insights"):
        files.extend(f"web/{component}{suffix}" for suffix in (".js", "-locales.js", ".css"))
    files.extend(("web/base.css", "web/select.css", "web/select.js"))
    for number in range(1, 4):
        files.extend((f"assets/z4/{number}.webp", f"assets/z4/{number}-720.webp"))
    seed = initial_draft(json.loads((ROOT / "content/z4.json").read_text()))
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=7) as bundle:
        for name in sorted(files):
            bundle.write(ROOT / name, name)
        bundle.writestr("content/z4.json", json.dumps(seed, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    build(parser.parse_args().output)
