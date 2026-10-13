// Regenerates tests/fixtures/golden-current.json from the engine as it is now.
// Run this ONLY after a deliberate change to scoring, and record the change in tests/engine.ledger.test.js.
import fs from 'node:fs';
import {probe} from '../tests/probe.js';
import * as meridian from '../src/content/meridian.js';
import * as expeditions from '../src/content/expeditions.js';
import * as engine from '../src/engine/engine.js';
import * as tools from '../src/engine/tools.js';
const out = probe({...meridian, ...expeditions, ...engine, ...tools});
out.source = 'Groundwork engine as of v6 (see tests/engine.ledger.test.js for the changes since v4)';
fs.writeFileSync(new URL('../tests/fixtures/golden-current.json', import.meta.url), JSON.stringify(out));
console.log('wrote golden-current.json:', out.pids.length, 'processes,', out.grid.length, 'sampled combinations');
