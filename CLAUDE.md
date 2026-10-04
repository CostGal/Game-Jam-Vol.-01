# CLAUDE.md: Game Jam site

Static site served by Netlify (publish dir = repo root, no build). Plain HTML/CSS/JS, no frameworks.

## Structure
- `index.html` + `shell.js`: the shell. Loads every page inside an iframe (`#view`) so the radio never restarts. Owns the radio, the "what's new" tour, URL routing (`/?p=arcade/`).
- `home.html` (hub), `arcade/index.html`, `devs/<slug>/index.html`, `results.html`: pages shown inside the shell. Each starts with a guard script that redirects to the shell if opened on its own. Links to `play.html` must use `target="_top"`.
- `play.html`: full-page game player (not inside the shell). Game runs in an iframe from `games/<a|b|c>/`; the page tracks play time and receives `postMessage` events from the game (`{gj:"finish"}`, `{gj:"clear", ver, mode, seconds, details}`).
- `gj.js` / `gj.css`: shared logic and UI (bottom sheets, votes, comments, reactions, champions, Supabase calls). `arcade.js`, `results.js`, `shell.js`, `radio.js` (playlist), `radio.css`.
- `games/a` Descent (Fanis) · `games/b` Patra's Brawlers (Amarildo) · `games/c` Unremembered (Kostas). To update a game: replace the folder with the new build (index.html + thumb.jpg at its root), then run `python tools/release.py`.

## Backend (Supabase project `kostas-apps`, tables prefixed `gj_`)
Only the public publishable key is in `gj.js`. Never commit secrets: Discord webhook URLs and developer edit keys live in the database (`gj_secrets`, `gj_dev_keys`), not in this repo. Schema changes are made through Supabase migrations, not from this repo.

## Rules
- Mobile first (390px wide). Test with a phone-sized viewport. Avoid `backdrop-filter` and heavy animation (it janks phones).
- No new frameworks or build steps.
- Run `python tools/release.py` before every push; commit with a short message.
- Greek UI text. Keep copy short.
