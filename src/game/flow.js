/* =====================================================================
   FLOW: the rules of a walk, as pure functions of the game state S.
   Ported from v4 app.js without changing what they decide.
   ===================================================================== */
import {CAPS, CAP_FAMILIES, SHAPES, INPUTS, REPS, STAKES, AUTONOMY, GUARDRAILS, COMPANY, FUNCTIONS} from '../content/meridian.js';
import {getExpedition} from '../content/expeditions.js';
import {BANDS, BAND_CAPS, WHERE, BUILDERS, SENSITIVITY, expertBand, bandName, numbersOf, valueOf, feasOf, verdictOf,
  fieldVerdict, suggestGuardrails, VERDICTS, round} from '../engine/engine.js';
import {scoreTools, processHeading, destOf, whyTool} from '../engine/tools.js';
import {CHARTER} from '../content/campaign.js';

/* ---------- small helpers ---------- */
export const LV = {low:0, mid:1, high:2};
export function levelName(id){ return ({low:'Low', mid:'Medium', high:'High'})[id] || ''; }
export function plural(n, one, many){ return n===1 ? one : (many || one+'s'); }
export function optName(list, id){ const o = (list||[]).find(x=>x.id===id); return o ? o.name : ''; }
export function capName(id){ return CAPS[id] ? CAPS[id].name : ''; }
export function fill(s, v){ return String(s||'').replace(/\{(\w+)\}/g, (m,k)=> v && v[k]!=null ? v[k] : m); }
export function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }
export function whoName(who){ let w = String(who||'').trim().replace(/^the\s+/i,'').replace(/^\d+\s+/,''); return w.charAt(0).toLowerCase()+w.slice(1); }
const COLLECTIVE = ['team','desk','finance','services','committee','office','unit'];
export function teamOf(who){
  const w = whoName(who), last = w.split(' ').pop();
  if(/ and /.test(w)) return 'the ' + w;
  if(COLLECTIVE.includes(last)) return 'the ' + w + (last==='team' ? '' : ' team');
  if(/[^s]s$/.test(last)) return 'the ' + w;
  return 'the ' + w + '’s team';
}
export function splitVolume(v){
  const m = String(v||'').match(/^((?:about|around|~)\s+)?(\d[\d,.]*%?)\s+(.*)$/i);
  return m ? {pre:(m[1]||'').trim(), big:m[2], rest:m[3]} : {pre:'', big:'', rest:v||''};
}
export function findProcessMeta(id){ for(const fn of FUNCTIONS){ const p = fn.processes.find(x=>x.id===id); if(p) return {fn, proc:p}; } return null; }
export function heatOf(fn){ return fn.signals.reduce((a,s)=> a + (s.s==='strong'?2:(s.s==='medium'?1:0)), 0); }
export function familyOfCap(cap){ const f = CAP_FAMILIES.find(x=>x.caps.includes(cap)); return f ? f.id : null; }
export function slug(s){ return String(s||'map').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'map'; }
export {round};

/* ---------- the ten questions ---------- */
export const QUESTIONS = [
  {k:'shape',  label:'Kind of work',       q:'What is the person actually doing?',            opts:()=>SHAPES,
   field:st=>st.expert.shape, alts:st=>st.expert.shapeAlt||[]},
  {k:'input',  label:'Inputs',             q:'What does the work start from?',                opts:()=>INPUTS,
   field:st=>st.expert.input, alts:st=>st.expert.inputAlt||[]},
  {k:'rep',    label:'Volume',             q:'How often, and how similar each time?',         opts:()=>REPS,
   field:st=>st.expert.rep, alts:st=>st.expert.repAlt||[]},
  {k:'stakes', label:'Stakes',             q:'How much judgment, and what does an error cost?', opts:()=>STAKES,
   field:st=>st.expert.stakes, alts:st=>st.expert.stakesAlt||[]},
  {k:'band',   label:'LLM fit',            q:'Is this an LLM’s kind of work?',            opts:()=>BANDS,
   field:st=>expertBand(st), alts:st=>({core:['assist'], assist:['core']})[expertBand(st)] || []},
  {k:'cap',    label:'Capability',         q:'Which capability, exactly?',
   opts:a=>BAND_CAPS[a.band||'core'].map(id=>({id, name:CAPS[id].name, d:CAPS[id].one})),
   field:st=>st.expertPick, alts:st=>[...st.fit.best, ...st.fit.ok]},
  {k:'auto',   label:'Autonomy',           q:'How much should it act on its own?',            opts:()=>AUTONOMY,
   field:st=>st.autoBest, alts:st=>st.autoOk||[]},
  {k:'where',  label:'Where it happens',   q:'Where does the work happen today?',             opts:()=>WHERE},
  {k:'builder',label:'Who would build it', q:'Who would build it?',                           opts:()=>BUILDERS, carry:true},
  {k:'sens',   label:'Data',               q:'How sensitive is the data?',                    opts:()=>SENSITIVITY, carry:true},
];
export const SCORED = QUESTIONS.filter(q=>q.field);
export function questionOf(k){ return QUESTIONS.find(q=>q.k===k); }

export function answered(a){ return !!a && QUESTIONS.every(q=>a[q.k]); }
export function stepDone(S, st){ const a = S.ans[st.id]; if(!a) return false; return S.mode==='guided' ? !!a.revealed : answered(a); }
export function nextUnanswered(a, from){
  for(let i=from+1;i<QUESTIONS.length;i++) if(!a[QUESTIONS[i].k]) return i;
  for(let i=0;i<QUESTIONS.length;i++) if(!a[QUESTIONS[i].k]) return i;
  return -1;
}
export function markOf(S, q, st, val){
  if(!q.field || S.mode!=='guided') return null;
  const f = q.field(st);
  if(val===f) return 'match';
  if(q.k==='cap') return st.fit.best.includes(val) ? 'match' : (st.fit.ok.includes(val) ? 'near' : 'miss');
  return (q.alts(st)||[]).includes(val) ? 'near' : 'miss';
}
export function scoreRead(S, st){
  const a = S.ans[st.id] || {};
  const marks = SCORED.map(q=>markOf(S, q, st, a[q.k]));
  const score = marks.reduce((s,m)=>s + (m==='match'?1:(m==='near'?0.5:0)), 0), ratio = score/SCORED.length;
  const tier = ratio>=.85?'great':(ratio>=.6?'good':(ratio>=.35?'mixed':'off'));
  return {marks, score, ratio, tier};
}

/* Answers as the engine sees them, with the what-if switches applied in your own maps. */
export function effective(S, st, whatif){
  const wi = whatif || S.whatif;
  const a = Object.assign({}, S.ans[st.id] || {});
  a.nums = a.nums ? Object.assign({}, a.nums) : null;
  if(S.mode==='own'){
    if(wi.double){ if(a.nums && a.nums.count) a.nums.count = String(parseFloat(a.nums.count)*2); if(a.rep==='low') a.rep = 'mid'; else if(a.rep==='mid') a.rep = 'high'; }
    if(wi.digital){ if(a.input==='media' || a.input==='tacit') a.input = 'text'; if(a.where==='paper') a.where = 'system'; }
    if(wi.devs){ if(a.builder==='unsure' || a.builder==='team') a.builder = 'dev'; }
  }
  return a;
}
export function stepEval(S, st, whatif){
  const a = effective(S, st, whatif), nums = numbersOf(a.nums);
  if(S.mode==='guided') return {a, nums, value:st.expertValue, feas:st.expertFeas, verdict:fieldVerdict(st), tool:scoreTools(a)};
  const value = valueOf(a, nums), feas = feasOf(a);
  return {a, nums, value, feas, verdict:verdictOf(a, value, feas), tool:scoreTools(a)};
}
export function readSteps(S){ return S.steps.filter(st=>stepDone(S, st)); }
export function nextOpenIndex(S){ const i = S.steps.findIndex(st=>!stepDone(S, st)); return i<0 ? null : i; }
export function headingFor(S, steps){
  const res = steps.map(st=>({index:S.steps.indexOf(st), tool:stepDone(S, st) ? stepEval(S, st).tool : null})).filter(x=>x.tool);
  return processHeading(res);
}
export function startedReading(S, st){
  const a = S.ans[st.id] || {}, c = a._carried || {};
  return QUESTIONS.some(q=>a[q.k] && !c[q.k]) || !!(a.nums && (a.nums.count || a.nums.minutes));
}

/* How the heading moved when this step was read. */
export function pointerFor(S, st){
  const t = stepEval(S, st).tool; if(!t) return null;
  const idx = S.steps.indexOf(st), read = readSteps(S);
  const before = headingFor(S, read.filter(x=>x!==st && S.steps.indexOf(x)<idx));
  const after = headingFor(S, read.filter(x=>S.steps.indexOf(x)<=idx));
  const b0 = before.leaders[0], a0 = after.leaders[0];
  let shift;
  if(!b0) shift = `The first reading points to ${destOf(a0).name}.`;
  else if(a0!==b0) shift = `The heading shifts: ${destOf(a0).name} now leads.`;
  else if(after.leaders.length>before.leaders.length) shift = `The heading shifts: ${destOf(after.leaders[1]).name} draws level with ${destOf(a0).name}.`;
  else shift = `The heading holds: ${destOf(a0).name}.`;
  return {tool:t, winner:destOf(t.winner).name, why:whyTool(t), runner:t.runnerUp ? destOf(t.runnerUp).name : null, shift};
}

/* ---------- the finished map ---------- */
export function startStep(S){
  const scored = S.steps.filter(st=>stepDone(S, st)).map(st=>{ const e = stepEval(S, st);
    return {st, e, s:LV[e.value]*2 + LV[e.feas] - (['capture','small','park','fix'].includes(e.verdict)?10:0)}; });
  scored.sort((x,y)=>y.s-x.s);
  return scored[0];
}
export function guardrailsFor(e){
  const g = suggestGuardrails(e.a, e.a.cap); if(e.a.sens==='personal' && !g.includes('privacy')) g.unshift('privacy');
  return g;
}
export function guardrailName(id){ return (GUARDRAILS.find(x=>x.id===id)||{}).name || ''; }
export function bandCounts(S){
  const counts = {core:0, assist:0, other:0, none:0};
  readSteps(S).forEach(st=>{ counts[stepEval(S, st).a.band]++; });
  return counts;
}
export function finishedTitle(S){
  const read = readSteps(S), c = bandCounts(S);
  const h1 = c.core===0 ? (c.assist ? `${c.assist} ${plural(c.assist,'step')} where an LLM supports a person` : 'No step here needs an LLM, and that is a finding')
    : `${c.core===1?'One step':`${c.core} steps`} where an LLM earns its keep`;
  const parts = [];
  if(c.core) parts.push(`${c.core} ${plural(c.core,'is','are')} an LLM’s kind of work`);
  if(c.assist) parts.push(`${c.assist} ${plural(c.assist,'needs','need')} an LLM to support a person’s judgment`);
  if(c.other) parts.push(`${c.other} ${plural(c.other,'calls','call')} for a different kind of AI`);
  if(c.none) parts.push(`${c.none} ${plural(c.none,'is','are')} better served by rules, integration or a process fix`);
  const lede = `Of ${read.length} steps, ${parts.length>1 ? parts.slice(0,-1).join(', ') + ' and ' + parts[parts.length-1] : parts[0]}.`;
  return {h1, lede, counts:c};
}
export function whatifChanges(S){
  if(!Object.values(S.whatif).some(Boolean)) return null;
  const off = {double:false, digital:false, devs:false};
  const items = [];
  S.steps.forEach((st,i)=>{
    if(!stepDone(S, st)) return;
    const b = stepEval(S, st, off), n = stepEval(S, st, S.whatif), d = [];
    const bh = b.nums ? b.nums.total : null, nh = n.nums ? n.nums.total : null;
    if(bh!=null && Math.round(bh)!==Math.round(nh)) d.push(`about ${round(bh)} → ${round(nh)} hours a month`);
    if(b.value!==n.value) d.push(`value ${levelName(b.value).toLowerCase()} → ${levelName(n.value).toLowerCase()}`);
    if(b.feas!==n.feas) d.push(`feasibility ${levelName(b.feas).toLowerCase()} → ${levelName(n.feas).toLowerCase()}`);
    if(b.verdict!==n.verdict) d.push(`verdict: ${VERDICTS[n.verdict].name.toLowerCase()}`);
    const bt = b.tool && b.tool.winner, nt = n.tool && n.tool.winner;
    if(bt!==nt) d.push(`points to ${destOf(nt).name} instead of ${destOf(bt).name}`);
    if(d.length) items.push({n:i+1, name:st.name, text:d.join('; ')});
  });
  return items;
}

/* ---------- exports: same shape as v4, plus the charter ---------- */
export function charterOut(c){
  if(!c) return null;
  const has = c.challenge || c.success || c.tracking || (c.audience && c.audience.length);
  if(!has) return null;
  const opt = (k, id)=> optName(CHARTER.find(x=>x.k===k).opts, id);
  return {challenge:c.challenge||'', success:c.success||'', tracking:opt('tracking', c.tracking)||'',
    audience:(c.audience||[]).map(id=>opt('audience', id))};
}
export function buildExport(S){
  const guided = S.mode==='guided', exp = guided ? getExpedition(S.procId) : null;
  const steps = S.steps.map((st,i)=>{
    if(!stepDone(S, st)) return {n:i+1, name:st.name, read:false};
    const e = stepEval(S, st), a = e.a, g = guardrailsFor(e);
    const o = {n:i+1, name:st.name, read:true,
      kindOfWork:optName(SHAPES,a.shape), inputs:optName(INPUTS,a.input), volume:optName(REPS,a.rep), stakes:optName(STAKES,a.stakes),
      llmFit:bandName(a.band), capability:capName(a.cap), autonomy:optName(AUTONOMY,a.auto),
      whereItHappens:optName(WHERE,a.where), whoWouldBuild:optName(BUILDERS,a.builder), dataSensitivity:optName(SENSITIVITY,a.sens),
      value:levelName(e.value), feasibility:levelName(e.feas), verdict:VERDICTS[e.verdict].name,
      tool:e.tool?destOf(e.tool.winner).name:'', toolReason:whyTool(e.tool), guardrails:g.map(guardrailName)};
    if(e.nums) o.numbers = {perMonth:Math.round(e.nums.perMonth), hoursPerMonth:round(e.nums.hours), reworkHoursPerMonth:round(e.nums.rework)};
    if(S.includeDesc) o.description = guided ? st.notes : (st.notes||'');
    return o;
  });
  const h = headingFor(S, readSteps(S));
  const out = {source:'Groundwork', version:5, exported:new Date().toISOString(),
    organisation: guided ? COMPANY.name : (S.own.org||''), process: guided ? exp.name : (S.own.process||''),
    example: guided, steps,
    heading:{destinations:h.leaders.map(id=>({tool:destOf(id).name, steps:h.by[id]}))}};
  const ch = !guided && S.own ? charterOut(S.own.charter) : null;
  if(ch) out.charter = ch;
  return out;
}
export function lppPrompt(d){
  const rows = d.steps.filter(s=>s.read).map(s=>`${s.n}. ${s.name} | ${s.kindOfWork.toLowerCase()} | ${s.numbers?`${s.numbers.hoursPerMonth} hours a month`:s.volume.toLowerCase()+' volume'} | ${s.llmFit.toLowerCase()} | ${s.tool} | ${s.verdict.toLowerCase()}${s.description?` | ${s.description}`:''}`).join('\n');
  const ch = d.charter ? `\nThe change we want: ${d.charter.challenge || 'not stated'}\nSuccess looks like: ${d.charter.success || 'not stated'}\nTracking: ${d.charter.tracking || 'not stated'}. Audience: ${(d.charter.audience||[]).join(', ') || 'not stated'}.\n` : '';
  return `Review this AI use-case map for one process. Challenge each verdict, flag risks we missed, and say which step to pilot first and why.${d.charter?' Check whether the plan supports the change we want and can be measured as described.':''}\n\nProcess: ${d.process}${d.organisation?` (${d.organisation})`:''}, ${d.steps.length} steps\n${ch}${rows}\n\nColumns: step | kind of work | volume | LLM fit | approved tool it points to | verdict.`;
}
export function csvCell(v){ v = v==null ? '' : String(v); return /[",\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; }
export function csvOf(d){
  const cols = ['n','name','kindOfWork','inputs','volume','stakes','llmFit','capability','autonomy','whereItHappens','whoWouldBuild','dataSensitivity','value','feasibility','verdict','tool','toolReason','perMonth','hoursPerMonth','reworkHoursPerMonth','guardrails','description'];
  const rows = d.steps.map(s=>cols.map(c=> c in (s.numbers||{}) ? s.numbers[c] : (c==='guardrails' ? (s.guardrails||[]).join('; ') : s[c])).map(csvCell).join(','));
  return [cols.join(',')].concat(rows).join('\n');
}
