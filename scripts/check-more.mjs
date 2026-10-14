// v8 phase 4: checks a file of new processes before it joins Meridian.
//   node scripts/check-more.mjs src/content/more/<file>.js
// Structure, allowed values, unique ids, the work area each process joins, house style in the prose,
// the Guide's verdict for every step, and whether the engine would question the Guide's own read.
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {expandStep} from '../src/content/expeditions.js';
import {SHAPES, INPUTS, REPS, STAKES, AUTONOMY, GUARDRAILS, CAPS, LEVELS, FUNCTIONS} from '../src/content/meridian.js';
import {fieldVerdict, challengesOf, expertBand} from '../src/engine/engine.js';
import {AREAS} from '../src/content/areas.js';

const file = process.argv[2];
if(!file){ console.error('usage: node scripts/check-more.mjs <file>'); process.exit(2); }
const mod = await import(pathToFileURL(path.resolve(file)).href);
const list = mod.MORE;
const errors = [], notes = [];
const has = (arr, id)=>arr.some(o=>o.id===id);
const words = s=>String(s||'').split(/\s+/).filter(Boolean);
const existing = new Set(); FUNCTIONS.forEach(f=>f.processes.forEach(p=>existing.add(p.id)));
const seen = new Set();
const PROSE = ['n','who','vol','sys','notes','pain','why','reality','metric','hyp','data'];
const AMERICAN = /\b(summariz|organiz|prioritiz|analyz|optimiz|categoriz|recogniz|standardiz|minimiz|maximiz|utiliz|color|center|behavior|labor|favor|catalog\b|program\b(?! of)|license\b|defense|fulfill\b)/i;
function style(at, text){
  if(typeof text!=='string') return;
  if(/[—–]/.test(text)) errors.push(`${at}: uses a dash (— or –); write two sentences or use a comma`);
  if(/\bleverag|\bseamless|\brobust\b|\bgame-?changer|\bunlock|\bempower/i.test(text)) errors.push(`${at}: marketing word: "${text.match(/\bleverag\w*|\bseamless|\brobust\b|\bgame-?changer|\bunlock\w*|\bempower\w*/i)[0]}"`);
  const am = text.match(AMERICAN); if(am) errors.push(`${at}: American spelling "${am[0]}"; use British spelling`);
  if(/'/.test(text)) errors.push(`${at}: straight apostrophe; use ’`);
}

if(!Array.isArray(list) || !list.length) errors.push('the file must export a non-empty array named MORE');
const spread = {};
(list||[]).forEach((item, k)=>{
  const at = `item ${k+1}${item && item.proc ? ' (' + item.proc.id + ')' : ''}`;
  if(!item || typeof item!=='object'){ errors.push(`${at}: not an object`); return; }
  const fn = FUNCTIONS.find(f=>f.id===item.fn);
  if(!fn){ errors.push(`${at}: unknown division "${item.fn}"`); return; }
  if(!(AREAS[item.fn]||[]).some(a=>a.id===item.area)) errors.push(`${at}: "${item.area}" is not a work area of ${item.fn} (${(AREAS[item.fn]||[]).map(a=>a.id).join(', ')})`);
  const p = item.proc || {};
  if(!/^[a-z][a-z0-9]{2,15}$/.test(p.id||'')) errors.push(`${at}: id must be 3 to 16 lowercase letters or digits`);
  if(existing.has(p.id) || seen.has(p.id)) errors.push(`${at}: id "${p.id}" is already used`); seen.add(p.id);
  ['name','d','why'].forEach(f=>{ if(!p[f]) errors.push(`${at}: proc.${f} is missing`); else style(`${at} proc.${f}`, p[f]); });
  if(!Number.isInteger(p.rating) || p.rating<1 || p.rating>5) errors.push(`${at}: proc.rating must be a whole number from 1 to 5`);
  if(!item.intro) errors.push(`${at}: intro is missing`); else style(`${at} intro`, item.intro);
  if(!Array.isArray(item.steps) || item.steps.length<3 || item.steps.length>5){ errors.push(`${at}: needs 3 to 5 steps`); return; }
  const vs = [];
  item.steps.forEach((c, i)=>{
    const sat = `${at} step ${i+1}`;
    PROSE.forEach(f=>{ if(!c[f]) errors.push(`${sat}: ${f} is missing`); else style(`${sat} ${f}`, c[f]); });
    const [shape, input, rep, stakes, extra] = words(c.p);
    if(extra!==undefined || !has(SHAPES, shape) || !has(INPUTS, input) || !has(REPS, rep) || !has(STAKES, stakes)) errors.push(`${sat}: p must be "shape input rep stakes" from the allowed values, got "${c.p}"`);
    words(c.alt).forEach(kv=>{ const [d, v] = kv.split(':'); const L = {shape:SHAPES, input:INPUTS, rep:REPS, stakes:STAKES}[d]; if(!L || !has(L, v)) errors.push(`${sat}: alt "${kv}" is not dimension:value`); });
    if(!words(c.best).length) errors.push(`${sat}: best needs at least one capability`);
    [...words(c.best), ...words(c.ok)].forEach(cap=>{ if(!CAPS[cap]) errors.push(`${sat}: unknown capability "${cap}"`); });
    if(!has(AUTONOMY, c.auto)) errors.push(`${sat}: unknown autonomy "${c.auto}"`);
    words(c.autoOk).forEach(x=>{ if(!has(AUTONOMY, x)) errors.push(`${sat}: unknown autonomy "${x}" in autoOk`); });
    words(c.g).forEach(x=>{ if(!has(GUARDRAILS, x)) errors.push(`${sat}: unknown guardrail "${x}"`); });
    const fv = words(c.fv); if(fv.length!==2 || !fv.every(x=>has(LEVELS, x))) errors.push(`${sat}: fv must be "feasibility value", each low, mid or high`);
    if(!Array.isArray(c.disc) || c.disc.length!==2 || !c.disc.every(d=>Array.isArray(d) && d.length===3 && d.every(Boolean))) errors.push(`${sat}: disc needs exactly two notes of [title, text, effect]`);
    else c.disc.forEach((d,j)=>d.forEach(t=>style(`${sat} note ${j+1}`, t)));
    if(errors.some(e=>e.startsWith(sat))) return;
    try{
      const st = expandStep(p.id, i, c), v = fieldVerdict(st); vs.push(v);
      (spread[item.fn] = spread[item.fn] || {})[v] = (spread[item.fn][v] || 0) + 1;
      const a = {shape, input, rep, stakes, band:expertBand(st), cap:st.expertPick, auto:st.autoBest, where:'office', builder:'unsure', sens:'internal'};
      challengesOf(a, null).filter(x=>x.q!=='builder').forEach(x=>notes.push(`${sat} (${c.n}): the engine would question the Guide's read: ${x.text}`));
    }catch(e){ errors.push(`${sat}: could not be expanded (${e.message})`); }
  });
  console.log(`${(p.id||'?').padEnd(14)} ${String(p.rating).padEnd(2)} ${(p.name||'').padEnd(48)} ${vs.join(', ')}`);
});
console.log('\nverdicts by division:'); Object.entries(spread).forEach(([fn, s])=>console.log(`  ${fn.padEnd(12)} ${JSON.stringify(s)}`));
if(notes.length){ console.log(`\n${notes.length} read(s) the engine would question (fix unless the step is a deliberate teaching case):`); notes.forEach(n=>console.log('  ' + n)); }
if(errors.length){ console.log(`\n${errors.length} problem(s):`); errors.forEach(e=>console.log('  ' + e)); process.exit(1); }
console.log('\nno problems');
