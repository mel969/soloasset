// Unit tests for §1245 / §1231 recapture math (Form 4797).
//
// The CPA's worked example from the kickoff transcript:
//   "I had an asset that costs $100,000, $50,000 of accumulated depreciation,
//    so my tax basis is $50,000. I sell it for $150,000 — so I've got $100,000
//    gain. However, $50,000 of the $100,000 gain is what's called §1245
//    recapture. That's going to be ordinary gain, with the balance of the $50
//    being a §1231 gain, which is equivalent to a long-term capital gain."
//
// Run: `node --test test/recapture.test.mjs`

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Depreciation } from './load-engine.mjs';

const close = (a, b, eps = 0.01) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`);

const r = (cost, accum, proceeds, propertyType) =>
  Depreciation.recapture({ cost, accumulated: accum, proceeds, propertyType });

// ============================================================
// CPA's worked example — §1245 personal property
// ============================================================
test('CPA example: $100k cost, $50k accum, sold $150k → §1245=$50k, §1231=$50k', () => {
  const out = r(100000, 50000, 150000, '1245');
  close(out.totalGL, 100000);
  close(out.sec1245, 50000); // recapture capped at accum dep
  close(out.sec1231, 50000); // remaining gain is long-term capital
});

// ============================================================
// §1245 — gain ≤ accum dep → all ordinary, none §1231
// ============================================================
test('§1245 gain entirely below accum dep → all ordinary recapture', () => {
  // Cost $100k, accum $50k, basis $50k, sold $80k → gain $30k (less than $50k accum)
  const out = r(100000, 50000, 80000, '1245');
  close(out.totalGL, 30000);
  close(out.sec1245, 30000);
  close(out.sec1231, 0);
});

test('§1245 gain exactly equal to accum dep → still all ordinary', () => {
  // Cost $100k, accum $50k, basis $50k, sold $100k → gain $50k = accum
  const out = r(100000, 50000, 100000, '1245');
  close(out.totalGL, 50000);
  close(out.sec1245, 50000);
  close(out.sec1231, 0);
});

// ============================================================
// §1245 — gain exceeds original cost → §1245 capped at depreciation
// ============================================================
test('§1245 gain exceeds original cost → §1245 capped at accum, rest is §1231', () => {
  // Cost $100k, accum $50k, basis $50k, sold $200k → gain $150k.
  // §1245 = min(150k, 50k accum) = 50k. §1231 = 100k.
  const out = r(100000, 50000, 200000, '1245');
  close(out.totalGL, 150000);
  close(out.sec1245, 50000);
  close(out.sec1231, 100000);
});

// ============================================================
// Loss case — never §1245, full loss is §1231
// ============================================================
test('§1245 loss → all §1231, no recapture', () => {
  // Cost $100k, accum $50k, basis $50k, sold $40k → loss $10k
  const out = r(100000, 50000, 40000, '1245');
  close(out.totalGL, -10000);
  close(out.sec1245, 0);
  close(out.sec1231, -10000);
});

test('§1245 sold at exact tax basis → zero gain, zero §1245', () => {
  const out = r(100000, 50000, 50000, '1245');
  close(out.totalGL, 0);
  close(out.sec1245, 0);
  close(out.sec1231, 0);
});

// ============================================================
// §1250 — post-1986 SL has 0 ordinary recapture
// ============================================================
test('§1250 gain → 0 ordinary, full §1231', () => {
  // Building bought $200k, $50k accum, basis $150k, sold $250k → gain $100k
  // Post-1986 SL real property: no additional depreciation, so 0 §1245 ordinary.
  const out = r(200000, 50000, 250000, '1250');
  close(out.totalGL, 100000);
  close(out.sec1245, 0);
  close(out.sec1231, 100000);
});

test('§1250 loss → all §1231 loss', () => {
  const out = r(200000, 50000, 100000, '1250');
  close(out.totalGL, -50000);
  close(out.sec1245, 0);
  close(out.sec1231, -50000);
});

// ============================================================
// "none" property type (land or non-recapture)
// ============================================================
test('"none" gain → all §1231, no recapture (land)', () => {
  // Land $100k, no depreciation, sold $150k → gain $50k all §1231
  const out = r(100000, 0, 150000, 'none');
  close(out.totalGL, 50000);
  close(out.sec1245, 0);
  close(out.sec1231, 50000);
});

// ============================================================
// Edge cases: zero / negative inputs
// ============================================================
test('zero cost asset returns zero everywhere', () => {
  const out = r(0, 0, 0, '1245');
  close(out.totalGL, 0);
  close(out.sec1245, 0);
  close(out.sec1231, 0);
});

test('proceeds = 0 (scrapped) yields full loss as §1231', () => {
  // Cost $100k, accum $80k, basis $20k, scrapped (proceeds 0) → loss $20k
  const out = r(100000, 80000, 0, '1245');
  close(out.totalGL, -20000);
  close(out.sec1245, 0);
  close(out.sec1231, -20000);
});

test('fully depreciated asset sold → entire proceeds is §1245 ordinary', () => {
  // Cost $50k, accum $50k, basis $0, sold $20k → gain $20k all ordinary
  const out = r(50000, 50000, 20000, '1245');
  close(out.totalGL, 20000);
  close(out.sec1245, 20000); // gain ≤ accum
  close(out.sec1231, 0);
});

test('over-depreciated asset (accum > cost) handled gracefully', () => {
  // Edge case from prior_accum_dep — basis can go negative numerically
  // Engine accepts cost=$50k, accum=$60k, sold $30k → gain = 30 - (50-60) = $40k
  const out = r(50000, 60000, 30000, '1245');
  // §1245 = min($40k, $60k accum) = $40k all ordinary
  close(out.sec1245, 40000);
  close(out.sec1231, 0);
});

// ============================================================
// classLifeBucket — Form 4562 grouping
// ============================================================
test('classLifeBucket — exact MACRS lives map correctly', () => {
  assert.equal(Depreciation.classLifeBucket(3), '3');
  assert.equal(Depreciation.classLifeBucket(5), '5');
  assert.equal(Depreciation.classLifeBucket(7), '7');
  assert.equal(Depreciation.classLifeBucket(10), '10');
  assert.equal(Depreciation.classLifeBucket(15), '15');
  assert.equal(Depreciation.classLifeBucket(20), '20');
  assert.equal(Depreciation.classLifeBucket(25), '25');
  assert.equal(Depreciation.classLifeBucket(27.5), '27.5');
  assert.equal(Depreciation.classLifeBucket(39), '39');
});

test('classLifeBucket — non-MACRS lives go to "Other"', () => {
  assert.equal(Depreciation.classLifeBucket(4), 'Other');
  assert.equal(Depreciation.classLifeBucket(8), 'Other');
  assert.equal(Depreciation.classLifeBucket(12), 'Other');
  assert.equal(Depreciation.classLifeBucket(40), 'Other');
});

test('classLifeBucket — handles zero/negative/missing', () => {
  assert.equal(Depreciation.classLifeBucket(0), 'Other');
  assert.equal(Depreciation.classLifeBucket(null), 'Other');
  assert.equal(Depreciation.classLifeBucket(undefined), 'Other');
  assert.equal(Depreciation.classLifeBucket(''), 'Other');
});

test('classLifeBucket — floating point tolerance', () => {
  // Slight float drift shouldn't bump out of bucket
  assert.equal(Depreciation.classLifeBucket(5.001), '5');
  assert.equal(Depreciation.classLifeBucket(27.499), '27.5');
});
