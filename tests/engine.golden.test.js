/* The decision engine must decide exactly as Groundwork v4 did.
   tests/fixtures/golden-v4.json was produced by running tests/probe.js
   against the v4 scripts (commit c41113f) before the rewrite. If a change
   to scoring is intended, regenerate the fixture and say why in the commit. */
import {describe, it, expect} from 'vitest';
import fs from 'node:fs';
import {probe} from './probe.js';
import * as meridian from '../src/content/meridian.js';
import * as expeditions from '../src/content/expeditions.js';
import * as engine from '../src/engine/engine.js';
import * as tools from '../src/engine/tools.js';

const golden = JSON.parse(fs.readFileSync(new URL('./fixtures/golden-v4.json', import.meta.url), 'utf8'));
const api = {...meridian, ...expeditions, ...engine, ...tools};
const now = probe(api, golden.pids);

describe('decision engine matches v4', ()=>{
  it('reads every v4 process the same way', ()=>{
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
