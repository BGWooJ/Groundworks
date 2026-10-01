/* ---------- Scoring helpers (guided mode) ---------- */
const LEVEL_IDX = {low:0, mid:1, high:2};

function scoreProfile(step, p){
  // exact match 2, acceptable alternative 1, otherwise 0. Max 8 per step.
  const e = step.expert, out = {total:0, dims:{}};
  DIMS.forEach(d=>{
    const val = p[d.id], best = e[d.id], alts = e[d.id+'Alt'] || [];
    let pts = 0;
    if(val===best) pts = 2; else if(alts.includes(val)) pts = 1;
    out.dims[d.id] = {pts, val, best, alts};
    out.total += pts;
  });
  return out;
}

function scoreMatch(step, cap, auto){
  let tier = 'poor', pts = 0;
  if(step.fit.best.includes(cap)){ tier='best'; pts=3; }
  else if(step.fit.ok.includes(cap)){ tier='ok'; pts=1; }
  let aPts = 0;
  if(auto===step.autoBest) aPts=2; else if(step.autoOk.includes(auto)) aPts=1;
  return {tier, pts, aPts, total: pts + aPts};
}

function scoreReality(step, feas, value){
  const d1 = Math.abs(LEVEL_IDX[feas]-LEVEL_IDX[step.expertFeas]);
  const d2 = Math.abs(LEVEL_IDX[value]-LEVEL_IDX[step.expertValue]);
  const f = d1===0?2:(d1===1?1:0), v = d2===0?2:(d2===1?1:0);
  return {f, v, total:f+v};
}

function quadrant(feas, value){
  const F = LEVEL_IDX[feas], V = LEVEL_IDX[value];
  if(V===2) return F===2 ? 'Quick win' : 'Strategic bet';
  if(V===1) return F===2 ? 'Quick win' : (F===1 ? 'Build toward' : 'Park');
  return F===2 ? 'Fill-in' : 'Avoid';
}

/* ---------- Suggestion engine (apply mode) ---------- */
function suggestCaps(p){
  const out=[]; const cautions=[];
  const add=(id,tier,why)=>{ if(!out.find(o=>o.id===id)) out.push({id,tier,why}); };
  const {shape,input,rep,stakes}=p;
  switch(shape){
    case 'extract':
      if(input==='media'){ add('vision','best','The inputs are images or video, so reading them is a vision problem first.'); add('speech','ok','If the inputs are recordings rather than pictures, transcription comes first.'); }
      if(input==='structured') add('rules','best','If the fields already sit in structured data, no AI is needed to read them. A rule or an integration will do.');
      add('extract', input==='media'?'ok':'best', 'Pulling specific fields out of documents or messages is exactly what extraction does.');
      add('agent','ok','If the extracted fields then need entering into another system, an agent can carry the whole task.');
      break;
    case 'route':
      add('classify','best','Sorting items into categories or queues is classification.');
      if(input==='structured') add('rules','best','With structured inputs and stable criteria, routing rules are cheaper and fully predictable.');
      else add('rules','ok','Keyword rules catch the obvious cases; classification handles the rest.');
      add('agent','ok','If routing also means updating systems and notifying people, an agent can do the routing plus the follow-through.');
      break;
    case 'lookup':
      add('retrieve','best','Finding the right information and answering from it is retrieval.');
      add('converse','best','If the people asking could self-serve, a conversational front door over the same data removes the queue.');
      add('fix','ok','Ask first whether a portal, dashboard, notification or FAQ would remove the question altogether.');
      add('agent','ok','If the answer needs data pulled from several systems and a reply sent, an agent can do the legwork.');
      break;
    case 'draft':
      add('draft','best','Producing a first version of text is generation.');
      if(input==='structured') add('rules','ok','If the document is a template filled from fields, mail-merge style automation may be enough.');
      add('retrieve','ok','Ground the draft in retrieved facts (prices, policy, history) so it is accurate as well as fluent.');
      break;
    case 'summarize':
      if(input==='media') add('speech','best','Recordings need transcription before they can be summarized.');
      add('summarize','best','Condensing long material into what matters is summarization.');
      add('extract','ok','If the summary is really a fixed set of facts (dates, amounts, decisions), extraction gives you a structured record instead.');
      break;
    case 'predict':
      add('predict','best','Estimating a number or likelihood from history is forecasting or prediction.');
      add('anomaly','ok','If the real need is to notice when a pattern breaks, anomaly detection may be enough.');
      if(input!=='structured') cautions.push('Prediction needs structured history. If the inputs are text or not captured, data capture comes first.');
      break;
    case 'check':
      add('anomaly','best','Spotting items that do not look right is anomaly and error detection.');
      add('rules','best','If the checks can be written down (limits, required fields, matches), rules do this perfectly and explainably.');
      if(input==='media') add('vision','best','Visual inspection is a computer-vision task.');
      if(input==='text') add('extract','ok','Checking documents usually means extracting the fields first, then comparing.');
      break;
    case 'suggest':
      add('recommend','best','Ranking options for a person is recommendation and decision support.');
      add('retrieve','ok','If the suggestion is mostly "find the relevant precedent or policy", retrieval does the heavy lifting.');
      if(input==='structured' && stakes==='low') add('rules','ok','Simple lookup tables (approved substitutes, standard next steps) may cover most cases.');
      break;
    case 'allocate':
      add('optimize','best','Choosing the best plan under many constraints is optimization, a mature technique that predates generative AI.');
      add('predict','ok','Good allocation depends on good forecasts; the two often go together.');
      add('recommend','ok','If a full optimizer is too much, ranking options for the planner is a lighter start.');
      break;
    case 'decide':
      add('recommend','best','Judgment calls stay with people. AI earns its place by assembling the evidence and suggesting an answer.');
      add('summarize','ok','Often the slow part of deciding is reading everything; a case summary speeds the person up.');
      add('retrieve','ok','Surface the policy, precedent and history the decision depends on.');
      if(stakes==='low' && input==='structured') add('rules','ok','Low-stakes decisions with clear criteria can be written as rules.');
      if(stakes==='high') cautions.push('High-stakes judgment should not be automated. Aim for assist mode, keep a person accountable, and log overrides.');
      break;
    case 'coordinate':
      add('agent','best','Multi-step follow-up across systems and people is what agentic automation is for.');
      add('rules','best','If every step is deterministic, a workflow tool does it without AI.');
      add('fix','ok','Chasing and re-keying often exist because of a broken handoff. Check whether the step should exist at all.');
      break;
    case 'physical':
      add('vision','best','Software AI helps physical work mainly by seeing: inspection, counting, verification.');
      add('optimize','ok','Planning the physical work (routes, slotting, schedules) is optimization.');
      cautions.push('Automating the physical handling itself is a robotics or equipment investment, a different decision from a software tool.');
      break;
  }
  if(input==='tacit') cautions.push('This work is not captured anywhere. Before any tool, decide where the inputs and outcomes will be recorded. That is step zero.');
  if(rep==='low') cautions.push('Low volume rarely pays back a dedicated tool. A general-purpose assistant or a checklist may be the right size.');
  if(stakes==='high' && shape!=='decide') cautions.push('High stakes: keep a person in the loop and start in assist or review mode.');
  return {caps:out, cautions};
}

function suggestAutonomy(p){
  if(p.stakes==='high') return 'assist';
  if(p.stakes==='mid') return 'review';
  return (p.input==='structured' || p.shape==='route' || p.shape==='coordinate') ? 'auto' : 'review';
}

function suggestGuardrails(p, cap){
  const g = new Set();
  if(p.stakes!=='low') g.add('logging');
  if(['extract','classify','speech','vision','predict'].includes(cap)) g.add('threshold');
  if(p.stakes==='high') { g.add('escalation'); g.add('logging'); }
  g.add('sampling');
  if(['converse','draft','agent'].includes(cap)) g.add('escalation');
  if(['agent','optimize','rules'].includes(cap)) g.add('rollback');
  if(p.shape==='decide' && p.stakes==='high') g.add('bias');
  return Array.from(g).slice(0,4);
}

// feasibility from four 1..3 ratings (data readiness high = good; risk/change/integration high = bad)
function feasibilityLevel(r){
  const score = (r.data) + (4-r.risk) + (4-r.change) + (4-r.integ); // 4..12
  if(score>=10) return 'high';
  if(score>=7) return 'mid';
  return 'low';
}

/* =====================================================================
   v4 ENGINE: LLM fit, numbers, verdicts and challenges.
   Pure functions, used by both the Meridian walk and your own process.
   ===================================================================== */

/* Is this an LLM's kind of work? Four honest answers. */
const BANDS = [
  {id:'core',   name:'Yes, at the core',          chip:'Strong LLM fit',       d:'Reading, writing or answering in language is the work itself.'},
  {id:'assist', name:'Yes, assisting a person',   chip:'LLM assists a person', d:'An LLM prepares the ground; a person judges and owns the outcome.'},
  {id:'other',  name:'No, a different kind of AI', chip:'Different kind of AI', d:'Forecasting, optimisation, anomaly detection or vision models.'},
  {id:'none',   name:'No, something simpler fits', chip:'Not an LLM job',      d:'Rules, integration, or a fix to the process.'},
];
const BAND_CAPS = {
  core:   ['extract','summarize','retrieve','classify','draft','converse','agent'],
  assist: ['recommend','summarize','retrieve','draft','extract','classify'],
  other:  ['predict','optimize','anomaly','vision','speech'],
  none:   ['rules','fix'],
};
function bandOfCap(cap, auto){
  if(cap==='rules' || cap==='fix') return 'none';
  if(BAND_CAPS.other.includes(cap)) return 'other';
  if(cap==='recommend' || auto==='assist') return 'assist';
  return 'core';
}
function expertBand(step){ return bandOfCap(step.expertPick, step.autoBest); }
function bandName(id){ const b = BANDS.find(x=>x.id===id); return b ? b.chip : id; }

/* Context questions that separate the approved tools. */
const WHERE = [
  {id:'office', name:'Email, Office and Teams', d:'The work lives in Outlook, Word, Excel, Teams or SharePoint.'},
  {id:'system', name:'A business system',       d:'A case system, portal, database or other application.'},
  {id:'paper',  name:'Paper, scans or files',   d:'Printed forms, scanned documents, shared drives.'},
  {id:'mixed',  name:'Several of these',        d:'It moves between tools and formats.'},
];
const BUILDERS = [
  {id:'team',    name:'The team itself',        d:'Staff would use a tool directly, with nothing to build.'},
  {id:'lowcode', name:'A low-code power user',  d:'Someone comfortable building flows and simple agents.'},
  {id:'dev',     name:'Developers',             d:'People who write code, scripts and integrations.'},
  {id:'unsure',  name:'Not sure yet',           d:'Nobody has been asked.'},
];
const SENSITIVITY = [
  {id:'public',   name:'Public or general',        d:'Nothing here would matter if it were published.'},
  {id:'internal', name:'Internal',                 d:'Internal working material, not about individuals.'},
  {id:'personal', name:'Personal or confidential', d:'About individuals, or market-sensitive or restricted.'},
];

/* ---------- numbers: plain inputs, plain answers ---------- */
const PER_MONTH = {day:21, week:4.33, month:1, year:1/12};
const MINUTE_CHIPS = [{v:2,l:'2 min'},{v:5,l:'5 min'},{v:15,l:'15 min'},{v:30,l:'30 min'},{v:60,l:'1 hour'},{v:240,l:'Half a day'}];
const REWORK = [{id:'rare',l:'Rarely',f:0.02},{id:'tenth',l:'About 1 in 10',f:0.1},{id:'quarter',l:'About 1 in 4',f:0.25},{id:'half',l:'Often',f:0.5}];
const FTE_HOURS = 150; // working hours in a month, roughly

function numbersOf(n){
  if(!n) return null;
  const count = parseFloat(n.count), mins = parseFloat(n.minutes);
  if(!(count>0) || !(mins>0)) return null;
  const perMonth = count * (PER_MONTH[n.per] || 1);
  const hours = perMonth * mins / 60;
  const rw = REWORK.find(r=>r.id===n.rework);
  const rework = rw ? hours * rw.f : 0;
  const total = hours + rework;
  const people = parseFloat(n.people);
  return {perMonth, hours, rework, total, fte: total/FTE_HOURS, share: people>0 ? total/(people*FTE_HOURS) : null};
}
function round(n){ return n>=100 ? Math.round(n/10)*10 : (n>=10 ? Math.round(n) : Math.round(n*10)/10); }
function numbersSentence(r){
  if(!r) return '';
  const fte = r.fte>=0.95 ? `roughly ${round(r.fte)} ${round(r.fte)===1?'person\u2019s':'people\u2019s'} full time` : `about ${Math.max(1,Math.round(r.fte*100))}% of one person\u2019s time`;
  let s = `About ${round(r.hours)} hours a month, ${fte}.`;
  if(r.rework>=1) s += ` Another ${round(r.rework)} hours go on redoing work.`;
  if(r.share!=null) s += ` That is ${Math.min(100,Math.round(r.share*100))}% of the team\u2019s time.`;
  return s;
}

/* ---------- value and feasibility ---------- */
function valueOf(a, nums){
  let v;
  if(nums) v = nums.total>=120 ? 2 : (nums.total>=25 ? 1 : 0);
  else v = ({high:2, mid:1, low:0})[a.rep] ?? 1;
  if(nums && a.rework && (a.rework==='quarter'||a.rework==='half') && v<2) v += 1;
  return ['low','mid','high'][v];
}
function feasOf(a){
  let f = ({structured:3, text:2, media:1, tacit:0})[a.input] ?? 1;
  f += ({low:2, mid:1, high:0})[a.stakes] ?? 1;
  f += ({team:2, lowcode:2, dev:1, unsure:0})[a.builder] ?? 1;
  if(a.band==='none') f += 1;
  return f>=6 ? 'high' : (f>=4 ? 'mid' : 'low');
}

/* ---------- verdicts: plain, strong advice ---------- */
const VERDICTS = {
  pilot:   {name:'Pilot now', tone:'go',
            advice:'The work suits the tool, the data is there and the stakes are manageable. Start small, with a baseline measured before you switch anything on.',
            first:'Measure today\u2019s baseline for two weeks, then run the pilot on a slice of the volume with a person checking a sample.',
            who:'The team lead, one or two people who do the work, and the tool owner.'},
  prepare: {name:'Pilot after preparing the data', tone:'go',
            advice:'Worth doing, but the inputs are not ready for a tool yet. Fix how the material arrives first, or the pilot will measure the mess, not the tool.',
            first:'Collect fifty real examples and sort them: what is legible, complete and consistent, and what is not.',
            who:'Whoever owns the intake: the portal, the mailbox or the forms.'},
  assist:  {name:'Assist only: a person decides', tone:'care',
            advice:'The judgment here must stay with an accountable person. Use the tool to assemble evidence and draft, never to decide, and log every case where the person overrides it.',
            first:'Write down how a good decision is made today, then test whether the tool\u2019s preparation saves time on ten real cases.',
            who:'The accountable decision maker, and compliance or legal early.'},
  engineering: {name:'Engineering, not AI', tone:'build',
            advice:'This step follows fixed rules or moves data between systems. Build it with rules and integration: cheaper, predictable and fully explainable. Adding an LLM would add risk and cost for nothing.',
            first:'List every rule a person applies today, and every system the data passes through.',
            who:'Developers or a low-code builder, plus the system owners.'},
  fix:     {name:'Fix the process first', tone:'build',
            advice:'The step exists because of a broken hand-off or a missing source of truth. Remove the cause before buying anything; the best tool for a pointless step is no tool.',
            first:'Ask why the step exists at all, five times, with the people who do it.',
            who:'The process owner and whoever owns the upstream step.'},
  capture: {name:'Capture the data first', tone:'stop',
            advice:'The key information is not written down anywhere. No tool can read it. Decide where the inputs and outcomes will be recorded; that is step zero.',
            first:'Agree a simple template for recording the inputs and the outcome, and use it for a month.',
            who:'The people who hold the knowledge today.'},
  small:   {name:'Not worth a tool at this volume', tone:'stop',
            advice:'It happens too rarely to pay back a dedicated tool. A checklist, a template or a general assistant is the right size.',
            first:'Write a one-page checklist for it, and revisit if the volume grows.',
            who:'The person who does it most often.'},
  park:    {name:'Park it: valuable but blocked', tone:'care',
            advice:'The prize is real, but the ground is not ready: the inputs, the stakes or the build capacity are against it. Note what would unblock it and come back.',
            first:'Name the single blocker and who could remove it.',
            who:'The sponsor, to decide whether the blocker is worth removing.'},
};
function verdictOf(a, value, feas){
  if(a.cap==='fix') return 'fix';
  if(a.input==='tacit') return 'capture';
  if(value==='low' && a.rep==='low') return 'small';
  if(a.band==='none' || a.cap==='rules') return 'engineering';
  if(a.stakes==='high' || a.band==='assist' || a.auto==='assist') return 'assist';
  if(feas==='low' && value!=='low') return 'park';
  if(feas==='mid' || a.input==='media') return 'prepare';
  return 'pilot';
}
/* The field's verdict for a Meridian step, from the expert read. */
function fieldVerdict(step){
  const a = {shape:step.expert.shape, input:step.expert.input, rep:step.expert.rep, stakes:step.expert.stakes,
             band:expertBand(step), cap:step.expertPick, auto:step.autoBest};
  return verdictOf(a, step.expertValue, step.expertFeas);
}

/* ---------- challenge cards: the tool pushes back on weak reads ---------- */
function challengesOf(a, nums){
  const out = [];
  const push = (q, text)=>out.push({q, text});
  if(a.sens==='personal' && a.stakes==='low') push('stakes','You rated the stakes low, but the data is personal or confidential. A leak is never a cheap error.');
  if(a.band==='core' && a.input==='structured' && ['route','check','coordinate','allocate'].includes(a.shape)) push('band','The inputs are already structured and the work is routing, checking or coordinating. A rule may do this with no LLM at all.');
  if(a.band==='none' && a.input==='text' && ['extract','summarize','draft','lookup'].includes(a.shape)) push('band','This is language work on text. Are you sure something simpler fits? Rules struggle with free text.');
  if(a.auto==='auto' && a.stakes==='high') push('auto','Fully automating a high-stakes step: who owns a wrong answer?');
  if(a.input==='tacit' && (a.band==='core' || a.band==='assist')) push('input','An LLM cannot read what was never written down. Capture comes first.');
  if(nums && a.rep==='low' && nums.total>=40) push('rep',`You said it is rare, but your numbers come to about ${round(nums.total)} hours a month.`);
  if(nums && a.rep==='high' && nums.total<5) push('rep',`You said high volume, but your numbers come to only about ${round(nums.total)} hours a month.`);
  if(a.band==='other' && a.builder==='team') push('builder','Forecasting, optimisation and vision models are built and maintained, not used off the shelf. Who would own the model?');
  return out;
}
