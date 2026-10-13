/* Pins the decision engine's current behaviour: every Meridian step under every tool context, plus
   4,000 sampled answer combinations. A scoring change fails this test until the fixture is regenerated
   (npm run golden) AND the change is recorded in tests/engine.ledger.test.js, which proves what moved
   since Groundwork v4 (tests/fixtures/golden-v4.json, kept as history). */
import {describe, it, expect} from 'vitest';
import fs from 'node:fs';
import {probe} from './probe.js';
import * as meridian from '../src/content/meridian.js';
import * as expeditions from '../src/content/expeditions.js';
import * as engine from '../src/engine/engine.js';
import * as tools from '../src/engine/tools.js';

const golden = JSON.parse(fs.readFileSync(new URL('./fixtures/golden-current.json', import.meta.url), 'utf8'));
const api = {...meridian, ...expeditions, ...engine, ...tools};
const now = probe(api, golden.pids);

describe('decision engine matches its pinned behaviour', ()=>{
  it('reads every Meridian process the same way', ()=>{
    golden.pids.forEach(pid=> expect(now.processes[pid], pid).toEqual(golden.processes[pid]));
  });
  it('decides 4,000 sampled answer combinations the same way', ()=>{
    const diffs = golden.grid.map((g,i)=> g===now.grid[i] ? null : {i, was:g, now:now.grid[i]}).filter(Boolean);
    expect(diffs.slice(0,5)).toEqual([]);
  });
  it('states the numbers the same way', ()=>{
    expect(now.numbers).toEqual(golden.numbers);
  });
});
