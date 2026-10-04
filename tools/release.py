#!/usr/bin/env python3
"""Run before every push:  python tools/release.py
- recomputes the fingerprint of each game folder (games/*/ver.txt, shown in the site footer)
- bumps the build number (footer 'build vNN') and the ?vNN cache-busters on shared files
  (use --no-bump to only refresh the fingerprints)"""
import glob, hashlib, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

def tree_hash(root):
    h = hashlib.sha256()
    for r, _, fs in sorted(os.walk(root)):
        for f in sorted(fs):
            if f == "ver.txt": continue
            p = os.path.join(r, f)
            h.update(os.path.relpath(p, root).encode()); h.update(hashlib.sha256(open(p, "rb").read()).digest())
    return h.hexdigest()[:5]

codes = {}
for L in "abc":
    d = f"games/{L}"
    if os.path.isdir(d):
        codes[L.upper()] = tree_hash(d); open(f"{d}/ver.txt", "w").write(codes[L.upper()])
print("fingerprints:", " · ".join(f"{k} {v}" for k, v in codes.items()))

if "--no-bump" not in sys.argv:
    home = open("home.html", encoding="utf-8").read()
    n = int(re.search(r"build v(\d+)", home).group(1)) + 1
    pat = re.compile(r"((?:gj|arcade|results|radio|shell)\.(?:js|css)\?v)\d+")
    for f in glob.glob("**/*.html", recursive=True):
        if f.startswith("games/"): continue
        t = open(f, encoding="utf-8").read(); t2 = pat.sub(lambda m: m.group(1) + str(n), t)
        if f == "home.html": t2 = re.sub(r"build v\d+", f"build v{n}", t2)
        if t2 != t: open(f, "w", encoding="utf-8").write(t2)
    print(f"build -> v{n}")
