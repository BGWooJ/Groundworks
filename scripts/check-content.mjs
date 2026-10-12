// Content check: validates every process and prints how the field's verdicts spread.
import {FUNCTIONS} from '../src/content/meridian.js';
import {getExpedition, validateExpeditions} from '../src/content/expeditions.js';
import {fieldVerdict, expertBand} from '../src/engine/engine.js';
const problems = validateExpeditions();
const verdicts = {}, bands = {};
let steps = 0, procs = 0;
FUNCTIONS.forEach(fn=>fn.processes.forEach(p=>{
  const e = getExpedition(p.id); if(!e) return; procs++;
  e.steps.forEach(st=>{ steps++; const v = fieldVerdict(st), b = expertBand(st);
    verdicts[v] = (verdicts[v]||0)+1; bands[b] = (bands[b]||0)+1;
    if(process.argv.includes('-v')) console.log(p.id.padEnd(14), st.name.padEnd(48), b.padEnd(7), v); });
}));
console.log(`${FUNCTIONS.length} departments, ${procs} processes, ${steps} steps`);
console.log('verdicts', verdicts); console.log('LLM fit', bands);
if(problems.length){ console.error(problems.join('\n')); process.exit(1); }
console.log('content check: no problems');
