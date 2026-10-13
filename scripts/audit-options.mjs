// Options audit: does every answer a player can give actually matter, do the questions make sense in
// every context, and are the complication answers a real choice?
//   node scripts/audit-options.mjs
import {SHAPES, INPUTS, REPS, STAKES, AUTONOMY} from '../src/content/meridian.js';
import {BANDS, BAND_CAPS, WHERE, BUILDERS, SENSITIVITY, VERDICTS, verdictOf, valueOf, feasOf, numbersOf, challengesOf,
  suggestGuardrails, suggestCaps} from '../src/engine/engine.js';
import {DESTINATIONS, scoreTools} from '../src/engine/tools.js';
import {EVENT_POOL} from '../src/content/story.js';
import {V5_EVENTS} from '../src/content/campaign.js';

const ids = x=>x.map(o=>o.id);
const VID = Object.keys(VERDICTS), DID = DESTINATIONS.map(d=>d.id), LV = ['low','mid','high'];
const CH = ['stakes','band','auto','input','rep','builder'];
const NUMS = [null, {count:'200', per:'month', minutes:'60'}];

/* Everything the player is told about a step, packed into one integer. */
function outcome(a, n){
  const nums = numbersOf(n), value = valueOf(a, nums), feas = feasOf(a), v = verdictOf(a, value, feas), t = scoreTools(a);
  let ch = 0; challengesOf(a, nums).forEach(c=>{ ch |= 1 << (CH.indexOf(c.q)+1); });
  let g = 0; const gl = suggestGuardrails(a, a.cap); if(a.sens==='personal' && !gl.includes('privacy')) gl.unshift('privacy');
  ['threshold','logging','privacy','escalation','rollback','sampling','bias'].forEach((id,i)=>{ if(gl.includes(id)) g |= 1<<i; });
  return [VID.indexOf(v), DID.indexOf(t.winner), DID.indexOf(t.runnerUp)+1, LV.indexOf(value), LV.indexOf(feas), ch, g].join('.');
}

const DIMS = {shape:ids(SHAPES), input:ids(INPUTS), rep:ids(REPS), stakes:ids(STAKES), auto:ids(AUTONOMY), where:ids(WHERE), builder:ids(BUILDERS), sens:ids(SENSITIVITY)};
function* base(){
  for(const band of ids(BANDS)) for(const cap of BAND_CAPS[band]) for(const shape of DIMS.shape) for(const input of DIMS.input) for(const rep of DIMS.rep)
  for(const stakes of DIMS.stakes) for(const auto of DIMS.auto) for(const where of DIMS.where) for(const builder of DIMS.builder) for(const sens of DIMS.sens)
    yield {band, cap, shape, input, rep, stakes, auto, where, builder, sens};
}

/* 1. Influence: switching one answer while everything else stays the same; how often does what the player is told change? */
const influence = {}, deadPairs = {}, contextDead = {};
for(const k of Object.keys(DIMS)){
  const opts = DIMS[k], changed = {}; let n = 0;
  const byCtx = {};  // band/cap -> did this question ever matter
  for(const a of base()){
    if(a[k]!==opts[0]) continue;                        // visit each "other answers" context once
    for(const nm of NUMS){
      n++;
      const outs = opts.map(o=>outcome(Object.assign({}, a, {[k]:o}), nm));
      const ctx = a.band + '/' + a.cap;
      if(!byCtx[ctx]) byCtx[ctx] = false;
      for(let i=0;i<opts.length;i++) for(let j=i+1;j<opts.length;j++){
        const key = opts[i] + ' vs ' + opts[j];
        changed[key] = (changed[key]||0) + (outs[i]!==outs[j] ? 1 : 0);
        if(outs[i]!==outs[j]) byCtx[ctx] = true;
      }
    }
  }
  influence[k] = {}; Object.entries(changed).forEach(([p,c])=>{ influence[k][p] = Math.round(c/n*1000)/10; if(c===0) (deadPairs[k] = deadPairs[k]||[]).push(p); });
  contextDead[k] = Object.entries(byCtx).filter(([,v])=>!v).map(([c])=>c);
}

/* 2. Coherence: a capability that does not fit the kind of work, with nothing to say so. */
let combos = 0, misfit = 0, misfitSilent = 0; const misfitExamples = {};
for(const band of ids(BANDS)) for(const cap of BAND_CAPS[band]) for(const shape of DIMS.shape) for(const input of DIMS.input){
  combos++;
  const fits = suggestCaps({shape, input, rep:'mid', stakes:'mid'}).caps.map(c=>c.id);
  if(fits.includes(cap)) continue;
  misfit++;
  const a = {band, cap, shape, input, rep:'mid', stakes:'mid', auto:'review', where:'mixed', builder:'team', sens:'internal'};
  if(!challengesOf(a, null).some(c=>c.q==='band' || c.q==='cap' || c.q==='shape')){ misfitSilent++; const k = shape+' + '+cap; misfitExamples[k] = (misfitExamples[k]||0)+1; }
}
/* shape vs LLM fit: work that is forecasting, scheduling or physical, read as an LLM's job */
const bandMis = [];
for(const shape of ['predict','allocate','physical']) for(const band of ['core','assist']){
  const a = {band, cap:BAND_CAPS[band][0], shape, input:'structured', rep:'mid', stakes:'mid', auto:'review', where:'mixed', builder:'team', sens:'internal'};
  bandMis.push(`${shape} read as ${band}: ${challengesOf(a, null).length ? 'challenged' : 'no challenge'}`);
}

/* 3. Complication answers: is the strong answer given away by its length? */
const events = EVENT_POOL.concat(V5_EVENTS);
let longest = 0; const lens = {0:[],1:[],2:[]};
events.forEach(e=>{ const L = e.opts.map(o=>o.t.length); const s = e.opts.findIndex(o=>o.s===2);
  if(L[s]===Math.max(...L)) longest++; e.opts.forEach(o=>lens[o.s].push(o.t.length)); });
const avg = xs=>Math.round(xs.reduce((a,b)=>a+b,0)/xs.length);

console.log('1. INFLUENCE: % of contexts where switching one answer changes what the player is told');
Object.entries(influence).forEach(([k,v])=>console.log(' ', k.padEnd(8), Object.entries(v).map(([p,c])=>`${p} ${c}%`).join(' | ')));
console.log('   never changes anything:', JSON.stringify(deadPairs));
console.log('   questions that never matter for some band/capability:');
Object.entries(contextDead).forEach(([k,v])=>{ if(v.length) console.log('    ', k.padEnd(8), v.join(', ')); });
console.log('\n2. COHERENCE');
console.log(`   ${misfit} of ${combos} kind-of-work/capability pairs are ones the suggestion engine does not list as a fit; ${misfitSilent} draw no challenge`);
console.log('   most common silent misfits:', Object.entries(misfitExamples).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([k,v])=>`${k} (${v})`).join(', '));
console.log('   ', bandMis.join('; '));
console.log('\n3. COMPLICATIONS');
console.log(`   the strong answer is the longest in ${longest} of ${events.length} complications`);
console.log(`   average length: strong ${avg(lens[2])} characters, workable ${avg(lens[1])}, risky ${avg(lens[0])}`);
