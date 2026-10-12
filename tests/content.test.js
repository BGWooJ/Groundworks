/* Content holds together: every process validates, and every Field Report names its source. */
import {describe, it, expect} from 'vitest';
import {FUNCTIONS} from '../src/content/meridian.js';
import {validateExpeditions, getExpedition} from '../src/content/expeditions.js';
import {FIELD_REPORTS, reportFor} from '../src/content/fieldReports.js';
import {ALL_EVENTS} from '../src/game/store.js';
import {CAPS} from '../src/content/meridian.js';
import {VERDICTS} from '../src/engine/engine.js';
import {rankOf, applyStats, blankStats} from '../src/game/rpg.js';

describe('content', ()=>{
  it('every process validates', ()=>{ expect(validateExpeditions()).toEqual([]); });
  it('has thirteen departments and every process is walkable', ()=>{
    expect(FUNCTIONS.length).toBe(13);
    FUNCTIONS.forEach(f=>f.processes.forEach(p=>expect(getExpedition(p.id), p.id).toBeTruthy()));
  });
  it('every Field Report is sourced and tagged with real capabilities and verdicts', ()=>{
    FIELD_REPORTS.forEach(r=>{
      expect(r.source.url, r.id).toMatch(/^https:\/\//);
      r.caps.forEach(c=>expect(CAPS[c], r.id+' '+c).toBeTruthy());
      r.verdicts.forEach(v=>expect(VERDICTS[v], r.id+' '+v).toBeTruthy());
    });
  });
  it('every complication has three answers with feedback, and any linked report exists', ()=>{
    ALL_EVENTS.forEach(e=>{
      expect(e.opts.length, e.id).toBe(3);
      e.opts.forEach(o=>expect(o.fb, e.id).toBeTruthy());
      if(e.report) expect(FIELD_REPORTS.some(r=>r.id===e.report), e.id).toBe(true);
    });
  });
  it('finds a relevant case for common reads', ()=>{
    expect(reportFor({cap:'extract', verdict:'pilot', shape:'extract'}).id).toBe('coin');
    expect(reportFor({cap:'anomaly', verdict:'assist', shape:'check'}).id).toBe('danske');
  });
});
describe('rpg', ()=>{
  it('ranks by experience', ()=>{ expect(rankOf(0).name).toBe('Apprentice Surveyor'); expect(rankOf(400).name).toBe('Pathfinder'); });
  it('keeps standing within bounds', ()=>{ expect(applyStats(blankStats(), {rigor:-50}).rigor).toBe(0); expect(applyStats(blankStats(), {cred:50}).cred).toBe(20); });
});
