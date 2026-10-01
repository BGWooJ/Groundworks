/* =====================================================================
   TOOLS: the approved destinations, and how each answer moves the heading.
   Every point a tool earns comes with the sentence that explains it, so
   the indicator can always say why it moved.
   ===================================================================== */
const DESTINATIONS = [
  {id:'lpp',        name:'LPP',            what:'Air-gapped LLM suite',
   about:'Claude, Llama, Nemotron and others inside the Bank\u2019s boundary. Staff use it directly through a web interface; there is no connector.'},
  {id:'lppplus',    name:'LPP Plus',       what:'LPP with agents',
   about:'LPP that can take multi-step actions: look things up, fill forms and chase follow-ups, not just answer.'},
  {id:'copilot',    name:'Copilot GCC',    what:'Inside Microsoft 365',
   about:'An assistant inside Outlook, Word, Excel and Teams, within the Microsoft compliance boundary.'},
  {id:'studio',     name:'Copilot Studio', what:'Low-code agents and connectors',
   about:'Builds agents and workflows that connect to business systems through connectors and APIs, without full custom development.'},
  {id:'codehelper', name:'CodeHelper',     what:'Developers build it',
   about:'Claude Code on a developer\u2019s machine, for pipelines, rules, integrations and custom extraction that run on their own.'},
  {id:'none',       name:'No new tool',    what:'Fix the process instead',
   about:'The answer is a change to how the work is done, or a capability the Bank already owns.'},
];
function destOf(id){ return DESTINATIONS.find(d=>d.id===id); }

/* Score one step. Returns {winner, scores, reasons:{dest:[sentences]}} or null if not enough is known. */
function scoreTools(a){
  if(!a || !a.band || !a.cap) return null;
  const s = {}, r = {};
  DESTINATIONS.forEach(d=>{ s[d.id] = 0; r[d.id] = []; });
  const add = (d, n, why)=>{ s[d] += n; if(why && n>0) r[d].push(why); };
  const sens = a.sens, where = a.where, b = a.builder;

  if(a.band==='none'){
    if(a.cap==='fix') add('none', 6, 'The fix is a change to the process, not a new tool.');
    else if(b==='lowcode') add('studio', 4, 'A low-code workflow can apply fixed rules across systems.');
    else if(b==='team') { add('none', 3, 'Fixed rules may already fit in a system the team uses.'); add('studio', 2, 'A low-code workflow could carry the rules.'); }
    else add('codehelper', 4, 'Rules and integration that developers build once and leave running.');
  } else if(a.band==='other'){
    add('codehelper', b==='dev' ? 4 : 2, 'Forecasting, optimisation and vision models are built and maintained, not chatted with.');
    if(b!=='dev') add('none', 1, 'This needs a data science team more than a new tool.');
  } else {
    if(a.cap==='agent' || a.shape==='coordinate'){
      add('lppplus', 3, 'It has to act across systems, not just answer.');
      add('studio', 2, 'A low-code agent can connect the systems it touches.');
    } else {
      add('lpp', 2, 'Reading, answering or drafting in language is what the LLM suite does well.');
      add('copilot', 1);
    }
    if(sens==='personal'){ add('lpp', 3, 'Personal or confidential data stays inside the air-gapped suite.'); s.copilot -= 1; }
    if(where==='office' && sens!=='personal') add('copilot', 3, 'The work already happens in Outlook, Word, Excel and Teams.');
    if(where==='system' && a.auto!=='assist') add('studio', 2, 'It has to run inside a business system, connected through its APIs.');
    if(a.rep==='high' && ['extract','classify'].includes(a.cap) && a.auto!=='assist')
      add('codehelper', 3, 'At this volume it needs a pipeline that runs on its own, not a chat window.');
    if(b==='dev') add('codehelper', 1, 'Developers are available to build and own it.');
    if(b==='lowcode') add('studio', 1, 'A power user can build it with low code.');
    if(b==='team') add(where==='office' && sens!=='personal' ? 'copilot' : 'lpp', 1, 'Staff can use it directly, with nothing to build.');
  }
  const ranked = DESTINATIONS.map(d=>d.id).sort((x,y)=>s[y]-s[x]);
  return {winner:ranked[0], runnerUp: s[ranked[1]] >= s[ranked[0]]-1 && s[ranked[1]]>0 ? ranked[1] : null, scores:s, reasons:r};
}
function whyTool(t){ return t && t.reasons[t.winner] && t.reasons[t.winner].length ? t.reasons[t.winner].join(' ') : ''; }

/* Aggregate the read steps into the process heading. */
function processHeading(results){
  // results: [{index, name, tool}] for read steps
  const by = {}, total = {};
  DESTINATIONS.forEach(d=>{ by[d.id] = []; total[d.id] = 0; });
  results.forEach(x=>{
    if(!x.tool) return;
    by[x.tool.winner].push(x.index+1);
    DESTINATIONS.forEach(d=>{ total[d.id] += Math.max(0, x.tool.scores[d.id]); });
  });
  const order = DESTINATIONS.map(d=>d.id).filter(id=>by[id].length).sort((x,y)=> by[y].length-by[x].length || total[y]-total[x]);
  const leaders = order.slice(0, 2).filter((id,i)=> i===0 || by[id].length>=2 || by[id].length>=by[order[0]].length);
  return {leaders, by, total, rising: order.find(id=>!leaders.includes(id)) || null};
}
function stepsLabel(nums){
  if(!nums.length) return '';
  if(nums.length===1) return `Step ${nums[0]}`;
  return `Steps ${nums.slice(0,-1).join(', ')} and ${nums[nums.length-1]}`;
}
