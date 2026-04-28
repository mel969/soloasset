// Unit tests for the Depreciation engine. Golden cases per method × convention,
// plus all the edge cases documented in the engine source: prior_accum_dep,
// is_land, is_inventory, disposed-mid-year, §179, bonus, full year coverage.
//
// Run: `node --test test/engine.test.mjs`

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Depreciation } from './load-engine.mjs';

const close = (a, b, eps = 0.51) =>
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b} (Δ=${Math.abs(a-b).toFixed(4)})`);

// ============================================================
// Convention math
// ============================================================
test('firstYearFraction — half-year is always 0.5', () => {
  assert.equal(Depreciation.firstYearFraction('half_year', '2025-01-15'), 0.5);
  assert.equal(Depreciation.firstYearFraction('half_year', '2025-12-31'), 0.5);
});

test('firstYearFraction — mid-month gives partial year based on placed-in-service month', () => {
  // April → 8.5/12 (half of April + May–Dec)
  close(Depreciation.firstYearFraction('mid_month', '2025-04-15'), 8.5 / 12);
  // December → 0.5/12
  close(Depreciation.firstYearFraction('mid_month', '2025-12-15'), 0.5 / 12);
  // January → 11.5/12
  close(Depreciation.firstYearFraction('mid_month', '2025-01-15'), 11.5 / 12);
});

test('firstYearFraction — mid-quarter buckets by quarter of placed-in-service', () => {
  close(Depreciation.firstYearFraction('mid_quarter', '2025-02-01'), 10.5 / 12); // Q1
  close(Depreciation.firstYearFraction('mid_quarter', '2025-05-01'), 7.5 / 12);  // Q2
  close(Depreciation.firstYearFraction('mid_quarter', '2025-08-01'), 4.5 / 12);  // Q3
  close(Depreciation.firstYearFraction('mid_quarter', '2025-11-01'), 1.5 / 12);  // Q4
});

test('disposalYearFraction — mid-month is months-elapsed minus half', () => {
  // Disposed in April → 3.5 / 12 of the year already booked
  close(Depreciation.disposalYearFraction('mid_month', '2025-04-15'), 3.5 / 12);
  // Disposed January 15 → 0.5/12
  close(Depreciation.disposalYearFraction('mid_month', '2025-01-15'), 0.5 / 12);
});

// ============================================================
// Straight-line — most predictable
// ============================================================
test('SL 5-yr half-year — $10k cost', () => {
  const s = Depreciation.schedule({
    cost: 10000, in_service_date: '2025-06-01',
    method: 'sl', life_years: 5, convention: 'half_year',
  });
  // Expected by IRS: 10/20/20/20/20/10 percent
  close(s[0].depreciation, 1000); // 50% of $2k
  close(s[1].depreciation, 2000);
  close(s[2].depreciation, 2000);
  close(s[3].depreciation, 2000);
  close(s[4].depreciation, 2000);
  close(s[5].depreciation, 1000); // 50% of $2k tail
  // Sum should equal cost
  const total = s.reduce((acc, r) => acc + r.depreciation, 0);
  close(total, 10000);
});

test('SL 27.5-yr mid-month — $100k residential rental placed in April', () => {
  const s = Depreciation.schedule({
    cost: 100000, in_service_date: '2025-04-15',
    method: 'sl', life_years: 27.5, convention: 'mid_month',
  });
  // Annual would be 100k / 27.5 = $3636.36; first year = annual × 8.5/12
  close(s[0].depreciation, (100000 / 27.5) * (8.5 / 12), 1.0); // ≈ $2,575.76 — CPA example
  // Year 2 onward should be ~$3636 each
  close(s[1].depreciation, 100000 / 27.5, 1.0);
  close(s[2].depreciation, 100000 / 27.5, 1.0);
});

// ============================================================
// 200% Declining Balance (DDB)
// ============================================================
test('DDB 5-yr half-year — $10k cost gets MACRS-like rates', () => {
  const s = Depreciation.schedule({
    cost: 10000, in_service_date: '2025-06-01',
    method: 'ddb', life_years: 5, convention: 'half_year',
  });
  // MACRS 5-yr table: 20.00 / 32.00 / 19.20 / 11.52 / 11.52 / 5.76
  close(s[0].depreciation, 2000); // 20% (= 40% × 0.5 half-year)
  close(s[1].depreciation, 3200); // 32%
  close(s[2].depreciation, 1920); // 19.2%
  // Years 4-5 should switch to SL at some point (engine takes max of DB vs SL)
  const total = s.reduce((acc, r) => acc + r.depreciation, 0);
  close(total, 10000, 5); // small rounding tolerance
});

test('DDB never exceeds remaining basis in final year', () => {
  const s = Depreciation.schedule({
    cost: 10000, in_service_date: '2025-06-01',
    method: 'ddb', life_years: 5, convention: 'half_year',
  });
  const final = s[s.length - 1];
  assert.ok(final.closing_nbv >= 0, 'closing NBV should never go negative');
  assert.ok(final.closing_nbv < 1, 'should be fully depreciated in final year');
});

// ============================================================
// 150% DB
// ============================================================
test('DB150 7-yr half-year — runs through full life without going negative', () => {
  const s = Depreciation.schedule({
    cost: 7000, in_service_date: '2025-06-01',
    method: 'db150', life_years: 7, convention: 'half_year',
  });
  const total = s.reduce((a, r) => a + r.depreciation, 0);
  close(total, 7000, 5);
  s.forEach(r => assert.ok(r.closing_nbv >= -0.01, `NBV negative in year ${r.year}: ${r.closing_nbv}`));
});

// ============================================================
// §179 + Bonus stacking
// ============================================================
test('§179 fully expensed first year', () => {
  const s = Depreciation.schedule({
    cost: 10000, section_179: 10000,
    in_service_date: '2025-06-01',
    method: 'ddb', life_years: 5, convention: 'half_year',
  });
  close(s[0].sec179, 10000);
  close(s[0].total_expense, 10000);
  close(s[0].closing_nbv, 0, 0.01);
});

test('§179 partial — engine continues depreciating residual', () => {
  const s = Depreciation.schedule({
    cost: 10000, section_179: 4000,
    in_service_date: '2025-06-01',
    method: 'ddb', life_years: 5, convention: 'half_year',
  });
  close(s[0].sec179, 4000);
  // Remaining $6k DDB year 1 = 40% × $6k × 0.5 = $1200
  close(s[0].depreciation, 1200);
  close(s[0].total_expense, 5200);
});

test('Bonus 100% fully expenses year 1 even with no §179', () => {
  const s = Depreciation.schedule({
    cost: 5000, bonus_pct: 100,
    in_service_date: '2025-06-01',
    method: 'bonus', life_years: 5, convention: 'half_year',
  });
  close(s[0].bonus, 5000);
  close(s[0].total_expense, 5000);
  close(s[0].closing_nbv, 0, 0.01);
});

test('Bonus 60% leaves 40% to depreciate over remaining life', () => {
  const s = Depreciation.schedule({
    cost: 10000, bonus_pct: 60,
    in_service_date: '2025-06-01',
    method: 'bonus', life_years: 5, convention: 'half_year',
  });
  close(s[0].bonus, 6000);
  // Remaining $4k depreciated normally; year 1 DDB = 40% × $4k × 0.5 = $800
  close(s[0].depreciation, 800);
});

// ============================================================
// Salvage value
// ============================================================
test('SL with salvage — final NBV = salvage, never below', () => {
  const s = Depreciation.schedule({
    cost: 10000, salvage_value: 1000,
    in_service_date: '2025-06-01',
    method: 'sl', life_years: 5, convention: 'half_year',
  });
  // Total depreciation should be $9000, leaving $1000 salvage
  const total = s.reduce((a, r) => a + r.depreciation, 0);
  close(total, 9000, 1);
});

// ============================================================
// Prior accumulated depreciation (the legacy app's import-from-other-system feature)
// ============================================================
test('prior_accum_dep — engine seeds accumulated and resumes from there', () => {
  const s = Depreciation.schedule({
    cost: 10000, prior_accum_dep: 4000,
    in_service_date: '2020-01-01',
    method: 'sl', life_years: 5, convention: 'half_year',
  });
  // Accumulated should start at $4000 + first year's depreciation
  // (engine still iterates from in_service_date but seeds totals)
  assert.ok(s[0].accumulated >= 4000, 'accumulated should be at least prior amount');
});

// ============================================================
// Land + Inventory — never depreciated
// ============================================================
test('is_land returns empty schedule', () => {
  const s = Depreciation.schedule({
    cost: 100000, is_land: true,
    in_service_date: '2020-01-01',
    method: 'sl', life_years: 1, convention: 'half_year',
  });
  // deepEqual across vm boundary fails on array prototype identity;
  // assert on shape directly.
  assert.equal(s.length, 0);
  assert.ok(Array.isArray(s));
});

test('is_inventory returns empty schedule (trading horses held for resale)', () => {
  const s = Depreciation.schedule({
    cost: 50000, is_inventory: true,
    in_service_date: '2025-01-01',
    method: 'sl', life_years: 7, convention: 'half_year',
  });
  assert.equal(s.length, 0);
  assert.ok(Array.isArray(s));
});

// ============================================================
// Disposal-year fractional convention
// ============================================================
test('disposal mid-year applies disposal fraction, not full year', () => {
  const s = Depreciation.schedule({
    cost: 10000, in_service_date: '2020-06-01',
    method: 'sl', life_years: 5, convention: 'half_year',
    disposal_date: '2024-06-15',
  });
  const dispRow = s[s.length - 1];
  // Disposed in 2024 → schedule should END in 2024 with half-year fraction applied
  assert.equal(dispRow.year, 2024);
  // 2024 dep should be ~half of full year's ($2k → $1k)
  close(dispRow.depreciation, 1000, 1);
});

test('disposed in same year as placed in service — single row, both fractions applied', () => {
  const s = Depreciation.schedule({
    cost: 10000, in_service_date: '2025-04-15',
    method: 'sl', life_years: 5, convention: 'half_year',
    disposal_date: '2025-09-15',
  });
  assert.equal(s.length, 1);
  // Engine takes min of firstYearFraction and disposalYearFraction
  // half-year ⇒ both = 0.5, so fraction = 0.5; SL annual = $2k → year = $1k
  close(s[0].depreciation, 1000, 1);
});

// ============================================================
// Improvements + land allocation (legacy property model)
// ============================================================
test('improvements_cost + land_value — depreciable basis = cost + improvements − land', () => {
  // $500k purchase, $50k improvements, $100k allocated to land
  // Total depreciable = $500k + $50k − $100k = $450k
  const s = Depreciation.schedule({
    cost: 500000, improvements_cost: 50000, land_value: 100000,
    in_service_date: '2025-04-15',
    method: 'sl', life_years: 27.5, convention: 'mid_month',
  });
  // Year 2 (full year) = $450k / 27.5 ≈ $16,363.64
  close(s[1].depreciation, 450000 / 27.5, 1);
});

// ============================================================
// yearTotals rollup
// ============================================================
test('yearTotals sums depreciation + accumulated + nbv across assets', () => {
  const assets = [
    { cost: 10000, in_service_date: '2025-06-01', method: 'sl', life_years: 5, convention: 'half_year' },
    { cost: 20000, in_service_date: '2025-06-01', method: 'sl', life_years: 5, convention: 'half_year' },
  ];
  const t = Depreciation.yearTotals(assets, 2025);
  assert.equal(t.count, 2);
  close(t.cost, 30000);
  // Each gets year-1 of $1k and $2k respectively
  close(t.depreciation, 3000);
});
