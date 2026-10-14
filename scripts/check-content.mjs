// Content check: validates every process, its place in a work area (v8), and prints how the Guide's verdicts spread.
import {FUNCTIONS} from '../src/content/meridian.js';
import {getExpedition, validateExpeditions} from '../src/content/expeditions.js';
import {fieldVerdict, expertBand} from '../src/engine/engine.js';
import {checkAreas, areasOf} from '../src/content/areas.js';
import {LANDMARKS} from '../src/content/world.js';
const problems = validateExpeditions().concat(checkAreas());
FUNCTIONS.forEach(f=>{ if(!LANDMARKS[f.id]) problems.push(`${f.id}: no place on the world map`); if(!areasOf(f.id).length) problems.push(`${f.id}: no work area with a process`); });
const verdicts = {}, bands = {};
let steps = 0, procs = 0;
FUNCTIONS.forEach(fn=>fn.processes.forEach(p=>{
  const e = getExpedition(p.id); if(!e) return; procs++;
  e.steps.forEach(st=>{ steps++; const v = fieldVerdict(st), b = expertBand(st);
    verdicts[v] = (verdicts[v]||0)+1; bands[b] = (bands[b]||0)+1;
    if(process.argv.includes('-v')) console.log(p.id.padEnd(14), st.name.padEnd(48), b.padEnd(7), v); });
}));
console.log(`${FUNCTIONS.length} divisions, ${FUNCTIONS.reduce((n,f)=>n+areasOf(f.id).length,0)} work areas, ${procs} processes, ${steps} steps`);
console.log('verdicts', verdicts); console.log('LLM fit', bands);
if(problems.length){ console.error(problems.join('\n')); process.exit(1); }
console.log('content check: no problems');
