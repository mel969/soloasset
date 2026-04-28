# Tests

Comprehensive test suite covering the depreciation engine, Form 4797 recapture
math, Form 4562 class-life bucketing, the property-type heuristic, and the
schema guard that watches for `unknown column` bugs at write time.

## Layout

```
test/
  load-engine.mjs           # vm-loads the Depreciation IIFE out of index.html
  engine.test.mjs           # 21 cases — golden tests for the depreciation engine
  recapture.test.mjs        # 17 cases — §1245/§1250/§1231 split (CPA's example included)
  property-type.test.mjs    # 12 cases — heuristic per asset shape
  schema-guard.test.mjs     #  5 cases — static analyzer for "unknown column" bugs
  seed-edge-cases.sql       # paste-in SQL: 30+ stress assets covering every shape
  e2e/                      # Playwright specs (run on your machine)
    _helpers.mjs
    smoke.spec.mjs
    asset-crud.spec.mjs
    property-flows.spec.mjs
    parallel-stress.spec.mjs
```

## Running unit tests

Built-in `node:test`, no install required:

```bash
npm test                 # all 55 unit tests
npm run test:engine      # depreciation math only
npm run test:recapture   # Form 4797 math only
npm run test:property    # property-type heuristic
npm run test:schema      # the static analyzer that catches schema bugs
```

The schema-guard test parses `index.html`, finds every `updateRec / insertRec /
upsert / sb.from(table).update / .insert` call site with an inline object
literal, and verifies every column written is declared in `SCHEMA_EXPECT`.
**This is the test that would have caught the `disposal_date` bug at CI time.**

## Running e2e tests

Requires Playwright browsers, which need internet access to download:

```bash
npm install                 # adds @playwright/test as a devDep
npx playwright install      # downloads Chromium + Firefox + WebKit
npm run test:e2e            # runs 33 e2e tests across 3 browsers
```

The Playwright config (`playwright.config.mjs` at the repo root) runs **3
parallel workers** by default. Combined with 3 browser projects, you get up
to 9 simultaneous browser sessions hammering the app — the "hellacious" mode
the user asked for.

### Auth setup for e2e

The app gates everything behind Google OAuth → Supabase. Two ways to feed
the e2e suite a session:

**Option A — Storage state (recommended):**
1. Sign in once manually in a real browser
2. Save the storage state: `npx playwright codegen --save-storage=test/.auth/user.json https://soloassettracker.netlify.app`
3. Reference it in `playwright.config.mjs` under `use.storageState`

**Option B — Skip the auth flow with a localhost build** that bypasses
sign-in for testing only. Not currently wired up.

Until auth is set up, every e2e test will throw "Not authenticated" from
`_helpers.mjs#ensureLoggedIn` — that's the intended behavior; better to fail
fast than silently no-op.

### Targeting a different URL

```bash
BASE_URL=https://deploy-preview-N--soloassettracker.netlify.app npm run test:e2e
BASE_URL=http://localhost:8000 npm run test:e2e
```

## Stress-testing with weird data

`test/seed-edge-cases.sql` is a paste-in block for Supabase Studio's SQL
Editor. It assumes you've already loaded the entity + category seed blocks.
It inserts 30+ assets covering:

- Normal cases across every category
- Recip mares (4 buckets), trading horses (some inventory, some capitalized)
- 3 properties with land + building + improvements + prior_accum_dep
- Edge cases: $1 cost, $12.5M cost, special characters incl. emoji, 100% bonus,
  §179 maxed, salvage near cost, fully depreciated 1995 silo, future-dated 2027
  asset, prior_accum_dep > basis, mid-quarter convention, 300-char description
- 5 disposals covering: §1245 small gain, §1245 above-cost (split), loss,
  scrapped (zero proceeds), §1250 building

Run this to make Form 4797 / 4562 / disposal report all populate, with every
recapture branch exercised.

## Coverage philosophy

The unit tests pin down the *math*. The schema-guard test pins down the
*write paths* (it would have caught the recent `disposal_date` regression
before it left CI). The Playwright tests pin down the *user flows*. Run all
three layers before any deploy.
