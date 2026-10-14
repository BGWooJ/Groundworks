// v8: the Guide's own read of every Meridian step should not draw a challenge from the engine, and
// should hold together: a capability that usually fits the kind of work, autonomy that suits the stakes.
// Prints the verdict spread by division, so new content can keep a balanced mix.
import {FUNCTIONS} from '../src/content/meridian.js';
import {getExpedition} from '../src/content/expeditions.js';
import {challengesOf, expertBand, fieldVerdict, suggestCaps} from '../src/engine/engine.js';
const problems = [], spread = {};
FUNCTIONS.forEach(fn=>fn.processes.forEach(p=>{
  const e = getExpedition(p.id); if(!e) return;
  e.steps.forEach((st, i)=>{
    const a = {shape:st.expert.shape, input:st.expert.input, rep:st.expert.rep, stakes:st.expert.stakes, band:expertBand(st), cap:st.expertPick, auto:st.autoBest, where:'office', builder:'unsure', sens:'internal'};
    const ch = challengesOf(a, null).filter(c=>c.q!=='builder');
    if(ch.length) problems.push(`${p.id} step ${i+1} (${st.name}): ${ch.map(c=>c.q+': '+c.text.slice(0,70)).join(' / ')}`);
    const v = fieldVerdict(st); (spread[fn.id] = spread[fn.id] || {})[v] = (spread[fn.id][v] || 0) + 1;
  });
}));
if(process.argv.includes('-v')) Object.entries(spread).forEach(([fn, s])=>console.log(fn.padEnd(12), JSON.stringify(s)));
console.log(problems.length ? problems.join('\n') : 'Every Guide read holds together.');
if(problems.length && process.argv.includes('--strict')) process.exit(1);
