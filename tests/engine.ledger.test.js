/* LEDGER of deliberate changes to the decision engine since Groundwork v4.
   Every state of scoreTools's input space is compared with a frozen copy of the v4 module
   (tests/legacy/tools-v4.js). The only allowed difference is the ones listed here; anything else fails.
   Verdicts, value, feasibility, challenges, guardrails and the numbers sentences are compared with the v4
   fixture and must be byte-identical.

   CHANGE 1 (v6): an agentic step (cap "agent" or shape "coordinate") in the LLM bands, with personal data,
   used to point at plain LPP, which cannot act. Personal data now credits LPP Plus for agentic steps.
*/
import {describe, it, expect} from 'vitest';
import fs from 'node:fs';
import {probe} from './probe.js';
import * as meridian from '../src/content/meridian.js';
import * as expeditions from '../src/content/expeditions.js';
import * as engine from '../src/engine/engine.js';
import * as tools from '../src/engine/tools.js';
import {scoreTools as v4Score} from './legacy/tools-v4.js';

const {BANDS, BAND_CAPS, WHERE, BUILDERS, SENSITIVITY} = engine;
const {AUTONOMY, REPS} = meridian;
const ids = x=>x.map(o=>o.id);

function* states(){
  for(const band of ids(BANDS)) for(const cap of BAND_CAPS[band]) for(const shape of ['extract','coordinate'])
  for(const sens of ids(SENSITIVITY)) for(const where of ids(WHERE)) for(const builder of ids(BUILDERS))
  for(const auto of ids(AUTONOMY)) for(const rep of ids(REPS)) yield {band, cap, shape, sens, where, builder, auto, rep};
}
const inChange1 = a=> (a.band==='core' || a.band==='assist') && (a.cap==='agent' || a.shape==='coordinate') && a.sens==='personal';

describe('scoring differs from v4 only where the ledger says', ()=>{
  it('is identical everywhere outside change 1', ()=>{
    let n = 0; const bad = [];
    for(const a of states()){
      if(inChange1(a)) continue;
      const now = tools.scoreTools(a), was = v4Score(a); n++;
      if(JSON.stringify(now.scores)!==JSON.stringify(was.scores) || now.winner!==was.winner || now.runnerUp!==was.runnerUp) bad.push(a);
    }
    expect(bad.slice(0,3)).toEqual([]);
    expect(n).toBeGreaterThan(15000);
  });
  it('change 1: agentic steps with personal data now point at LPP Plus, and only the personal-data credit moved', ()=>{
    let n = 0;
    for(const a of states()){
      if(!inChange1(a)) continue;
      const now = tools.scoreTools(a), was = v4Score(a); n++;
      expect(now.winner, JSON.stringify(a)).toBe('lppplus');
      expect(now.scores.lppplus - was.scores.lppplus).toBe(3);
      expect(now.scores.lpp - was.scores.lpp).toBe(-3);
      ['copilot','studio','codehelper','none'].forEach(k=>expect(now.scores[k]).toBe(was.scores[k]));
    }
    expect(n).toBeGreaterThan(1000);
  });
});

describe('everything but tool scoring is untouched since v4', ()=>{
  const golden = JSON.parse(fs.readFileSync(new URL('./fixtures/golden-v4.json', import.meta.url), 'utf8'));
  const now = probe({...meridian, ...expeditions, ...engine, ...tools}, golden.pids);
  it('keeps value, feasibility, verdict, challenges and guardrails for all 4,000 sampled combinations', ()=>{
    const cols = line=>{ const p = line.split('|'); return [p[0], p[1], p[2], p[5], p[6]].join('|'); };
    const diffs = golden.grid.map((g,i)=> cols(g)===cols(now.grid[i]) ? null : i).filter(i=>i!==null);
    expect(diffs.slice(0,5)).toEqual([]);
  });
  it('keeps every Meridian step\'s field verdict, band and guardrails', ()=>{
    golden.pids.forEach(pid=>golden.processes[pid].steps.forEach((st,i)=>{
      const cur = now.processes[pid].steps[i];
      expect([cur.verdict, cur.band, cur.guard], pid+i).toEqual([st.verdict, st.band, st.guard]);
    }));
  });
  it('keeps the numbers sentences', ()=>{ expect(now.numbers).toEqual(golden.numbers); });
});
