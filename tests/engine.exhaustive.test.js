/* Properties of the decision engine, checked over its whole input space rather than a sample. */
import {describe, it, expect} from 'vitest';
import * as meridian from '../src/content/meridian.js';
import * as engine from '../src/engine/engine.js';
import * as tools from '../src/engine/tools.js';

const {BANDS, BAND_CAPS, WHERE, BUILDERS, SENSITIVITY, VERDICTS, verdictOf, valueOf, feasOf, numbersOf} = engine;
const {AUTONOMY, REPS, STAKES, INPUTS} = meridian;
const {scoreTools, TIE_ORDER} = tools;
const ids = x=>x.map(o=>o.id);

describe('verdictOf', ()=>{
  it('always returns one known verdict (no gaps) and reaches all eight', ()=>{
    const NUMS = [null, {count:'1',per:'month',minutes:'60'}, {count:'25',per:'month',minutes:'60'}, {count:'200',per:'month',minutes:'60'}];
    const seen = new Set(); let n = 0;
    for(const band of ids(BANDS)) for(const cap of BAND_CAPS[band]) for(const input of ids(INPUTS)) for(const rep of ids(REPS))
    for(const stakes of ids(STAKES)) for(const auto of ids(AUTONOMY)) for(const builder of ids(BUILDERS)) for(const nm of NUMS){
      const a = {band, cap, input, rep, stakes, auto, builder};
      const nums = numbersOf(nm), v = verdictOf(a, valueOf(a, nums), feasOf(a)); n++;
      expect(VERDICTS[v], JSON.stringify(a)).toBeTruthy();
      seen.add(v);
    }
    expect([...seen].sort()).toEqual(Object.keys(VERDICTS).sort());
    expect(n).toBeGreaterThan(30000);
  });
});

describe('scoreTools', ()=>{
  const all = [];
  for(const band of ids(BANDS)) for(const cap of BAND_CAPS[band]) for(const shape of ['extract','coordinate'])
  for(const sens of ids(SENSITIVITY)) for(const where of ids(WHERE)) for(const builder of ids(BUILDERS))
  for(const auto of ids(AUTONOMY)) for(const rep of ids(REPS)) all.push({band, cap, shape, sens, where, builder, auto, rep});

  it('is deterministic: ties go to the earliest destination in TIE_ORDER', ()=>{
    for(const a of all){
      const t = scoreTools(a), max = Math.max(...Object.values(t.scores));
      const first = TIE_ORDER.find(id=>t.scores[id]===max);
      expect(t.winner, JSON.stringify(a)).toBe(first);
      expect(scoreTools(a).winner).toBe(t.winner);
    }
  });
  it('never points an agentic step in the LLM bands at plain LPP, which cannot act', ()=>{
    for(const a of all){
      if(!(a.band==='core' || a.band==='assist')) continue;
      if(!(a.cap==='agent' || a.shape==='coordinate')) continue;
      expect(scoreTools(a).winner, JSON.stringify(a)).not.toBe('lpp');
    }
  });
  it('keeps personal data inside the air-gapped suite: LPP for answering, LPP Plus for acting', ()=>{
    for(const a of all){
      if(!(a.band==='core' || a.band==='assist') || a.sens!=='personal') continue;
      const w = scoreTools(a).winner;
      expect(['lpp','lppplus'], JSON.stringify(a)).toContain(w);
    }
  });
});
