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
