// Static analysis of every `updateRec / insertRec / upsert(<table>, …)` call
// site in index.html. Verifies that every column written to a table is listed
// in SCHEMA_EXPECT for that table.
//
// THIS TEST WOULD HAVE CAUGHT THE disposal_date BUG. The legacy code wrote
// `disposal_date` into an updateRec("assets", …) payload, but `disposal_date`
// is only a column on the `disposals` table — production failed at runtime
// with "could not find disposal_date in schema cache".
//
// Run: `node --test test/schema-guard.test.mjs`

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// ------- pull SCHEMA_EXPECT out of index.html -------
function extractSchemaExpect() {
  const m = HTML.match(/const SCHEMA_EXPECT = (\{[\s\S]*?\n\};)/);
  if (!m) throw new Error('SCHEMA_EXPECT not found in index.html');
  // Body uses `{ col:'x', gatedBy:'y' }` shorthand objects mixed with strings;
  // safe to eval since this is our own source.
  return new Function('return ' + m[1].replace(/;$/, ''))();
}
const SCHEMA = extractSchemaExpect();

const allColsFor = (table) => {
  const list = SCHEMA[table];
  if (!list) return null;
  return list.map(c => typeof c === 'string' ? c : c.col);
};

// ------- find every write call site -------
// Walk the source, find every write call site where the payload is a { ... }
// object literal directly inline. Calls where the payload is a variable
// (e.g. `upsert("assets", payload)`) cannot be statically analyzed and are
// skipped here — they're covered by the runtime schema guard instead.
function findWrites() {
  const calls = [];

  // For each call form, the regex matches up to (and including) the opening
  // brace `{` of the payload literal. If the call uses a variable instead of
  // a literal, the regex won't match and we skip it.
  const patterns = [
    { re: /updateRec\(\s*"([a-z_]+)"\s*,\s*[^,()]+,\s*\{/g,           op: 'update' },
    { re: /insertRec\(\s*"([a-z_]+)"\s*,\s*\{/g,                       op: 'insert' },
    { re: /\bupsert\(\s*"([a-z_]+)"\s*,\s*\{/g,                        op: 'upsert' },
    { re: /sb\.from\(\s*"([a-z_]+)"\s*\)\s*\.\s*insert\(\s*\{/g,       op: 'insert' },
    { re: /sb\.from\(\s*"([a-z_]+)"\s*\)\s*\.\s*update\(\s*\{/g,       op: 'update' },
    { re: /sb\.from\(\s*"([a-z_]+)"\s*\)\s*\.\s*upsert\(\s*\{/g,       op: 'upsert' },
  ];

  for (const p of patterns) {
    let m;
    while ((m = p.re.exec(HTML))) {
      const table = m[1];
      // The opening `{` is the last char of the match. Balance braces from there.
      const open = m.index + m[0].length - 1;
      let depth = 1, j = open + 1;
      while (j < HTML.length && depth > 0) {
        const ch = HTML[j];
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        if (depth === 0) break;
        j++;
      }
      const literal = HTML.slice(open, j + 1);
      // Extract top-level keys at depth 1
      const keys = [];
      let d = 0, k = 0;
      while (k < literal.length) {
        const ch = literal[k];
        if (ch === '{' || ch === '[' || ch === '(') { d++; k++; continue; }
        if (ch === '}' || ch === ']' || ch === ')') { d--; k++; continue; }
        if (d === 1) {
          const slice = literal.slice(k);
          const km = slice.match(/^\s*(?:"([^"]+)"|'([^']+)'|([a-zA-Z_][a-zA-Z0-9_]*))\s*:/);
          if (km) {
            keys.push(km[1] || km[2] || km[3]);
            k += km[0].length;
            continue;
          }
        }
        k++;
      }
      const line = HTML.slice(0, m.index).split('\n').length;
      calls.push({ table, op: p.op, keys, line });
    }
  }
  return calls;
}

const writes = findWrites();

// ============================================================
// Sanity: SCHEMA_EXPECT covers every table we write to
// ============================================================
test('every table written to is declared in SCHEMA_EXPECT', () => {
  const writtenTables = new Set(writes.map(w => w.table));
  const declaredTables = new Set(Object.keys(SCHEMA));
  const missing = [...writtenTables].filter(t => !declaredTables.has(t));
  assert.deepEqual(missing, [],
    `Tables written but not declared in SCHEMA_EXPECT: ${missing.join(', ')}`);
});

// ============================================================
// THE big one: every column in every write payload is declared
// ============================================================
test('every column written to a table is declared in SCHEMA_EXPECT for that table', () => {
  const violations = [];
  for (const w of writes) {
    const allowed = new Set(allColsFor(w.table) || []);
    for (const k of w.keys) {
      if (!allowed.has(k)) {
        violations.push(`${w.table}.${k} (${w.op} at index.html:${w.line})`);
      }
    }
  }
  assert.deepEqual(violations, [],
    'Columns written but not declared in SCHEMA_EXPECT:\n  ' + violations.join('\n  '));
});

// ============================================================
// Regression test for the specific disposal_date bug — pin it down explicitly
// ============================================================
test('regression: disposal_date is NOT written to assets table anywhere', () => {
  const violations = writes
    .filter(w => w.table === 'assets' && w.keys.includes('disposal_date'))
    .map(w => `${w.op} at index.html:${w.line}`);
  assert.deepEqual(violations, [],
    'disposal_date written to assets table:\n  ' + violations.join('\n  '));
});

// ============================================================
// All known critical columns we write are covered
// ============================================================
test('SCHEMA_EXPECT.assets covers every column the asset modal saves', () => {
  const cols = allColsFor('assets');
  // Picked from the asset modal save payload
  const required = ['description','asset_number','category_id','entity_id','in_service_date',
    'cost','salvage_value','section_179','method','life_years','convention','bonus_pct',
    'status','pool_type','property_group','is_land','is_inventory','prior_accum_dep','improvements_cost'];
  const missing = required.filter(c => !cols.includes(c));
  assert.deepEqual(missing, [], `assets missing critical cols: ${missing.join(', ')}`);
});

test('SCHEMA_EXPECT.disposals covers every column the disposal modal saves', () => {
  const cols = allColsFor('disposals');
  const required = ['asset_id','disposal_date','disposal_type','proceeds','buyer','notes',
    'is_partial','ownership_pct_sold','cost_retired','created_by'];
  const missing = required.filter(c => !cols.includes(c));
  assert.deepEqual(missing, [], `disposals missing critical cols: ${missing.join(', ')}`);
});
