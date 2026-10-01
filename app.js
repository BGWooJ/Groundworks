(function(){
'use strict';

/* ================= STATE ================= */
const S = {
  mode:null,               // 'guided' | 'apply'
  stage:'hero',
  score:0, maxScore:0,
  cat:{terrain:{s:0,m:0}, profile:{s:0,m:0}, match:{s:0,m:0}, reality:{s:0,m:0}, canvas:{s:0,m:0}},
  eventsShown:{},
  modal:null,              // {eventId, phase:'choose'|'feedback', chosenIdx, cb}

  // terrain
  viewFn:null,
  shortlist:[],            // process ids
  terrainRevealed:false,

  // expedition / step-walk
  procId:null,             // 'A'|'B'|'C'
  stepIndex:0,
  stepPhase:'brief',       // brief -> profile -> profile-reveal -> match -> match-reveal
  stepAnswers:{},          // stepId -> {p:{shape,input,rep,stakes}, profileScored, cap, auto, matchScored, marked}
  curProfile:{},
  curCap:null, curAuto:null,
  marked:[],

  // reality
  realityRatings:{},       // stepId -> {data,risk,change,integ,value}
  realityDone:false,
  headlineStep:null,

  // canvas
  canvasGuardrails:[],
  canvasScored:false,
  canvasRevealed:false,

  // apply mode
  applyOrg:'', applyProcess:'',
  applySteps:[],           // [{name, notes}]
  applyStepsError:false,
  applyIndex:0,
  applyAnswers:{},         // idx -> {p, cap, auto, guardrails:[], metric, data}
  applyPhase:'profile',    // profile -> suggest -> detail
};

function score(cat, earned, max){
  S.score += earned; S.maxScore += max;
  S.cat[cat].s += earned; S.cat[cat].m += max;
}

/* ================= HELPERS ================= */
function h(strings, ...vals){ // no-op tag, keeps template literals readable
  return strings.reduce((a,s,i)=> a + s + (i<vals.length? vals[i] : ''), '');
}
function esc(str){
  return String(str==null?'':str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function findProcessMeta(id){
  for(const fn of FUNCTIONS){ for(const p of fn.processes){ if(p.id===id) return {fn, proc:p}; } }
  return null;
}
function capName(id){ return CAPS[id] ? CAPS[id].name : id; }
function levelName(id){ return ({low:'Low', mid:'Medium', high:'High'})[id] || id; }
function tierTag(tier){
  if(tier==='best') return '<span class="tag good">Strong fit</span>';
  if(tier==='ok') return '<span class="tag warn">Workable</span>';
  return '<span class="tag bad">Poor fit</span>';
}
function pct(s,m){ return m>0 ? Math.round(100*s/m) : 0; }

function mount(html){
  document.getElementById('app').innerHTML = html;
}

function render(){
  if(S.stage==='hero'){ mount(railless(viewHero())); }
  else if(S.mode==='guided'){ mount(withRail(viewGuided(), railGuided())); }
  else { mount(withRail(viewApply(), railApply())); }
  renderModal();
  maybeNudge();
  window.scrollTo({top:0});
}

function railless(inner){
  return `<div class="app full">${inner}</div>`;
}
function withRail(inner, railHtml){
  return `<div class="app"><nav class="rail" aria-label="Progress">${railHtml}</nav><main class="main">${inner}</main></div>`;
}

/* ================= ICON ================= */
const COMPASS = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="11.5" fill="none" stroke="#182322" stroke-width="1.6"/><path d="M17 9 L11.5 11.5 L9 17 L14.5 14.5 Z" fill="#C8401B"/></svg>`;

/* ================= RAIL (guided) ================= */
function railGuided(){
  const groups = [
    {id:'terrain', label:'Survey the terrain', sub: S.mode==='guided' && S.procId ? (findProcessMeta(S.procId)? '' : '') : ''},
    {id:'expedition', label:'Choose an expedition', sub:''},
    {id:'dissect', label:'Dissect the work', sub: S.stage==='step' ? `Step ${S.stepIndex+1} of ${PROCESSES[S.procId] ? PROCESSES[S.procId].steps.length : ''}` : ''},
    {id:'reality', label:'Reality check', sub:''},
    {id:'canvas', label:'Build the canvas', sub:''},
    {id:'debrief', label:'Debrief', sub:''},
  ];
  const cur = stageGroup(S.stage);
  const order = groups.map(g=>g.id);
  const curIdx = order.indexOf(cur);
  const items = groups.map((g,i)=>{
    const cls = i<curIdx ? 'done' : (i===curIdx ? 'cur' : 'up');
    return `<li class="${cls}"><span class="m"></span><span class="t">${g.label}</span>${g.sub?`<span class="s">${esc(g.sub)}</span>`:''}</li>`;
  }).join('');
  return `
    <div class="brand">${COMPASS}<span>Groundwork<span class="sub">an AI use-case expedition</span></span></div>
    <ol class="trail">${items}</ol>
    <div class="railfoot">
      <div class="score">${S.score}<span> / ${S.maxScore} pts</span></div>
      <button class="linkbtn" data-act="restart">Start over</button>
    </div>`;
}
function railApply(){
  const groups = [
    {id:'setup', label:'Name your process'},
    {id:'steps', label:'List the steps'},
    {id:'walk', label:'Walk each step', sub: S.stage==='apply-walk' ? `${S.applyIndex+1} of ${S.applySteps.length}: ${S.applySteps[S.applyIndex] ? S.applySteps[S.applyIndex].name : ''}` : ''},
    {id:'canvas', label:'Your canvas'},
  ];
  const cur = {'apply-setup':'setup','apply-steps':'steps','apply-walk':'walk','apply-canvas':'canvas'}[S.stage];
  const order = groups.map(g=>g.id);
  const curIdx = order.indexOf(cur);
  const items = groups.map((g,i)=>{
    const cls = i<curIdx ? 'done' : (i===curIdx ? 'cur' : 'up');
    return `<li class="${cls}"><span class="m"></span><span class="t">${g.label}</span>${g.sub?`<span class="s">${esc(g.sub)}</span>`:''}</li>`;
  }).join('');
  return `
    <div class="brand">${COMPASS}<span>Groundwork<span class="sub">apply to your own process</span></span></div>
    <ol class="trail">${items}</ol>
    <div class="railfoot">
      <button class="linkbtn" data-act="restart">Start over</button>
    </div>`;
}
function stageGroup(stage){
  if(['terrain-intro','terrain-map','terrain-reveal'].includes(stage)) return 'terrain';
  if(stage==='pick-expedition') return 'expedition';
  if(stage==='step') return 'dissect';
  if(stage==='reality') return 'reality';
  if(stage==='canvas') return 'canvas';
  if(stage==='debrief') return 'debrief';
  return 'terrain';
}

/* ================= HERO ================= */
function viewHero(){
  return `
  <div class="hero">
    <div class="k small muted" style="margin-bottom:10px;letter-spacing:.02em">A GAME OF DISCOVERY, NOT A CATALOGUE OF TOOLS</div>
    <h1>Groundwork</h1>
    <p class="tag-line">Find where AI actually belongs in your organization &mdash; by surveying the terrain before naming a tool.</p>

    <svg class="route" viewBox="0 0 860 130" role="img" aria-label="The route: terrain, expedition, dissection, matching, reality check, canvas">
      <line x1="30" y1="65" x2="830" y2="65" stroke="#9A6A34" stroke-width="2" stroke-dasharray="1 8" stroke-linecap="round"/>
      ${[['Terrain',60],['Expedition',230],['Dissect',400],['Match','570'],['Reality','700'],['Canvas','800']].map(([lbl,x],i)=>`
        <circle cx="${x}" cy="65" r="7" fill="${i===0?'#C8401B':'#EDF0E8'}" stroke="#182322" stroke-width="1.6"/>
        <text x="${x}" y="95" text-anchor="middle" class="lbl">${lbl}</text>
      `).join('')}
    </svg>

    <p class="note">You'll lead the search for AI use cases at Meridian Reserve Bank, survey where the real pain lives, pick one process to take apart step by step, match each step to the type of capability it needs &mdash; not a brand &mdash; then size the risk and build a one-page case worth pitching.</p>

    <div class="modes">
      <button class="mode" data-act="start-guided">
        <span class="n">Take the guided expedition</span>
        <span class="d">Walk Meridian Reserve Bank's real processes, dissect the work, and learn the method as you go. ~20&ndash;30 minutes.</span>
        <span class="go">Start the expedition &rarr;</span>
      </button>
      <button class="mode" data-act="start-apply">
        <span class="n">Apply it to your own process</span>
        <span class="d">Bring a real process from your organization and run it through the same dissection, with suggestions as you go.</span>
        <span class="go">Map your process &rarr;</span>
      </button>
    </div>
    <p class="tiny muted" style="max-width:60ch">Built for leading a team through use-case discovery. Play it solo first, then bring your team through the guided expedition together &mdash; the discussion prompts along the way are built for that.</p>
  </div>`;
}

/* ================= EVENTS / MODAL ================= */
function maybeTriggerEvent(key, cb){
  const evId = EVENT_TRIGGERS[key];
  if(evId && !S.eventsShown[evId]){
    S.eventsShown[evId] = true;
    S.modal = {eventId:evId, phase:'choose', chosenIdx:null, cb};
    render();
  } else {
    cb();
  }
}
function renderModal(){
  const wrap = document.getElementById('modal');
  if(!S.modal){ wrap.hidden = true; document.getElementById('modalCard').innerHTML=''; return; }
  const ev = EVENTS[S.modal.eventId];
  let inner;
  if(S.modal.phase==='choose'){
    inner = `
      <div class="k">On the trail</div>
      <h3>${esc(ev.title)}</h3>
      <p class="note">${esc(ev.text)}</p>
      <div class="chips stack" role="group" aria-label="Choose how to respond">
        ${ev.opts.map((o,i)=>`<button class="chip" data-act="event-choose" data-idx="${i}">${esc(o.t)}</button>`).join('')}
      </div>`;
  } else {
    const o = ev.opts[S.modal.chosenIdx];
    const tag = o.s===2? '<span class="tag good">Solid instinct</span>' : (o.s===1? '<span class="tag warn">Workable, but&hellip;</span>' : '<span class="tag bad">Off track</span>');
    inner = `
      <div class="k">On the trail</div>
      <h3>${esc(ev.title)}</h3>
      <p>${tag}</p>
      <p class="note">${esc(o.fb)}</p>
      <div class="actions"><button class="btn" data-act="event-continue">Continue</button></div>`;
  }
  document.getElementById('modalCard').innerHTML = inner;
  wrap.hidden = false;
}

/* ================= TERRAIN ================= */
function viewGuided(){
  switch(S.stage){
    case 'terrain-intro': return viewTerrainIntro();
    case 'terrain-map': return viewTerrainMap();
    case 'terrain-reveal': return viewTerrainReveal();
    case 'pick-expedition': return viewPickExpedition();
    case 'step': return viewStep();
    case 'reality': return viewReality();
    case 'canvas': return viewCanvas();
    case 'debrief': return viewDebrief();
    default: return viewTerrainIntro();
  }
}

function viewTerrainIntro(){
  return `
  <div class="stagehead">
    <div class="k muted">Survey the terrain</div>
    <h2>${esc(COMPANY.name)}</h2>
    <p class="lead">${esc(COMPANY.blurb)}</p>
  </div>
  <div class="panel">
    <p class="note">${esc(COMPANY.role)}</p>
    <p class="note">Before anyone mentions a tool, you need a map: which functions exist, what processes run inside them, and which ones are actually worth your time. Some will be loud. Some will just be busy. Go and look.</p>
  </div>
  <div class="actions"><button class="btn" data-act="goto-terrain-map">Open the map &rarr;</button></div>`;
}

function viewTerrainMap(){
  const stationBtn = f=>{
    const n = f.processes.length;
    const shortlisted = f.processes.filter(p=>S.shortlist.includes(p.id)).length;
    return `<button class="station ${S.viewFn===f.id?'on':''}" data-act="view-fn" data-fn="${f.id}">
      ${shortlisted? `<span class="hot">${shortlisted}</span>`:''}
      <span class="ico-wrap">${icon(f.icon,'lg')}</span>
      <span class="n">${esc(f.name)}</span>
      <span class="c">${n} process${n===1?'':'es'}</span>
    </button>`;
  };
  const bands = MAP_GROUPS.map(g=>{
    const fns = FUNCTIONS.filter(f=>f.group===g.id);
    if(!fns.length) return '';
    return `<div class="band">
      <div class="bandhead"><span class="n">${esc(g.label)}</span><span class="d">${esc(g.d)}</span></div>
      <div class="stations">${fns.map(stationBtn).join('')}</div>
    </div>`;
  }).join('');
  const detail = S.viewFn ? viewFnDetail(FUNCTIONS.find(f=>f.id===S.viewFn)) : `
    <p class="note muted">Click a part of the Bank to see what's happening inside it. Shortlist up to three processes across the whole map &mdash; the ones you'd want to investigate first &mdash; before moving on.</p>`;
  return `
  <div class="stagehead">
    <div class="k muted">Survey the terrain</div>
    <h2>Where is the Bank, and what's happening in it?</h2>
    <p class="lead">Click around. Read the signals. Shortlist up to three processes you'd want to investigate first.</p>
  </div>
  <div class="map">${bands}</div>
  ${detail}
  <div class="actions">
    <span class="tiny muted">Shortlisted: ${S.shortlist.length} of 3</span>
    <button class="btn" data-act="goto-terrain-reveal" ${S.shortlist.length===0?'disabled':''}>Compare against the full map &rarr;</button>
  </div>`;
}

function viewFnDetail(fn){
  return `
  <div class="panel">
    <h3 class="fnhead">${icon(fn.icon,'lg')}<span>${esc(fn.name)}</span></h3>
    <div class="brief">
      <div>
        <p>${esc(fn.brief)}</p>
        <p class="tiny muted">Signals worth noticing:</p>
        <ul class="signals">
          ${fn.signals.map(s=>`<li><span class="sig ${s.s}"></span><span>${esc(s.t)}</span></li>`).join('')}
        </ul>
      </div>
      <div>
        <p class="tiny muted">Processes here:</p>
        ${fn.processes.map(p=>{
          const on = S.shortlist.includes(p.id);
          return `<div class="proc ${on?'on':''}">
            <div><div class="n">${esc(p.name)}</div><div class="d">${esc(p.d)}</div></div>
            <button class="btn sec small" data-act="toggle-shortlist" data-proc="${p.id}">${on?'Shortlisted \u2713':'Shortlist'}</button>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

function viewTerrainReveal(){
  if(!S.terrainRevealed){
    // score the shortlist now, once
    S.shortlist.forEach(pid=>{
      const meta = findProcessMeta(pid);
      const rating = meta ? meta.proc.rating : 1;
      const earned = [0,0,1,4,7,10][rating] || 0;
      score('terrain', earned, 10);
    });
    S.terrainRevealed = true;
  }
  const all = [];
  FUNCTIONS.forEach(fn=> fn.processes.forEach(p=> all.push({fn:fn.name, ...p})));
  all.sort((a,b)=> b.rating - a.rating);
  const rows = all.map(p=>{
    const stars = '\u2605'.repeat(p.rating) + '\u2606'.repeat(5-p.rating);
    const you = S.shortlist.includes(p.id) ? '<span class="you">your shortlist</span>' : '';
    return `<li><div class="stars">${stars}</div><div class="w"><b>${esc(p.name)}</b> &mdash; ${esc(p.fn)} ${you}<br><span class="muted">${esc(p.why)}</span></div></li>`;
  }).join('');
  return `
  <div class="stagehead">
    <div class="k muted">Survey the terrain</div>
    <h2>The full picture</h2>
    <p class="lead">Every process across the business, ranked by how strong a hotspot it is: volume, repetition, measurable pain and captured data, together.</p>
  </div>
  <div class="discuss"><b>Bring to your team:</b> ${esc(DISCUSS.terrain)}</div>
  <ol class="rank">${rows}</ol>
  <p class="tiny muted">You scored ${S.cat.terrain.s} of ${S.cat.terrain.m} points on the shortlist &mdash; closeness to the top of this list, not agreement with it, is the point of the exercise.</p>
  <div class="actions"><button class="btn" data-act="to-pick-expedition">Choose your expedition &rarr;</button></div>`;
}

function viewPickExpedition(){
  const opts = Object.keys(PROCESSES).map(id=>{
    const p = PROCESSES[id];
    return `<button class="pick" data-act="pick-expedition" data-proc="${id}">
      <span class="fn">${icon(p.fnId,'sm')} ${esc(p.fn)}</span>
      <span class="n">${esc(p.name)}</span>
      <span class="d">${p.steps.length} steps to dissect, from first contact to resolution.</span>
    </button>`;
  }).join('');
  return `
  <div class="stagehead">
    <div class="k muted">Choose an expedition</div>
    <h2>Pick one process to take apart</h2>
    <p class="lead">These all rated highest on the map. Depth beats breadth: pick one and walk every step of it.</p>
  </div>
  <div class="pickgrid">${opts}</div>`;
}

/* ================= STEP DISSECTION ================= */
function curProcess(){ return PROCESSES[S.procId]; }
function curStep(){ return curProcess().steps[S.stepIndex]; }

function viewStep(){
  const proc = curProcess(), step = curStep();
  const trail = proc.steps.map((st,i)=>{
    const cls = i<S.stepIndex ? 'done' : (i===S.stepIndex ? 'cur' : '');
    return `<span class="${cls}">${i+1}. ${esc(st.name)}</span>`;
  }).join('');
  let body;
  if(S.stepPhase==='brief') body = viewStepBrief(step);
  else if(S.stepPhase==='profile') body = viewStepProfile(step);
  else if(S.stepPhase==='profile-reveal') body = viewStepProfileReveal(step);
  else if(S.stepPhase==='match') body = viewStepMatch(step);
  else body = viewStepMatchReveal(step);
  return `
  <div class="stagehead">
    <div class="k muted">${esc(proc.name)} &mdash; dissecting the work</div>
    <h2>${esc(step.name)}</h2>
  </div>
  <div class="steptrail">${trail}</div>
  ${body}`;
}

function viewStepBrief(step){
  return `
  <div class="panel">
    <div class="facts">
      <div><span class="l">Who does it</span><span class="v">${esc(step.who)}</span></div>
      <div><span class="l">Volume</span><span class="v">${esc(step.volume)}</span></div>
      <div><span class="l">Systems touched</span><span class="v">${esc(step.systems)}</span></div>
    </div>
    <p class="note" style="margin-top:14px">${esc(step.notes)}</p>
    <p class="fieldnotes"><b>The pain, as measured:</b> ${esc(step.pain)}</p>
  </div>
  <div class="actions"><button class="btn" data-act="step-to-profile">Profile this work &rarr;</button></div>`;
}

function chipSingle(dim, opts, selected, groupKey){
  return `<div class="dim">
    <div class="q">${esc(dim.label)}</div>
    <div class="qs">${esc(dim.q)}</div>
    <div class="chips" role="group" aria-label="${esc(dim.label)}">
      ${opts.map(o=>`<button class="chip ${selected===o.id?'on':''}" data-act="pick-dim" data-group="${groupKey}" data-dim="${dim.id}" data-val="${o.id}">${esc(o.name)}<span class="d">${esc(o.d)}</span></button>`).join('')}
    </div>
  </div>`;
}

function viewStepProfile(step){
  const p = S.curProfile;
  const ready = DIMS.every(d=>p[d.id]);
  return `
  <div class="panel">
    <p class="tiny muted">Look again at what you just read, then describe the work on four dimensions. There's no trick here &mdash; describe it as you actually see it.</p>
    ${DIMS.map(d=>chipSingle(d, d.opts, p[d.id], 'profile')).join('')}
  </div>
  <div id="nudgeSlot"></div>
  <div class="actions"><button class="btn" data-act="submit-profile" ${ready?'':'disabled'}>Compare with the expert view &rarr;</button></div>`;
}

function viewStepProfileReveal(step){
  const res = S.stepAnswers[step.id].profileScored;
  const rows = DIMS.map(d=>{
    const r = res.dims[d.id];
    const yourOpt = d.opts.find(o=>o.id===r.val);
    const bestOpt = d.opts.find(o=>o.id===r.best);
    const same = r.val===r.best;
    return `<div class="row">
      <div class="l">${esc(d.label)}</div>
      <div class="yours">You said <b>${esc(yourOpt.name)}</b>${same?'': ` &mdash; the expert view leans <b>${esc(bestOpt.name)}</b>`}. <span class="pts">+${r.pts}</span><br><span class="muted">${esc(step.profileNotes[d.id])}</span></div>
    </div>`;
  }).join('');
  return `
  <div class="expert">
    <h4>How the expert profiles this step</h4>
    <div class="cmp">${rows}</div>
    <p><b>Points this step: ${res.total} / 8</b></p>
  </div>
  <div class="actions"><button class="btn" data-act="step-to-match">Choose a capability &rarr;</button></div>`;
}

function viewStepMatch(step){
  const groups = CAP_FAMILIES.map(fam=>`
    <div class="fam ${fam.id==='none'?'none':''}">
      <h4>${icon(fam.id,'sm')} ${esc(fam.name)}</h4>
      <div class="chips">
        ${fam.caps.map(cid=>`<button class="chip ${S.curCap===cid?'on':''}" data-act="pick-cap" data-cap="${cid}">${esc(CAPS[cid].name)}</button>`).join('')}
      </div>
    </div>`).join('');
  const autoOpts = AUTONOMY.map(a=>`<button class="chip ${S.curAuto===a.id?'on':''}" data-act="pick-auto" data-val="${a.id}">${esc(a.name)}<span class="d">${esc(a.d)}</span></button>`).join('');
  const capInfo = S.curCap ? `
    <div class="capcard">
      <h4>${esc(CAPS[S.curCap].name)}</h4>
      <p>${esc(CAPS[S.curCap].one)}</p>
      <div class="kv"><b>Good for</b><span>${CAPS[S.curCap].good.map(esc).join(' &middot; ')}</span></div>
      <div class="kv"><b>Needs</b><span>${esc(CAPS[S.curCap].needs)}</span></div>
      <div class="kv"><b>Watch for</b><span>${esc(CAPS[S.curCap].watch)}</span></div>
    </div>` : `<p class="tiny muted">Click a capability to see what it actually does before you commit to it.</p>`;
  const ready = S.curCap && S.curAuto;
  return `
  <div class="panel">
    <p class="fieldnotes">${esc(step.notes)}</p>
  </div>
  <h3>Which capability does this step need?</h3>
  <p class="lead small">Judge by the shape of the work, not by what's fashionable. Brands don't appear on this map on purpose.</p>
  <div class="toolkit">${groups}</div>
  ${capInfo}
  <h3 style="margin-top:22px">How much should it act on its own?</h3>
  <div class="chips">${autoOpts}</div>
  <div id="nudgeSlot"></div>
  <div class="actions"><button class="btn" data-act="submit-match" ${ready?'':'disabled'}>Reveal the expert take &rarr;</button></div>`;
}

function viewStepMatchReveal(step){
  const ans = S.stepAnswers[step.id];
  const m = ans.matchScored;
  const yourCapNote = step.fitNotes[S.curCap] || step.poorNote;
  const marked = S.marked.includes(step.id);
  const discoveries = step.discoveries.map(d=>`<div class="dig open"><div class="t">${esc(d.title)}</div><p class="note" style="margin:4px 0 0">${esc(d.text)}</p><div class="eff">${esc(d.effect)}</div></div>`).join('');
  const isLast = S.stepIndex === curProcess().steps.length-1;
  return `
  <div class="expert">
    <h4>Your match: ${esc(capName(ans.cap))} ${tierTag(m.tier)}</h4>
    <p>${esc(yourCapNote)}</p>
    ${m.tier!=='best' ? `<p><b>The expert pick:</b> ${esc(capName(step.expertPick))} &mdash; ${esc(step.expertWhy)}</p>` : `<p class="muted">That matches the expert pick, for the same reason: ${esc(step.expertWhy)}</p>`}
    <p><b>Autonomy:</b> you chose ${esc(AUTONOMY.find(a=>a.id===ans.auto).name)}. ${esc(step.autoNote)}</p>
    <p><b>Points this step: ${m.total} / 5</b></p>
  </div>
  <h4>Field notes from this step</h4>
  ${discoveries}
  <div class="panel" style="margin-top:16px">
    <label class="toggle">
      <input type="checkbox" data-act="toggle-mark" ${marked?'checked':''}>
      <span>Mark <b>${esc(step.name)}</b> as a use-case candidate to carry into the reality check. (Aim to mark 2&ndash;4 steps across the whole process.)</span>
    </label>
  </div>
  <div class="actions">
    <button class="btn" data-act="next-step">${isLast? 'Continue to the reality check \u2192' : 'Next step \u2192'}</button>
  </div>`;
}

/* ================= REALITY CHECK ================= */
function viewReality(){
  if(S.marked.length===0){
    const lastStep = curProcess().steps[curProcess().steps.length-1];
    S.marked = [lastStep.id];
  }
  const proc = curProcess();
  const steps = proc.steps.filter(st=>S.marked.includes(st.id));
  const allRated = steps.every(st => S.realityRatings[st.id] && S.realityRatings[st.id].data && S.realityRatings[st.id].risk && S.realityRatings[st.id].change && S.realityRatings[st.id].integ && S.realityRatings[st.id].value);

  if(!S.realityDone){
    const blocks = steps.map(st=>{
      const r = S.realityRatings[st.id] || {};
      const seg = (key,label,help)=>`
        <div><div class="q">${esc(label)}<span class="tiny muted" style="display:block;font-weight:400">${esc(help)}</span></div>
        <div class="seg">${LEVELS.map(l=>`<button class="${r[key]===l.id?'on':''}" data-act="rate" data-step="${st.id}" data-key="${key}" data-val="${l.id}">${l.name}</button>`).join('')}</div></div>`;
      return `
      <div class="panel">
        <h3>${esc(st.name)}</h3>
        <p class="tiny muted">${esc(st.pain)}</p>
        <div class="ratings">
          ${seg('data','Data readiness','How ready is the data this needs?')}
          ${seg('risk','Risk','How costly or sensitive are errors?')}
          ${seg('change','Change effort','How much does work or habit have to change?')}
          ${seg('integ','Integration effort','How many systems does this have to touch?')}
          ${seg('value','Value if it works','Your call: how big is the prize?')}
        </div>
      </div>`;
    }).join('');
    return `
    <div class="stagehead">
      <div class="k muted">Reality check</div>
      <h2>Rate what it would actually take</h2>
      <p class="lead">A good match on paper is not the same as a use case that survives contact with the organization. Rate each candidate on the ground it would have to cross.</p>
    </div>
    <div class="discuss"><b>Bring to your team:</b> ${esc(DISCUSS.reality)}</div>
    ${blocks}
    <div class="actions"><button class="btn" data-act="plot-portfolio" ${allRated?'':'disabled'}>Plot the portfolio &rarr;</button></div>`;
  }

  // scored view
  const cells = {}; // key 'F-V' -> list
  const dotsFor = (f,v,label,cls)=>{ const k=f+'-'+v; (cells[k]=cells[k]||[]).push(`<span class="dot ${cls}" title="${esc(label)}">${esc(label[0])}</span>`); };
  steps.forEach((st,i)=>{
    const r = S.realityRatings[st.id];
    dotsFor(r.data_feas || feasLevelOf(r), r.value, 'You'+(i+1), 'you');
    dotsFor(st.expertFeas, st.expertValue, 'E'+(i+1), 'exp');
  });
  function feasLevelOf(r){ return feasibilityLevel({data:LEVEL_IDX[r.data]+1, risk:LEVEL_IDX[r.risk]+1, change:LEVEL_IDX[r.change]+1, integ:LEVEL_IDX[r.integ]+1}); }

  const grid = [];
  const vOrder = ['high','mid','low'];
  const fOrder = ['low','mid','high'];
  grid.push(`<div class="cell" style="border:0;background:none"></div>`);
  fOrder.forEach(f=> grid.push(`<div class="ax">Feasibility: ${levelName(f)}</div>`));
  vOrder.forEach(v=>{
    grid.push(`<div class="ax y">Value: ${levelName(v)}</div>`);
    fOrder.forEach(f=>{
      const q = quadrant(f,v);
      const qc = q==='Quick win'?'win':(q==='Strategic bet'?'bet':(q==='Fill-in'?'fill':'avoid'));
      const k=f+'-'+v;
      grid.push(`<div class="cell ${qc}"><div class="q">${q}</div><div class="dots">${(cells[k]||[]).join('')}</div></div>`);
    });
  });
  grid.push(`<div class="cell" style="border:0;background:none"></div>`,`<div class="ax"></div>`,`<div class="ax"></div>`,`<div class="ax"></div>`);

  const pickHead = steps.map((st,i)=>`<button class="pick" data-act="pick-headline" data-step="${st.id}">
      <span class="fn">Step ${i+1}</span><span class="n">${esc(st.name)}</span>
      <span class="d">${esc(st.realityNote)}</span></button>`).join('');

  return `
  <div class="stagehead">
    <div class="k muted">Reality check</div>
    <h2>The portfolio</h2>
    <p class="lead">Green cells are quick wins: they build trust for the harder, higher-value bets in blue. Grey and red are where good matches go to die without a sponsor.</p>
  </div>
  <div class="portfolio">${grid.join('')}</div>
  <div class="legend">
    <span><i style="background:var(--forest-tint)"></i>Quick win</span>
    <span><i style="background:var(--water-tint)"></i>Strategic bet</span>
    <span><i style="background:var(--paper-2)"></i>Fill-in</span>
    <span><i style="background:rgba(200,64,27,.14)"></i>Avoid, or fix first</span>
  </div>
  <p class="tiny muted" style="margin-top:10px">You scored ${S.cat.reality.s} of ${S.cat.reality.m} on the reality check &mdash; agreement with the expert placement, not with these labels.</p>
  <h3 style="margin-top:26px">Pick one to build into a one-page canvas</h3>
  <div class="pickgrid">${pickHead}</div>`;
}

/* ================= CANVAS ================= */
function viewCanvas(){
  const proc = curProcess(), step = proc.steps.find(s=>s.id===S.headlineStep);
  const ans = S.stepAnswers[step.id];
  const checks = GUARDRAILS.map(g=>{
    const on = S.canvasGuardrails.includes(g.id);
    return `<label class="check ${on?'on':''}"><input type="checkbox" data-act="toggle-guardrail" data-g="${g.id}" ${on?'checked':''}><span><b>${esc(g.name)}</b><span class="d">${esc(g.d)}</span></span></label>`;
  }).join('');
  const expertG = step.guardrails.map(g=>GUARDRAILS.find(x=>x.id===g).name).join(', ');
  const revealBlock = S.canvasRevealed
    ? `<p class="tiny muted">The expert's picks for this step: ${esc(expertG)}. You scored ${S.cat.canvas.s} of ${S.cat.canvas.m}.</p>`
    : `<div class="actions"><button class="btn sec" data-act="reveal-canvas" ${S.canvasGuardrails.length?'':'disabled'}>Check against the expert view &rarr;</button></div>`;
  return `
  <div class="stagehead">
    <div class="k muted">Build the canvas</div>
    <h2>One page you could actually pitch</h2>
    <p class="lead">Choose the guardrails this use case needs before you call it done.</p>
  </div>
  <div class="checks">${checks}</div>
  ${revealBlock}

  <div class="sheet">
    <h3>${esc(proc.name)} &mdash; ${esc(step.name)}</h3>
    <div class="sub">${esc(COMPANY.name)} &middot; use-case canvas</div>
    <div class="grid">
      <div class="cell"><span class="l">Capability</span>${esc(capName(ans.cap))}</div>
      <div class="cell"><span class="l">Autonomy</span>${esc(AUTONOMY.find(a=>a.id===ans.auto).name)}</div>
      <div class="cell wide"><span class="l">Why this step</span>${esc(step.pain)}</div>
      <div class="cell wide"><span class="l">Value hypothesis</span>${esc(step.valueHyp)}</div>
      <div class="cell wide"><span class="l">Metric to prove it</span>${esc(step.metric)}</div>
      <div class="cell wide"><span class="l">Data needed</span>${esc(step.dataNeeded)}</div>
      <div class="cell wide"><span class="l">Guardrails</span>
        <ul>${S.canvasGuardrails.length? S.canvasGuardrails.map(g=>`<li>${esc(GUARDRAILS.find(x=>x.id===g).name)}</li>`).join('') : '<li class="blank">None selected</li>'}</ul>
      </div>
    </div>
  </div>
  <div class="discuss"><b>Bring to your team:</b> ${esc(DISCUSS.canvas)}</div>
  <div class="actions">
    <button class="btn sec" data-act="print-canvas">Print / save this page</button>
    ${S.canvasRevealed ? `<button class="btn" data-act="to-debrief">See your results &rarr;</button>` : ''}
  </div>`;
}

/* ================= TOOL RECOMMENDATIONS ================= */
// Build the "suggested tools" section from the capabilities the user actually chose.
// Renders synchronously; if AI is connected, a one-line rationale is filled in async.
function toolRecsSection(caps, autos){
  const uniq = Array.from(new Set(caps.filter(Boolean)));
  const au = Array.from(new Set(autos.filter(Boolean)));
  const tools = TOOL_RECS.suggestForCapabilities(uniq, au, ['mid']);
  if(!tools.length) return '';
  const note = tools.note ? `<div class="caution">${esc(tools.note)}</div>` : '';
  const cards = tools.map(t=>TOOL_RECS.formatAsCard(t)).join('');

  // Upgrade the top card with AI reasoning once (non-blocking).
  if(AI.enabled){
    const myToken = ++nudgeToken;
    AI.suggestTools(uniq, au, ['mid']).then(enh=>{
      if(myToken!==nudgeToken) return;
      const slot = document.getElementById('toolReason');
      if(slot && enh && enh[0] && enh[0].reasoning){
        slot.innerHTML = `<div class="fit" style="font-style:italic;margin-top:6px">“${esc(enh[0].reasoning)}”</div>`;
      }
    });
  }
  return `
    <h3 style="margin-top:28px">Approved tools for the capabilities you identified</h3>
    <p class="tiny muted">Matched to the capability types you chose — brands come last, on purpose. Start from the work, not the tool.</p>
    ${note}
    ${cards}
    <div id="toolReason"></div>`;
}

/* ================= DEBRIEF ================= */
function viewDebrief(){
  const p = pct(S.score, S.maxScore);
  let rank = RANKS[0];
  RANKS.forEach(r=>{ if(p>=r.min) rank=r; });
  const bars = ['terrain','profile','match','reality','canvas'].map(k=>{
    const c = S.cat[k];
    const label = {terrain:'Terrain survey', profile:'Profiling the work', match:'Matching capabilities', reality:'Reality check', canvas:'Canvas & guardrails'}[k];
    const w = c.m>0 ? Math.round(100*c.s/c.m) : 0;
    return `<div class="bar"><span>${esc(label)}</span><span class="tr"><span class="fl" style="width:${w}%"></span></span><span class="tiny muted">${c.s}/${c.m}</span></div>`;
  }).join('');
  const proc = curProcess();
  const takeaways = TAKEAWAYS.map(t=>`<li><b>${esc(t.h)}</b><span>${esc(t.d)}</span></li>`).join('');
  const caps = Object.values(S.stepAnswers).map(a=>a.cap);
  const autos = Object.values(S.stepAnswers).map(a=>a.auto);
  return `
  <div class="stagehead">
    <div class="k muted">Debrief</div>
    <h2>${esc(rank.name)}</h2>
    <p class="lead">${p}% &mdash; ${S.score} of ${S.maxScore} points across the expedition.</p>
  </div>
  <p class="note">${esc(rank.d)}</p>
  <div class="badges">
    <span class="badge">${icon(proc.fnId,'sm')} Expedition: ${esc(proc.name)}</span>
    <span class="badge">${S.marked.length} candidate${S.marked.length===1?'':'s'} carried to reality check</span>
  </div>
  <div class="bars">${bars}</div>
  <h3>Take these back to your team</h3>
  <ul class="takeaways">${takeaways}</ul>
  ${toolRecsSection(caps, autos)}
  <div class="actions">
    <button class="btn" data-act="restart">Run another expedition</button>
    <button class="btn sec" data-act="start-apply">Apply it to your own process &rarr;</button>
  </div>`;
}

/* ================= APPLY MODE ================= */
function viewApply(){
  switch(S.stage){
    case 'apply-setup': return viewApplySetup();
    case 'apply-steps': return viewApplySteps();
    case 'apply-walk': return viewApplyWalk();
    case 'apply-canvas': return viewApplyCanvas();
    default: return viewApplySetup();
  }
}

function viewApplySetup(){
  return `
  <div class="stagehead">
    <div class="k muted">Apply it to your own process</div>
    <h2>Name what you're about to dissect</h2>
    <p class="lead">Pick one real process from your organization &mdash; not the whole department, one process, the way you dissected a single one in the guided expedition.</p>
  </div>
  <div class="field">
    <label for="org">Organization or team</label>
    <input class="in" id="org" value="${esc(S.applyOrg)}" placeholder="e.g. Riverside Health Network">
  </div>
  <div class="field">
    <label for="proc">The process</label>
    <input class="in" id="proc" value="${esc(S.applyProcess)}" placeholder="e.g. Patient intake and scheduling">
    <span class="hint">Something with real volume &mdash; it happens many times, not once a year.</span>
  </div>
  <div class="actions"><button class="btn" data-act="apply-to-steps">List the steps &rarr;</button></div>`;
}

function viewApplySteps(){
  const rows = S.applySteps.map((st,i)=>`
    <div class="steprow">
      <div class="num">${i+1}.</div>
      <input class="in" data-act="apply-step-name" data-idx="${i}" value="${esc(st.name)}" placeholder="Step name, e.g. Triage the inbox">
      <input class="in" data-act="apply-step-notes" data-idx="${i}" value="${esc(st.notes)}" placeholder="What actually happens here, in a sentence">
      <button class="btn sec small" data-act="apply-step-remove" data-idx="${i}">Remove</button>
    </div>`).join('');
  const errorMsg = S.applyStepsError ? `<div class="caution">Name at least two steps before you start walking the process.</div>` : '';
  return `
  <div class="stagehead">
    <div class="k muted">Apply it to your own process</div>
    <h2>Break "${esc(S.applyProcess||'your process')}" into steps</h2>
    <p class="lead">List it the way it actually runs, start to finish. Three to eight steps is normal. You'll dissect each one next.</p>
  </div>
  ${rows}
  ${errorMsg}
  <div class="actions">
    <button class="btn sec" data-act="apply-step-add">+ Add a step</button>
    <button class="btn" data-act="apply-to-walk">Start walking the process &rarr;</button>
  </div>`;
}

function viewApplyWalk(){
  const st = S.applySteps[S.applyIndex];
  const ans = S.applyAnswers[S.applyIndex] || (S.applyAnswers[S.applyIndex] = {p:{}, cap:null, auto:null, guardrails:[], metric:'', data:''});
  const trail = S.applySteps.map((s,i)=>`<span class="${i<S.applyIndex?'done':(i===S.applyIndex?'cur':'')}">${i+1}. ${esc(s.name||'untitled')}</span>`).join('');
  let body;
  if(S.applyPhase==='profile') body = viewApplyProfile(st, ans);
  else body = viewApplyDetail(st, ans);
  return `
  <div class="stagehead">
    <div class="k muted">Walking: ${esc(S.applyProcess)}</div>
    <h2>${esc(st.name)}</h2>
    ${st.notes? `<p class="lead">${esc(st.notes)}</p>` : ''}
  </div>
  <div class="steptrail">${trail}</div>
  ${body}`;
}

function viewApplyProfile(st, ans){
  const ready = DIMS.every(d=>ans.p[d.id]);
  return `
  <div class="panel">
    <p class="tiny muted">Describe this step on four dimensions, the way you would to someone who has never seen it.</p>
    ${DIMS.map(d=>chipSingle(d, d.opts, ans.p[d.id], 'apply')).join('')}
  </div>
  <div id="nudgeSlot"></div>
  <div class="actions"><button class="btn" data-act="apply-submit-profile" ${ready?'':'disabled'}>See suggested capabilities &rarr;</button></div>`;
}

function viewApplyDetail(st, ans){
  const sug = suggestCaps(ans.p);
  const suggestList = sug.caps.map(s=>`
    <div class="suggest ${ans.cap===s.id?'on':''}">
      <div><b>${esc(capName(s.id))}</b> ${tierTag(s.tier)}<div class="w">${esc(s.why)}</div></div>
      <button class="btn sec small" data-act="apply-pick-cap" data-cap="${s.id}">${ans.cap===s.id?'Selected':'Choose'}</button>
    </div>`).join('');
  const cautions = sug.cautions.map(c=>`<div class="caution">${esc(c)}</div>`).join('');
  const groups = CAP_FAMILIES.map(fam=>`
    <div class="fam ${fam.id==='none'?'none':''}">
      <h4>${icon(fam.id,'sm')} ${esc(fam.name)}</h4>
      <div class="chips">${fam.caps.map(cid=>`<button class="chip ${ans.cap===cid?'on':''}" data-act="apply-pick-cap" data-cap="${cid}">${esc(CAPS[cid].name)}</button>`).join('')}</div>
    </div>`).join('');
  const capCard = ans.cap ? `<div class="capcard"><h4>${esc(CAPS[ans.cap].name)}</h4><p>${esc(CAPS[ans.cap].one)}</p><div class="kv"><b>Needs</b><span>${esc(CAPS[ans.cap].needs)}</span></div><div class="kv"><b>Watch for</b><span>${esc(CAPS[ans.cap].watch)}</span></div></div>` : '';

  const recAuto = suggestAutonomy(ans.p);
  const autoOpts = AUTONOMY.map(a=>`<button class="chip ${ans.auto===a.id?'on':''} ${!ans.auto && a.id===recAuto?'exp':''}" data-act="apply-pick-auto" data-val="${a.id}">${esc(a.name)}<span class="d">${esc(a.d)}${a.id===recAuto?' (suggested)':''}</span></button>`).join('');

  const recG = ans.cap ? suggestGuardrails(ans.p, ans.cap) : [];
  const gChecks = GUARDRAILS.map(g=>{
    const on = ans.guardrails.includes(g.id);
    return `<label class="check ${on?'on':''}"><input type="checkbox" data-act="apply-toggle-guardrail" data-g="${g.id}" ${on?'checked':''}><span><b>${esc(g.name)}</b>${recG.includes(g.id)?' <span class="tag info">suggested</span>':''}<span class="d">${esc(g.d)}</span></span></label>`;
  }).join('');

  const ready = ans.cap && ans.auto;
  const isLast = S.applyIndex === S.applySteps.length-1;
  return `
  <h3>Suggested capabilities for this shape of work</h3>
  ${cautions}
  ${suggestList || '<p class="tiny muted">No strong suggestion for this combination &mdash; browse the full toolkit below.</p>'}
  <details style="margin:12px 0"><summary class="tiny" style="cursor:pointer;color:var(--forest)">Browse the full toolkit</summary><div class="toolkit" style="margin-top:10px">${groups}</div></details>
  ${capCard}
  <h3 style="margin-top:20px">How much should it act on its own?</h3>
  <div class="chips">${autoOpts}</div>
  <h3 style="margin-top:20px">Guardrails</h3>
  <div class="checks">${gChecks}</div>
  <div class="field" style="margin-top:18px">
    <label for="metric">Metric that would prove it worked</label>
    <input class="in" id="metric" data-act="apply-metric" value="${esc(ans.metric)}" placeholder="e.g. minutes per case, error rate, cost per item">
  </div>
  <div class="field">
    <label for="dataneed">Data or access this would need</label>
    <textarea class="in" id="dataneed" data-act="apply-data">${esc(ans.data)}</textarea>
  </div>
  <div class="actions">
    <button class="btn sec" data-act="apply-back-profile">&larr; Back</button>
    <button class="btn" data-act="apply-next-step" ${ready?'':'disabled'}>${isLast? 'Build your canvas \u2192' : 'Next step \u2192'}</button>
  </div>`;
}

function viewApplyCanvas(){
  const rows = S.applySteps.map((st,i)=>{
    const a = S.applyAnswers[i] || {};
    return `<div class="sheet">
      <h3>${esc(st.name)}</h3>
      <div class="sub">${esc(S.applyOrg)} &middot; ${esc(S.applyProcess)}</div>
      <div class="grid">
        <div class="cell"><span class="l">Shape of work</span>${a.p&&a.p.shape? esc(SHAPES.find(s=>s.id===a.p.shape).name) : '<span class="blank">not set</span>'}</div>
        <div class="cell"><span class="l">Capability</span>${a.cap? esc(capName(a.cap)) : '<span class="blank">not set</span>'}</div>
        <div class="cell"><span class="l">Autonomy</span>${a.auto? esc(AUTONOMY.find(x=>x.id===a.auto).name) : '<span class="blank">not set</span>'}</div>
        <div class="cell"><span class="l">Metric</span>${a.metric? esc(a.metric) : '<span class="blank">not set</span>'}</div>
        <div class="cell wide"><span class="l">Guardrails</span><ul>${(a.guardrails&&a.guardrails.length)? a.guardrails.map(g=>`<li>${esc(GUARDRAILS.find(x=>x.id===g).name)}</li>`).join('') : '<li class="blank">None selected</li>'}</ul></div>
        <div class="cell wide"><span class="l">Data or access needed</span>${a.data? esc(a.data) : '<span class="blank">not set</span>'}</div>
      </div>
    </div>`;
  }).join('');
  const caps = Object.values(S.applyAnswers).map(a=>a.cap);
  const autos = Object.values(S.applyAnswers).map(a=>a.auto);
  return `
  <div class="stagehead">
    <div class="k muted">Your canvas</div>
    <h2>${esc(S.applyProcess)}</h2>
    <p class="lead">${esc(S.applyOrg)} &mdash; one card per step, ready to bring into a planning conversation.</p>
  </div>
  ${rows}
  ${toolRecsSection(caps, autos)}
  <div class="actions">
    <button class="btn sec" data-act="print-canvas">Print / save this page</button>
    <button class="btn" data-act="restart">Start a new expedition</button>
  </div>`;
}

/* ================= AI & SETTINGS ================= */
function showNudge(text, type="", label="Hint"){
  if(!text) return "";
  return `<div class="nudge ${type}"><div class="ico">${icon("spark","sm")}</div><div><b>${esc(label)}:</b> ${esc(text)}</div></div>`;
}

// Reflect connection state in the fixed ⚙ AI pill.
function updateAIPill(){
  const dot = document.getElementById("aiPillDot");
  if(dot) dot.classList.toggle("on", !!AI.enabled);
  const btn = document.getElementById("aiSettingsBtn");
  if(btn) btn.title = AI.enabled ? ("AI connected · " + AI.model) : "AI not connected (game still works) — click to set up";
}

async function connectAI(){
  const model = document.getElementById("aiModel").value.trim();
  const key = document.getElementById("aiKey").value.trim();
  const status = document.getElementById("aiStatus");
  status.textContent = "Connecting…";
  status.style.color = "var(--ink-3)";
  if(model) AI.model = model;
  if(key) AI.apiKey = key;
  const ok = await AI.init();
  AI.saveSettings();
  updateAIPill();
  if(ok){
    status.textContent = `✓ Connected. Model: ${AI.model}`;
    status.style.color = "var(--forest-2)";
    maybeNudge();
    setTimeout(()=>{ document.getElementById("aiSettings").hidden = true; }, 900);
  } else {
    status.textContent = "✗ Could not connect to Together.ai. Check the model id and key.";
    status.style.color = "var(--marker)";
  }
}

/* ---- Nudges: static hand-written hint always; AI personalizes when connected ---- */
let nudgeToken = 0; // guards against a stale async response overwriting a newer screen

// What's missing / what to look at, with no AI needed.
function staticNudge(){
  if(S.mode==='guided' && S.stage==='step'){
    const step = curStep();
    if(S.stepPhase==='profile'){
      const missing = DIMS.filter(d=>!S.curProfile[d.id]);
      if(missing.length) return {text:`To continue, describe this step on: ${missing.map(d=>d.label.toLowerCase()).join(', ')}. Re-read the pain — “${step.pain}” — and answer as you actually see it.`, type:''};
      return {text:`All four set. Before you compare, ask: does the pain (“${step.pain}”) really come from the shape you picked?`, type:''};
    }
    if(S.stepPhase==='match'){
      if(!S.curCap && !S.curAuto) return {text:`Judge by the shape of the work, not the brand. What is the person mainly doing here — reading, sorting, writing, checking?`, type:''};
      if(!S.curCap) return {text:`Pick the capability family that matches the work, then the specific capability inside it.`, type:''};
      if(!S.curAuto) return {text:`Now set autonomy. The higher the stakes, the more a person should stay in the loop.`, type:'hint-next'};
      return {text:`Both set — reveal the expert take when you're ready.`, type:'hint-next'};
    }
  }
  if(S.mode==='apply' && S.stage==='apply-walk'){
    const ans = S.applyAnswers[S.applyIndex] || {p:{}};
    if(S.applyPhase==='profile'){
      const missing = DIMS.filter(d=>!ans.p[d.id]);
      if(missing.length) return {text:`Describe this step on: ${missing.map(d=>d.label.toLowerCase()).join(', ')}. The suggestions on the next screen come straight from these answers.`, type:''};
      return {text:`All four set — see what capabilities this shape of work suggests.`, type:'hint-next'};
    }
    if(S.applyPhase==='detail'){
      if(!ans.cap) return {text:`Choose a capability — start from the suggestions, which are matched to how you profiled the step.`, type:''};
      if(!ans.auto) return {text:`Set how much it should act on its own, then record a metric that would prove it worked.`, type:'hint-next'};
    }
  }
  return null;
}

// Inject the static hint synchronously; if AI is connected, upgrade it async.
function maybeNudge(){
  const slot = document.getElementById('nudgeSlot');
  if(!slot) return;
  const base = staticNudge();
  slot.innerHTML = base ? showNudge(base.text, base.type) : '';

  if(!AI.enabled) return;
  const myToken = ++nudgeToken;

  if(S.mode==='guided' && S.stage==='step' && (S.stepPhase==='profile' || S.stepPhase==='match')){
    const step = curStep();
    AI.nudge(step.name, step.notes, step.pain).then(text=>{
      if(text && myToken===nudgeToken){ slot.innerHTML = showNudge(text, 'hint-ai', 'AI nudge'); }
    });
  } else if(S.mode==='apply' && S.stage==='apply-walk' && S.applyPhase==='profile'){
    const st = S.applySteps[S.applyIndex];
    if(st && st.name){
      AI.nudge(st.name, st.notes||'', '').then(text=>{
        if(text && myToken===nudgeToken){ slot.innerHTML = showNudge(text, 'hint-ai', 'AI nudge'); }
      });
    }
  }
}

/* ================= ACTIONS ================= */
function resetAll(){
  Object.assign(S, {
    mode:null, stage:'hero', score:0, maxScore:0,
    cat:{terrain:{s:0,m:0}, profile:{s:0,m:0}, match:{s:0,m:0}, reality:{s:0,m:0}, canvas:{s:0,m:0}},
    eventsShown:{}, modal:null,
    viewFn:null, shortlist:[], terrainRevealed:false,
    procId:null, stepIndex:0, stepPhase:'brief', stepAnswers:{}, curProfile:{}, curCap:null, curAuto:null, marked:[],
    realityRatings:{}, realityDone:false, headlineStep:null,
    canvasGuardrails:[], canvasScored:false, canvasRevealed:false,
    applyOrg:'', applyProcess:'', applySteps:[], applyStepsError:false, applyIndex:0, applyAnswers:{}, applyPhase:'profile',
  });
}

function startStepFor(stepId){
  S.stepPhase='brief'; S.curProfile={}; S.curCap=null; S.curAuto=null;
  if(!S.stepAnswers[stepId]) S.stepAnswers[stepId] = {};
}

function handleAction(ds, target){
  const act = ds.act;
  switch(act){
    case 'restart': resetAll(); render(); return;

    case 'ai-settings': {
      const m = document.getElementById('aiModel'); if(m) m.value = AI.model || '';
      const k = document.getElementById('aiKey'); if(k) k.value = '';
      const status = document.getElementById('aiStatus');
      if(status){
        status.textContent = AI.enabled ? `✓ Connected. Model: ${AI.model}` : 'Not connected. Nudges use built-in hints until you connect.';
        status.style.color = AI.enabled ? 'var(--forest-2)' : 'var(--ink-3)';
      }
      document.getElementById('aiSettings').hidden = false;
      return;
    }
    case 'ai-cancel': document.getElementById('aiSettings').hidden = true; return;
    case 'ai-connect': connectAI(); return;
    case 'start-guided': S.mode='guided'; S.stage='terrain-intro'; render(); return;
    case 'start-apply': S.mode='apply'; S.stage='apply-setup'; render(); return;

    case 'goto-terrain-map': S.stage='terrain-map'; render(); return;
    case 'view-fn': S.viewFn = ds.fn; render(); return;
    case 'toggle-shortlist': {
      const pid = ds.proc;
      const i = S.shortlist.indexOf(pid);
      if(i>=0) S.shortlist.splice(i,1);
      else if(S.shortlist.length<3) S.shortlist.push(pid);
      render(); return;
    }
    case 'goto-terrain-reveal': S.stage='terrain-reveal'; render(); return;
    case 'to-pick-expedition':
      maybeTriggerEvent('afterTerrain', ()=>{ S.stage='pick-expedition'; render(); });
      return;
    case 'pick-expedition': {
      S.procId = ds.proc; S.stage='step'; S.stepIndex=0;
      startStepFor(curStep().id);
      render(); return;
    }

    case 'step-to-profile': S.stepPhase='profile'; render(); return;
    case 'pick-dim': {
      const dim = ds.dim, val = ds.val;
      if(ds.group==='apply'){ S.applyAnswers[S.applyIndex].p[dim] = val; }
      else { S.curProfile[dim] = val; }
      render(); return;
    }
    case 'submit-profile': {
      const step = curStep();
      const res = scoreProfile(step, S.curProfile);
      score('profile', res.total, 8);
      S.stepAnswers[step.id].p = {...S.curProfile};
      S.stepAnswers[step.id].profileScored = res;
      S.stepPhase='profile-reveal'; render(); return;
    }
    case 'step-to-match': S.stepPhase='match'; render(); return;
    case 'pick-cap': S.curCap = ds.cap; render(); return;
    case 'pick-auto': S.curAuto = ds.val; render(); return;
    case 'submit-match': {
      const step = curStep();
      const m = scoreMatch(step, S.curCap, S.curAuto);
      score('match', m.total, 5);
      S.stepAnswers[step.id].cap = S.curCap;
      S.stepAnswers[step.id].auto = S.curAuto;
      S.stepAnswers[step.id].matchScored = m;
      S.stepPhase='match-reveal'; render(); return;
    }
    case 'toggle-mark': {
      const step = curStep();
      const i = S.marked.indexOf(step.id);
      if(i>=0) S.marked.splice(i,1); else S.marked.push(step.id);
      render(); return;
    }
    case 'next-step': {
      const proc = curProcess();
      const isLast = S.stepIndex === proc.steps.length-1;
      const doAdvance = ()=>{
        if(isLast){
          maybeTriggerEvent('beforeReality', ()=>{ S.stage='reality'; render(); });
        } else {
          S.stepIndex += 1;
          startStepFor(curStep().id);
          render();
        }
      };
      // mid-trail events keyed to step index about to be left
      if(S.stepIndex===1 && !isLast){ maybeTriggerEvent('afterStep2', doAdvance); return; }
      if(S.stepIndex===3 && !isLast){ maybeTriggerEvent('afterStep4', doAdvance); return; }
      doAdvance();
      return;
    }

    case 'rate': {
      const stepId = ds.step, key = ds.key, val = ds.val;
      const r = S.realityRatings[stepId] || (S.realityRatings[stepId] = {});
      r[key] = val; render(); return;
    }
    case 'plot-portfolio': {
      const proc = curProcess();
      const steps = proc.steps.filter(st=>S.marked.includes(st.id));
      steps.forEach(st=>{
        const r = S.realityRatings[st.id];
        const feas = feasibilityLevel({data:LEVEL_IDX[r.data]+1, risk:LEVEL_IDX[r.risk]+1, change:LEVEL_IDX[r.change]+1, integ:LEVEL_IDX[r.integ]+1});
        const res = scoreReality(st, feas, r.value);
        score('reality', res.total, 4);
      });
      maybeTriggerEvent('beforeCanvas', ()=>{ S.realityDone=true; render(); });
      return;
    }
    case 'pick-headline': {
      S.headlineStep = ds.step; S.stage='canvas'; render(); return;
    }

    case 'toggle-guardrail': {
      const g = ds.g; const i = S.canvasGuardrails.indexOf(g);
      if(i>=0) S.canvasGuardrails.splice(i,1); else S.canvasGuardrails.push(g);
      render(); return;
    }
    case 'print-canvas': window.print(); return;
    case 'reveal-canvas': {
      if(!S.canvasScored){
        const step = curProcess().steps.find(s=>s.id===S.headlineStep);
        const correct = step.guardrails.filter(g=>S.canvasGuardrails.includes(g)).length;
        score('canvas', Math.min(correct,3), 3);
        S.canvasScored = true;
      }
      S.canvasRevealed = true; render(); return;
    }
    case 'to-debrief': maybeTriggerEvent('beforeDebrief', ()=>{ S.stage='debrief'; render(); }); return;

    case 'event-choose': {
      const idx = parseInt(ds.idx,10);
      const ev = EVENTS[S.modal.eventId];
      const o = ev.opts[idx];
      score('match', o.s, 2); // small trail-event points folded into match-style bucket
      S.modal.chosenIdx = idx; S.modal.phase = 'feedback';
      render(); return;
    }
    case 'event-continue': {
      const cb = S.modal.cb;
      S.modal = null;
      cb();
      return;
    }

    /* ---- apply mode ---- */
    case 'apply-to-steps': {
      S.applyOrg = document.getElementById('org').value.trim();
      S.applyProcess = document.getElementById('proc').value.trim();
      if(S.applySteps.length===0) S.applySteps = [{name:'',notes:''},{name:'',notes:''},{name:'',notes:''}];
      S.stage='apply-steps'; render(); return;
    }
    case 'apply-step-add': S.applySteps.push({name:'',notes:''}); render(); return;
    case 'apply-step-remove': S.applySteps.splice(parseInt(ds.idx,10),1); render(); return;
    case 'apply-to-walk': {
      S.applySteps = S.applySteps.filter(s=>s.name.trim());
      if(S.applySteps.length < 2){ S.applyStepsError = true; render(); return; }
      S.applyStepsError = false;
      S.applyIndex=0; S.applyPhase='profile'; S.stage='apply-walk'; render(); return;
    }
    case 'apply-submit-profile': S.applyPhase='detail'; render(); return;
    case 'apply-back-profile': S.applyPhase='profile'; render(); return;
    case 'apply-pick-cap': {
      const a = S.applyAnswers[S.applyIndex]; a.cap = ds.cap; render(); return;
    }
    case 'apply-pick-auto': {
      const a = S.applyAnswers[S.applyIndex]; a.auto = ds.val; render(); return;
    }
    case 'apply-toggle-guardrail': {
      const a = S.applyAnswers[S.applyIndex]; const g = ds.g;
      const i = a.guardrails.indexOf(g);
      if(i>=0) a.guardrails.splice(i,1); else a.guardrails.push(g);
      render(); return;
    }
    case 'apply-next-step': {
      const isLast = S.applyIndex === S.applySteps.length-1;
      if(isLast){ S.stage='apply-canvas'; render(); }
      else { S.applyIndex+=1; S.applyPhase='profile'; render(); }
      return;
    }
    default: return;
  }
}

/* text inputs (not click-based) */
function bindInputs(root){
  root.addEventListener('input', e=>{
    const t = e.target;
    if(t.id==='org' || t.id==='proc') return; // these are read directly on submit
    const ds = t.dataset;
    if(!ds || !ds.act) return;
    if(ds.act==='apply-step-name'){ S.applySteps[ds.idx].name = t.value; return; }
    if(ds.act==='apply-step-notes'){ S.applySteps[ds.idx].notes = t.value; return; }
    if(ds.act==='apply-metric'){ S.applyAnswers[S.applyIndex].metric = t.value; return; }
    if(ds.act==='apply-data'){ S.applyAnswers[S.applyIndex].data = t.value; return; }
  });
}

/* ================= INIT ================= */
function boot(){
  const app = document.getElementById('app');
  app.addEventListener('click', e=>{
    const t = e.target.closest('[data-act]');
    if(!t) return;
    handleAction(t.dataset, t);
  });
  bindInputs(app);

  document.getElementById('modal').addEventListener('click', e=>{
    if(e.target.id==='modal') return; // no backdrop-close: force a choice
    const t = e.target.closest('[data-act]');
    if(!t) return;
    handleAction(t.dataset, t);
  });

  // AI settings button (lives outside #app so render() can't wipe it)
  const aiBtn = document.getElementById('aiSettingsBtn');
  if(aiBtn) aiBtn.addEventListener('click', ()=> handleAction({act:'ai-settings'}, aiBtn));

  const aiModal = document.getElementById('aiSettings');
  if(aiModal){
    aiModal.addEventListener('click', e=>{
      if(e.target.id==='aiSettings'){ aiModal.hidden = true; return; } // backdrop closes settings
      const t = e.target.closest('[data-act]');
      if(!t) return;
      handleAction(t.dataset, t);
    });
  }

  render();

  // Connect to Together.ai in the background; refresh nudges + pill on success.
  AI.loadSettings();
  AI.init().then(ok=>{ updateAIPill(); if(ok) maybeNudge(); });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

})();

