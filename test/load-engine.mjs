// Loads the Depreciation engine out of index.html into a Node-runnable module.
//
// The production app embeds the engine in an IIFE inside <script>. Rather than
// duplicate the engine in test code (which lets bugs hide), we read the source
// HTML, find the engine script body, and eval it in a vm sandbox where we
// expose `globalThis` to act as `window`. The engine's IIFE then attaches a
// `Depreciation` object to the sandbox global, which we re-export here.
//
// This is also the loader used by the schema-guard and helper unit tests.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

function extractScript(marker) {
  const re = /<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(HTML))) {
    if (m[1].includes(marker)) return m[1];
  }
  throw new Error('Could not find script block containing: ' + marker);
}

const engineSrc = extractScript('global.Depreciation =');

const sandbox = { console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(engineSrc, sandbox, { filename: 'depreciation-engine.js' });

if (!sandbox.Depreciation) {
  throw new Error('Engine did not attach Depreciation to global');
}

export const Depreciation = sandbox.Depreciation;
