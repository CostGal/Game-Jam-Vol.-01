# Game Jam Vol. 01 · gamejam-patra.netlify.app

Static site (no build). Push to `main` → Netlify deploys.

- `index.html` shell (radio + routing) · `home.html` hub · `play.html` game player · `arcade/` · `devs/<name>/` · `results.html`
- `games/a|b|c/` the three games (a = Descent, b = Patra's Brawlers, c = Unremembered)
- `gj.js` / `gj.css` shared code · `radio.*` + `radio/` the radio · `media/` `img/` assets

Before every push: `python tools/release.py` (updates game fingerprints + build number).
Local preview: `python -m http.server 8000`, open http://localhost:8000
