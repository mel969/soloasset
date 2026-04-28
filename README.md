# Solo Asset Tracker

Single-page app for tracking assets, transfers, and disposals. Deployed live on Netlify.

## Files

- `index.html` — the entire app (HTML/CSS/JS in one file). Supabase URL and anon key are embedded near the top.
- `migration.sql` — Supabase migration: creates `activity_log`, cleans duplicate disposals, fixes orphan asset statuses.

## Backend (Supabase)

- Project ref: `xtgzbpqvmmwitlbbqcls`
- URL: `https://xtgzbpqvmmwitlbbqcls.supabase.co`
- Anon key is in `index.html` (safe to commit — it's a public anon key gated by RLS).
- To run a migration: open Supabase Studio → SQL Editor → paste from `migration.sql` → Run.

## Local development

It's a static file. Two options:

```bash
# Option A: just open it
open index.html

# Option B: serve over http (some browser features need this)
python3 -m http.server 8000
# then visit http://localhost:8000
```

Edit `index.html` directly — no build step.

## Deploy to Netlify

The site is already live. For auto-deploy on push:

1. In Netlify → Site settings → Build & deploy → Link this GitHub repo.
2. Build command: *(leave empty)*
3. Publish directory: `.` (the repo root).

Until that's wired up, you can drag this folder onto Netlify's deploys page to ship a new version manually.

## Working from another computer

```bash
git clone <repo-url>
cd solo-asset-tracker
open index.html
```

That's it — no dependencies to install.
