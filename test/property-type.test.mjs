// Tests for the effectivePropertyType heuristic. Pulls the function out of
// index.html and runs it against in-memory fixtures.
//
// Run: `node --test test/property-type.test.mjs`

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Pull just the helper out of the app-logic IIFE — much smaller than evaling
// the whole file (which references DOM/Supabase).
function extract(name) {
  const re = new RegExp(
    'function\\s+' + name + '\\s*\\(([\\s\\S]*?)\\)\\s*\\{([\\s\\S]*?)^}',
    'm'
  );
  const m = HTML.match(re);
  if (!m) throw new Error('Could not extract ' + name);
  return new Function('byId', 'STATE', 'PROP_TYPE_LABELS',
    'return function ' + name + '(' + m[1] + ') {' + m[2] + '};'
  );
}

const STATE = { categories: [] };
const byId = (arr, id) => arr.find(x => x.id === id) || null;
const PROP_TYPE_LABELS = {
  '1245':'§1245 (personal property)',
  '1250':'§1250 (real property)',
  'none':'None / non-recapture',
};

const effectivePropertyType = extract('effectivePropertyType')(byId, STATE, PROP_TYPE_LABELS);

const fix = (overrides) => Object.assign({
  category_id: null, property_type: null, is_land: false,
  pool_type: null, life_years: 5,
}, overrides);

// ============================================================
// Per-asset override is highest priority
// ============================================================
test('explicit asset.property_type wins over everything', () => {
  STATE.categories = [{ id:'c1', property_type:'1250' }];
  const a = fix({ category_id:'c1', property_type:'none', is_land:true, life_years:39 });
  // Override should win
  assert.equal(effectivePropertyType(a), 'none');
});

// ============================================================
// Category default
// ============================================================
test('category property_type used when asset has none', () => {
  STATE.categories = [{ id:'c1', property_type:'1250' }];
  const a = fix({ category_id:'c1', property_type:null });
  assert.equal(effectivePropertyType(a), '1250');
});

// ============================================================
// Heuristic: is_land → 'none'
// ============================================================
test('is_land → "none" (land has no §1245/§1250 recapture)', () => {
  STATE.categories = [];
  const a = fix({ is_land: true, life_years: 0.5 });
  assert.equal(effectivePropertyType(a), 'none');
});

test('is_land trumps real-property life heuristic', () => {
  STATE.categories = [];
  const a = fix({ is_land: true, life_years: 39 });
  assert.equal(effectivePropertyType(a), 'none');
});

// ============================================================
// Heuristic: pool_type=property + life ≥ 27 → '1250'
// ============================================================
test('property pool with 27.5-year life → §1250', () => {
  STATE.categories = [];
  const a = fix({ pool_type:'property', life_years: 27.5 });
  assert.equal(effectivePropertyType(a), '1250');
});

test('property pool with 39-year life → §1250', () => {
  STATE.categories = [];
  const a = fix({ pool_type:'property', life_years: 39 });
  assert.equal(effectivePropertyType(a), '1250');
});

test('property pool with 15-year life → §1245 (land improvements)', () => {
  STATE.categories = [];
  const a = fix({ pool_type:'property', life_years: 15 });
  assert.equal(effectivePropertyType(a), '1245');
});

// ============================================================
// Heuristic: trading horses, recip mares, equipment → '1245'
// ============================================================
test('trading horse → §1245', () => {
  STATE.categories = [];
  const a = fix({ pool_type:'trading', life_years: 7 });
  assert.equal(effectivePropertyType(a), '1245');
});

test('recip mare → §1245', () => {
  STATE.categories = [];
  const a = fix({ pool_type:'recip_mare', life_years: 7 });
  assert.equal(effectivePropertyType(a), '1245');
});

test('default equipment → §1245', () => {
  STATE.categories = [];
  const a = fix({ life_years: 5 });
  assert.equal(effectivePropertyType(a), '1245');
});

// ============================================================
// Defensive: missing or weird inputs
// ============================================================
test('null asset → "1245" default', () => {
  STATE.categories = [];
  assert.equal(effectivePropertyType(null), '1245');
});

test('asset with category_id pointing to deleted category → falls through to heuristic', () => {
  STATE.categories = [];
  const a = fix({ category_id:'missing-id', life_years: 5 });
  assert.equal(effectivePropertyType(a), '1245');
});
