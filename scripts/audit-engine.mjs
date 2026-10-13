// Engine audit: enumerates the whole input space of verdictOf and scoreTools (it is small enough to
// check exhaustively, so nothing here is sampled) and reports exclusivity, gaps, ties, overlapping
// rules, golden-sample coverage, and whether the content can be answered correctly through the UI.
//   node scripts/audit-engine.mjs            human-readable report
//   node scripts/audit-engine.mjs --json     machine-readable
import fs from 'node:fs';
import {FUNCTIONS, CAPS, GUARDRAILS, SHAPES, AUTONOMY, INPUTS, REPS, STAKES} from '../src/content/meridian.js';
import {getExpedition} from '../src/content/expeditions.js';
import {FIELD_REPORTS} from '../src/content/fieldReports.js';
import {EVENT_POOL, COMPLICATION_SLOTS} from '../src/content/story.js';
import {V5_EVENTS} from '../src/content/campaign.js';
import {BANDS, BAND_CAPS, WHERE, BUILDERS, SENSITIVITY, VERDICTS, verdictOf, valueOf, feasOf,
  numbersOf, challengesOf, expertBand, fieldVerdict} from '../src/engine/engine.js';
import {DESTINATIONS, scoreTools} from '../src/engine/tools.js';

const out = {};
const ids = x=>x.map(o=>o.id);
const tally = (m, k)=>{ m[k] = (m[k]||0)+1; };

/* ---------- 1. verdicts: exclusivity, gaps, precedence ---------- */
// Every state a player (or the field) can reach: cap must belong to the band the UI offers.
const NUMS = [null,
  {count:'1', per:'month', minutes:'60'},                       // ~1 h:   low value
  {count:'10', per:'month', minutes:'60', rework:'quarter'},    // ~12 h:  low, lifted by rework
  {count:'25', per:'month', minutes:'60'},                       // 25 h:   mid
  {count:'200', per:'month', minutes:'60'}];                     // 200 h:  high
const verdictFirst = {}, verdictAlso = {}, verdictReach = {};
let states = 0;
const rules = [  // the conditions of verdictOf, in order, so overlaps can be counted
  ['fix',         (a)=>a.cap==='fix'],
  ['capture',     (a)=>a.input==='tacit'],
  ['small',       (a,v)=>v==='low' && a.rep==='low'],
  ['engineering', (a)=>a.band==='none' || a.cap==='rules'],
  ['assist',      (a)=>a.stakes==='high' || a.band==='assist' || a.auto==='assist'],
  ['park',        (a,v,f)=>f==='low' && v!=='low'],
  ['prepare',     (a,v,f)=>f==='mid' || a.input==='media'],
  ['pilot',       ()=>true],
];
for(const band of ids(BANDS)) for(const cap of BAND_CAPS[band]) for(const input of ids(INPUTS)) for(const rep of ids(REPS))
for(const stakes of ids(STAKES)) for(const auto of ids(AUTONOMY)) for(const builder of ids(BUILDERS)) for(const n of NUMS){
  const a = {band, cap, input, rep, stakes, auto, builder, where:'mixed', sens:'internal', shape:'extract'};
  if(n && n.rework) a.rework = n.rework;
  const nums = numbersOf(n), value = valueOf(a, nums), feas = feasOf(a);
  const v = verdictOf(a, value, feas);
  states++;
  const fired = rules.filter(([,p])=>p(a, value, feas)).map(([id])=>id);
  if(fired[0]!==v) throw new Error('verdictOf disagrees with its own rule order: '+JSON.stringify(a));
  tally(verdictReach, v);
  if(fired.length>2){ // more than the verdict itself plus the fallback
    const k = fired.slice(0, -1).join(' > '); tally(verdictAlso, k);
  }
}
out.verdicts = {states, reachable:verdictReach, unreachable:Object.keys(VERDICTS).filter(v=>!verdictReach[v]),
  topOverlaps:Object.entries(verdictAlso).sort((a,b)=>b[1]-a[1]).slice(0,8)};

/* ---------- 2. tools: ties, invariants, overlapping rules ---------- */
let total = 0, ties = 0, negative = 0, runnerUps = 0;
const tiePairs = {}, agentWrong = {}, agentAll = {}, tieByClass = {};
const ACT_TOOLS = ['lppplus','studio','codehelper'];  // the destinations that can act across systems
for(const band of ids(BANDS)) for(const cap of BAND_CAPS[band]) for(const coord of [false, true]) for(const sens of ids(SENSITIVITY))
for(const where of ids(WHERE)) for(const builder of ids(BUILDERS)) for(const auto of ids(AUTONOMY)) for(const rep of ids(REPS)){
  const a = {band, cap, shape:coord?'coordinate':'extract', sens, where, builder, auto, rep};
  const t = scoreTools(a); total++;
  const ranked = DESTINATIONS.map(d=>d.id).sort((x,y)=>t.scores[y]-t.scores[x]);
  if(Object.values(t.scores).some(s=>s<0)) negative++;
  if(t.runnerUp) runnerUps++;
  if(t.scores[ranked[0]]===t.scores[ranked[1]]){
    ties++; tally(tiePairs, ranked[0]+' beat '+ranked[1]);
    if((cap==='agent' || coord) && band!=='none' && band!=='other') tally(tieByClass, `${cap==='agent'?'agent':'coordinate'} step, ${sens} data`);
  }
  if(band!=='none' && band!=='other' && (cap==='agent' || coord)){
    tally(agentAll, 'all'); if(!ACT_TOOLS.includes(t.winner)) tally(agentWrong, `${t.winner} (${sens} data)`);
  }
}
out.tools = {states:total, tiedForFirst:ties, tiePairs, negativeScoreStates:negative, runnerUpStates:runnerUps,
  agentStepsTotal:agentAll.all, agentStepsPointedAtATool_that_cannot_act:agentWrong, tiesOnAgentSteps:tieByClass};

/* overlap: agent/coordinate steps already earn Copilot Studio +2 for connecting systems; 'where = a business system' adds +2 for the same fact */
let overlapStates = 0, overlapFlips = 0;
for(const band of ['core','assist']) for(const cap of BAND_CAPS[band]) for(const sens of ids(SENSITIVITY)) for(const builder of ids(BUILDERS)) for(const rep of ids(REPS)){
  const a = {band, cap, shape:cap==='agent'?'extract':'coordinate', sens, where:'system', builder, auto:'review', rep};
  if(!(cap==='agent' || a.shape==='coordinate')) continue;
  const t = scoreTools(a); overlapStates++;
  const s2 = Object.assign({}, t.scores, {studio:t.scores.studio-2});
  const ranked = DESTINATIONS.map(d=>d.id).sort((x,y)=>s2[y]-s2[x]);
  if(ranked[0]!==t.winner) overlapFlips++;
}
out.tools.studioCreditedTwiceForSystems = {states:overlapStates, winnerWouldChangeIfCountedOnce:overlapFlips};

/* ---------- 3. golden coverage: how much of the exhaustive space does the sample reach? ---------- */
const golden = JSON.parse(fs.readFileSync(new URL('../tests/fixtures/golden-v4.json', import.meta.url), 'utf8'));
const sig = line=>{ const p = line.split('|'); return p[0]+'|'+p[1]+'|'+p[2]+'|'+p[3]+'|'+p[5]; }; // value|feas|verdict|tool|challenges
const sampleSigs = new Set(golden.grid.map(sig));
const allSigs = new Set(); let allStates = 0;
for(const band of ids(BANDS)) for(const cap of BAND_CAPS[band]) for(const input of ids(INPUTS)) for(const rep of ids(REPS)) for(const stakes of ids(STAKES))
for(const auto of ids(AUTONOMY)) for(const where of ids(WHERE)) for(const builder of ids(BUILDERS)) for(const sens of ids(SENSITIVITY))
for(const shape of ['extract','coordinate']) for(const n of NUMS){
  const a = {band, cap, input, rep, stakes, auto, where, builder, sens, shape}; if(n && n.rework) a.rework = n.rework;
  const nums = numbersOf(n), value = valueOf(a, nums), feas = feasOf(a), t = scoreTools(a);
  allStates++;
  allSigs.add([value, feas, verdictOf(a, value, feas), t.winner+'/'+(t.runnerUp||'-'), challengesOf(a, nums).map(c=>c.q).join(',')].join('|'));
}
const covered = [...sampleSigs].filter(x=>allSigs.has(x)).length;
out.golden = {sampleSize:golden.grid.length, exhaustiveStates:allStates, distinctOutcomes:allSigs.size, reachedBySample:covered,
  coveragePct:Math.round(covered/allSigs.size*1000)/10};

/* ---------- 4. content integrity against the engine ---------- */
const problems = [], info = [];
const has = (list, id)=>list.some(o=>o.id===id);
let steps = 0;
FUNCTIONS.forEach(fn=>fn.processes.forEach(p=>{
  const e = getExpedition(p.id); if(!e){ problems.push(`${p.id}: no expedition`); return; }
  e.steps.forEach(st=>{
    steps++; const at = `${p.id}/${st.id}`;
    const band = expertBand(st);
    if(!BAND_CAPS[band].includes(st.expertPick)) problems.push(`${at}: field picks "${st.expertPick}" but the cap question offers only ${BAND_CAPS[band].join(', ')} for band "${band}", so a player can never match it`);
    if(!st.fit.best.includes(st.expertPick)) problems.push(`${at}: expertPick "${st.expertPick}" is not in fit.best`);
    [...st.fit.best, ...st.fit.ok].forEach(c=>{ if(!st.fitNotes[c]) problems.push(`${at}: no fit note for "${c}"`); });
    st.fit.best.forEach(c=>{ if(!BAND_CAPS[band].includes(c)) info.push(`${at}: fit.best lists "${c}", which only a player who disagrees on the band can pick (partial credit by design)`); });
    if(!has(AUTONOMY, st.autoBest)) problems.push(`${at}: autonomy ${st.autoBest}`);
    (st.autoOk||[]).forEach(x=>{ if(!has(AUTONOMY, x)) problems.push(`${at}: autoOk ${x}`); });
    (st.guardrails||[]).forEach(g=>{ if(!has(GUARDRAILS, g)) problems.push(`${at}: guardrail ${g}`); });
    if(!VERDICTS[fieldVerdict(st)]) problems.push(`${at}: no verdict`);
  });
}));
FIELD_REPORTS.forEach(r=>{
  r.guardrails.forEach(g=>{ if(!has(GUARDRAILS, g)) problems.push(`report ${r.id}: guardrail ${g}`); });
  r.shapes.forEach(s=>{ if(!has(SHAPES, s)) problems.push(`report ${r.id}: shape ${s}`); });
  r.caps.forEach(c=>{ if(!CAPS[c]) problems.push(`report ${r.id}: cap ${c}`); });
  r.verdicts.forEach(v=>{ if(!VERDICTS[v]) problems.push(`report ${r.id}: verdict ${v}`); });
});
const usedSlots = new Set(COMPLICATION_SLOTS.flat());
EVENT_POOL.concat(V5_EVENTS).forEach(e=>{ if(!usedSlots.has(e.slot)) problems.push(`event ${e.id}: slot "${e.slot}" is not in story.js COMPLICATION_SLOTS ${JSON.stringify(COMPLICATION_SLOTS)}`); });
out.content = {steps, problems, alternativesInOtherBands:info.length};

if(process.argv.includes('--json')){ console.log(JSON.stringify(out, null, 2)); process.exit(0); }
console.log('VERDICTS', JSON.stringify(out.verdicts, null, 1));
console.log('TOOLS', JSON.stringify(out.tools, null, 1));
console.log('GOLDEN', JSON.stringify(out.golden));
console.log('CONTENT', steps, 'steps,', problems.length, 'problem(s),', out.content.alternativesInOtherBands, 'informational notes'); problems.forEach(p=>console.log(' -', p));
if(problems.length) process.exit(1);
