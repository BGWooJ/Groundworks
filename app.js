(function(){
'use strict';

/* =====================================================================
   JOURNAL: marks, walks and your own maps, kept in this browser.
   ===================================================================== */
const JKEY = 'gw_journal_v4';
const OLD_KEYS = ['gw_journal_v1'];
function blankJournal(){ return {marks:{}, flagships:[], walks:[], maps:{}}; }
function loadJournal(){
  try{ const j = JSON.parse(localStorage.getItem(JKEY) || 'null'); return j ? Object.assign(blankJournal(), j) : blankJournal(); }
  catch(e){ return blankJournal(); }
}
function saveJournal(){ try{ localStorage.setItem(JKEY, JSON.stringify(J)); }catch(e){} }
let J = loadJournal();
function savedGuide(){ try{ return localStorage.getItem('gw_guide') || 'stall'; }catch(e){ return 'stall'; } }

/* =====================================================================
   STATE
   ===================================================================== */
function fresh(){
  return {
    mode:null, view:'home', guide:savedGuide(),
    shortlist:[], viewFn:null, procId:null,
    own:null, steps:[], ans:{}, cur:0, q:0,
    notes:[], dug:{}, compl:{fired:[], answers:[]}, modal:null,
    whatif:{double:false, digital:false, devs:false},
    includeDesc:false, confirmClear:false, setupError:false,
  };
}
let S = fresh();

/* =====================================================================
   HELPERS
   ===================================================================== */
function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function emph(t){
  const re = /\$?\d+(?:[.,]\d+)*(?:%| percent)?/g; let out = '', last = 0, m; t = String(t||'');
  while((m = re.exec(t))){ out += esc(t.slice(last, m.index)) + '<b class="num">' + esc(m[0]) + '</b>'; last = m.index + m[0].length; }
  return out + esc(t.slice(last));
}
function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }
function fill(s, v){ return String(s||'').replace(/\{(\w+)\}/g, (m,k)=> v && v[k]!=null ? v[k] : m); }
const lineMemo = {};
function line(key, list, vars){ if(!lineMemo[key]) lineMemo[key] = list[Math.floor(Math.random()*list.length)]; return fill(lineMemo[key], vars); }
function optName(list, id){ const o = (list||[]).find(x=>x.id===id); return o ? o.name : ''; }
function capName(id){ return CAPS[id] ? CAPS[id].name : ''; }
function whoName(who){ let w = String(who||'').trim().replace(/^the\s+/i,'').replace(/^\d+\s+/,''); return w.charAt(0).toLowerCase()+w.slice(1); }
const COLLECTIVE = ['team','desk','finance','services','committee','office','unit'];
function teamOf(who){
  const w = whoName(who), last = w.split(' ').pop();
  if(/ and /.test(w)) return 'the ' + w;
  if(COLLECTIVE.includes(last)) return 'the ' + w + (last==='team' ? '' : ' team');
  if(/[^s]s$/.test(last)) return 'the ' + w;
  return 'the ' + w + '\u2019s team';
}
function splitVolume(v){
  const m = String(v||'').match(/^((?:about|around|~)\s+)?(\d[\d,.]*%?)\s+(.*)$/i);
  return m ? {pre:(m[1]||'').trim(), big:m[2], rest:m[3]} : {pre:'', big:'', rest:v||''};
}
function findProcessMeta(id){ for(const fn of FUNCTIONS){ const p = fn.processes.find(x=>x.id===id); if(p) return {fn, proc:p}; } return null; }
function heatOf(fn){ return fn.signals.reduce((a,s)=> a + (s.s==='strong'?2:(s.s==='medium'?1:0)), 0); }
const LV = {low:0, mid:1, high:2};
function levelName(id){ return ({low:'Low', mid:'Medium', high:'High'})[id] || ''; }
function plural(n, one, many){ return n===1 ? one : (many || one+'s'); }

/* =====================================================================
   QUESTIONS: one read per step, ten short questions.
   The first seven have a field answer on Meridian steps; the last three
   are about your organisation and only move the tool heading.
   ===================================================================== */
const QUESTIONS = [
  {k:'shape',  label:'Kind of work',       q:'What is the person actually doing?',            opts:()=>SHAPES,
   field:st=>st.expert.shape, alts:st=>st.expert.shapeAlt||[]},
  {k:'input',  label:'Inputs',             q:'What does the work start from?',                opts:()=>INPUTS,
   field:st=>st.expert.input, alts:st=>st.expert.inputAlt||[]},
  {k:'rep',    label:'Volume',             q:'How often, and how similar each time?',         opts:()=>REPS,
   field:st=>st.expert.rep, alts:st=>st.expert.repAlt||[]},
  {k:'stakes', label:'Stakes',             q:'How much judgment, and what does an error cost?', opts:()=>STAKES,
   field:st=>st.expert.stakes, alts:st=>st.expert.stakesAlt||[]},
  {k:'band',   label:'LLM fit',            q:'Is this an LLM\u2019s kind of work?',            opts:()=>BANDS,
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
const SCORED = QUESTIONS.filter(q=>q.field);

function curStep(){ return S.steps[S.cur]; }
function ansOf(st){ return S.ans[st.id] || (S.ans[st.id] = {}); }
function answered(a){ return QUESTIONS.every(q=>a[q.k]); }
function stepDone(st){ const a = S.ans[st.id]; if(!a) return false; return S.mode==='guided' ? !!a.revealed : answered(a); }
function nextUnanswered(a, from){
  for(let i=from+1;i<QUESTIONS.length;i++) if(!a[QUESTIONS[i].k]) return i;
  for(let i=0;i<QUESTIONS.length;i++) if(!a[QUESTIONS[i].k]) return i;
  return -1;
}
function markOf(q, st, val){
  if(!q.field || S.mode!=='guided') return null;
  const f = q.field(st);
  if(val===f) return 'match';
  if(q.k==='cap') return st.fit.best.includes(val) ? 'match' : (st.fit.ok.includes(val) ? 'near' : 'miss');
  return (q.alts(st)||[]).includes(val) ? 'near' : 'miss';
}

/* Answers as the engine sees them, with what-if switches applied in your own maps. */
function effective(st){
  const a = Object.assign({}, S.ans[st.id] || {});
  a.nums = a.nums ? Object.assign({}, a.nums) : null;
  if(S.mode==='own'){
    if(S.whatif.double){ if(a.nums && a.nums.count) a.nums.count = String(parseFloat(a.nums.count)*2); if(a.rep==='low') a.rep = 'mid'; else if(a.rep==='mid') a.rep = 'high'; }
    if(S.whatif.digital){ if(a.input==='media' || a.input==='tacit') a.input = 'text'; if(a.where==='paper') a.where = 'system'; }
    if(S.whatif.devs){ if(a.builder==='unsure' || a.builder==='team') a.builder = 'dev'; }
  }
  return a;
}
function stepEval(st){
  const a = effective(st), nums = numbersOf(a.nums);
  if(S.mode==='guided'){
    return {a, nums, value:st.expertValue, feas:st.expertFeas, verdict:fieldVerdict(st), tool:scoreTools(a)};
  }
  const value = valueOf(a, nums), feas = feasOf(a);
  return {a, nums, value, feas, verdict:verdictOf(a, value, feas), tool:scoreTools(a)};
}
function headingFor(steps){
  const res = steps.map((st)=>({index:S.steps.indexOf(st), tool:stepDone(st) ? stepEval(st).tool : null})).filter(x=>x.tool);
  return processHeading(res);
}
function readSteps(){ return S.steps.filter(stepDone); }
function nextOpenIndex(){ const i = S.steps.findIndex(st=>!stepDone(st)); return i<0 ? null : i; }

/* =====================================================================
   RENDER
   ===================================================================== */
let lastKey = '';
function screenKey(){ return [S.mode, S.view, S.cur].join('|'); }
function render(){
  const key = screenKey(), changed = key!==lastKey;
  const go = ()=>{ draw(changed); };
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(changed && lastKey && document.startViewTransition && !reduce){ lastKey = key; document.startViewTransition(go); }
  else { lastKey = key; go(); }
}
function draw(changed){
  const app = document.getElementById('app');
  const sig = changed ? null : focusSig();
  let html;
  switch(S.view){
    case 'home': html = viewHome(); break;
    case 'own-setup': html = shell(viewOwnSetup()); break;
    case 'terrain': html = shell(viewTerrain()); break;
    case 'reveal': html = shell(viewReveal()); break;
    case 'pick': html = shell(viewPick()); break;
    case 'map': html = shell(viewMap()); break;
    case 'step': html = shell(viewStep()); break;
    case 'finished': html = shell(viewFinished()); break;
    case 'export': html = shell(viewExport()); break;
  }
  app.innerHTML = html;
  if(changed){
    window.scrollTo({top:0});
    const h = app.querySelector('h1'); if(h && S.view!=='home'){ h.setAttribute('tabindex','-1'); h.focus({preventScroll:true}); }
  } else if(sig){ const el = app.querySelector(sig); if(el) el.focus({preventScroll:true}); }
  renderModal();
  afterGuide();
}
function focusSig(){
  const a = document.activeElement; if(!a || !a.dataset || !a.dataset.act) return null;
  return ['act','k','v','idx','fn','proc','step','w','id'].filter(k=>a.dataset[k]!=null).map(k=>`[data-${k}="${CSS.escape(a.dataset[k])}"]`).join('');
}

const LOGO = `<svg class="brandmark" width="26" height="26" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M18.5 9.5 L12.6 12.6 L9.5 18.5 L15.4 15.4 Z" fill="var(--brass-glow)"/></svg>`;
function topbar(){
  const name = S.mode==='own' ? (S.own && S.own.process) : (S.procId ? getExpedition(S.procId).name : 'Meridian Reserve Bank');
  let prog = '';
  if(S.steps.length && ['map','step','finished','export'].includes(S.view)){
    const segs = S.steps.map((st,i)=>`<i class="${stepDone(st)?'done':(S.view==='step' && i===S.cur?'cur':'')}"></i>`).join('');
    const n = readSteps().length;
    prog = `<span class="prog"><span class="segs">${segs}</span>${n===S.steps.length ? `All ${n} steps read` : `${n} of ${S.steps.length} steps read`}</span>`;
  }
  const guideBtn = S.view==='step' ? `<button class="tbtn" data-act="guide-toggle" aria-pressed="${G.open}">${icon('compass')}Field guide</button>` : '';
  return `<header class="topbar">
    <div class="tb-l"><button class="brand" data-act="home" aria-label="Groundwork, back to the start">${LOGO}<span>Groundwork</span></button>${name?`<span class="tb-sep"></span><span class="tb-name">${esc(name)}</span>`:''}</div>
    <div class="tb-r">${prog}${guideBtn}</div>
  </header>`;
}
function shell(inner){ return `${topbar()}<main class="main" id="main">${inner}</main>`; }

/* ---------- home ---------- */
function viewHome(){
  const marks = MARKS.map(m=>{
    const on = !!J.marks[m.id];
    const prog = !on && m.id==='flagships' && J.flagships.length ? ` (${J.flagships.length} of 4)` : '';
    return `<li class="mk ${on?'on':''}"><span class="mki">${icon(on?m.icon:'lock')}</span><span><b>${esc(m.name)}</b><span>${esc(m.d)}${prog}</span></span></li>`;
  }).join('');
  const maps = Object.values(J.maps).sort((a,b)=>(b.updated||0)-(a.updated||0));
  const mapList = maps.length ? `<ul class="maplist">${maps.map(m=>{
    const done = m.steps.filter(st=>{ const a = (m.ans||{})[st.id]; return a && QUESTIONS.every(q=>a[q.k]); }).length;
    return `<li><div><b>${esc(m.process||'Untitled process')}</b><span>${esc(m.org||'')}${m.org?'. ':''}${done} of ${m.steps.length} steps read</span></div><button class="btn secondary small" data-act="open-map" data-id="${esc(m.id)}">Open</button></li>`;
  }).join('')}</ul>` : `<p class="muted">None yet. Maps of your own processes are saved here as you work.</p>`;
  const walks = J.walks.slice(0,4).map(w=>`<li><b>${esc(w.proc)}</b><span>${esc(w.summary)}</span></li>`).join('');
  const any = Object.keys(J.marks).length || J.walks.length || maps.length;
  const clear = S.confirmClear
    ? `<div class="confirm" role="alert"><p>This removes your marks, walks and saved maps from this browser. It cannot be undone.</p><div class="row"><button class="btn danger small" data-act="clear-yes">${icon('trash')}Clear everything</button><button class="btn ghost small" data-act="clear-no">Keep them</button></div></div>`
    : (any ? `<button class="linkbtn" data-act="clear-ask">${icon('trash')}Clear my results</button>` : '');
  return `<div class="hero">
    <svg class="hero-map" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g class="contours" fill="none" stroke="currentColor">
        <path d="M-40,120 C140,70 300,170 520,120 S900,40 1240,120"/><path d="M-40,180 C160,120 330,230 560,180 S930,110 1240,190"/>
        <path d="M-40,250 C180,200 360,300 600,250 S960,180 1240,260"/><path d="M-40,330 C200,290 400,380 640,330 S990,260 1240,340"/>
        <path d="M-40,410 C220,370 430,450 680,410 S1010,350 1240,420"/><path d="M-40,480 C240,450 460,520 700,480 S1030,430 1240,500"/>
        <ellipse cx="930" cy="190" rx="120" ry="58"/><ellipse cx="930" cy="190" rx="74" ry="34"/><ellipse cx="930" cy="190" rx="32" ry="14"/>
      </g>
      <defs><mask id="trailmask" maskUnits="userSpaceOnUse"><path class="trailmask" d="M640,470 C700,452 730,410 770,380 S830,330 860,290 S900,214 930,190" pathLength="1"/></mask></defs>
      <path class="trailpath" mask="url(#trailmask)" d="M640,470 C700,452 730,410 770,380 S830,330 860,290 S900,214 930,190"/>
      <g class="wpts"><circle cx="640" cy="470" r="7"/><circle cx="770" cy="380" r="7"/><circle cx="860" cy="290" r="7"/><circle cx="930" cy="190" r="10" class="end"/></g>
    </svg>
    <div class="hero-copy">
      <h1>Groundwork</h1>
      <p class="hero-line">Break a process into its steps, and find where an LLM earns its keep, where a person must stay in charge, and where something simpler wins.</p>
      <div class="hero-actions">
        <button class="btn brass big" data-act="start-guided">Walk a Meridian process</button>
        <button class="btn outline big" data-act="start-own">Map your own process</button>
      </div>
      <p class="hero-note">The Meridian walk teaches the method on a fictional reserve bank, with a field view to compare against. Your own map stays in this browser.</p>
    </div>
  </div>
  <section class="journal" aria-labelledby="jh">
    <div class="jhead"><h2 id="jh">Field journal</h2>${clear}</div>
    <div class="jgrid">
      <div><h3>Your maps</h3>${mapList}${walks?`<h3 class="mt">Recent walks</h3><ul class="walks">${walks}</ul>`:''}</div>
      <div><h3>Marks</h3><ul class="marks">${marks}</ul></div>
    </div>
  </section>`;
}

/* ---------- own: setup ---------- */
function viewOwnSetup(){
  const o = S.own;
  const rows = o.steps.map((st,i)=>`<div class="steprow">
    <span class="num">${i+1}</span>
    <input class="in" data-act="own-step-name" data-idx="${i}" value="${esc(st.name)}" placeholder="Step name, for example, triage the inbox" aria-label="Step ${i+1} name">
    <input class="in" data-act="own-step-notes" data-idx="${i}" value="${esc(st.notes)}" placeholder="What actually happens, in a sentence" aria-label="Step ${i+1} description">
    <button class="iconbtn" data-act="own-step-remove" data-idx="${i}" aria-label="Remove step ${i+1}">${icon('close')}</button>
  </div>`).join('');
  return `<div class="narrow">
    <header class="scene"><h1>Name the process, then list its steps</h1>
    <p class="lede">One process, the way it actually runs, start to finish. Three to eight steps is normal. You will read each one on the map.</p></header>
    <div class="form">
      <div class="field"><label for="org">Organisation or team</label><input class="in" id="org" data-act="own-org" value="${esc(o.org)}" placeholder="For example, Benefits organization"></div>
      <div class="field"><label for="proc">The process</label><input class="in" id="proc" data-act="own-proc" value="${esc(o.process)}" placeholder="For example, benefits inquiries and enrolment"><span class="hint">Something that happens many times, not once a year.</span></div>
    </div>
    <h2 class="h3 mt">Steps</h2>
    <div class="steprows">${rows}</div>
    ${S.setupError?`<p class="caution" role="alert">Name the process and at least two steps to start mapping.</p>`:''}
    <div class="actions"><button class="btn ghost" data-act="own-step-add">${icon('plus')}Add a step</button><button class="btn primary" data-act="own-start">Start mapping</button></div>
  </div>`;
}

/* ---------- Meridian: terrain, reveal, pick ---------- */
function viewTerrain(){
  const slots = [0,1,2].map(i=>{
    const pid = S.shortlist[i];
    if(!pid) return `<li class="slot empty"><span class="sf">${icon('flag')}</span><span>Open slot</span></li>`;
    const m = findProcessMeta(pid);
    return `<li class="slot"><span class="sf">${icon('flag')}</span><span><b>${esc(m.proc.name)}</b><span>${esc(m.fn.name)}</span></span><button class="iconbtn" data-act="toggle-shortlist" data-proc="${pid}" aria-label="Remove ${esc(m.proc.name)}">${icon('close')}</button></li>`;
  }).join('');
  const station = f=>{
    const on = S.viewFn===f.id, flags = f.processes.filter(p=>S.shortlist.includes(p.id)).length;
    return `<button class="station heat-${heatOf(f)} ${on?'on':''}" data-act="view-fn" data-fn="${f.id}" aria-pressed="${on}">
      <span class="halo" aria-hidden="true"></span><span class="sicon">${icon(f.icon)}</span><span class="sname">${esc(f.name)}</span>
      <span class="scount">${f.processes.length} processes</span>${flags?`<span class="sflag">${icon('flag')}${flags}</span>`:''}</button>`;
  };
  const bands = MAP_GROUPS.map(g=>`<section class="band"><h2 class="bh">${esc(g.label)}<span>${esc(g.d)}</span></h2><div class="stations">${FUNCTIONS.filter(f=>f.group===g.id).map(station).join('')}</div></section>`).join('');
  let drawer = `<div class="drawer empty"><p>${icon('compass')} Open any part of the Bank to read its signals. The glow marks where the evidence is strongest.</p></div>`;
  if(S.viewFn){
    const fn = FUNCTIONS.find(f=>f.id===S.viewFn), full = S.shortlist.length>=3;
    drawer = `<section class="drawer"><header class="dhead"><span class="dill" aria-hidden="true">${(window.ILLUS && ILLUS.dept[fn.id]) || ''}</span><div><h2 class="h3">${esc(fn.name)}</h2><p>${emph(fn.brief)}</p></div></header>
      <div class="dgrid"><div><h3 class="h4">Signals</h3><ul class="signals">${fn.signals.map(s=>`<li class="sig-${s.s}"><span class="sig"></span><span>${emph(s.t)}</span></li>`).join('')}</ul></div>
      <div><h3 class="h4">Processes</h3>${fn.processes.map(p=>{ const on = S.shortlist.includes(p.id);
        return `<div class="proc ${on?'on':''}"><div><b>${esc(p.name)}</b><span>${esc(p.d)}</span></div><button class="btn ${on?'flagged':'secondary'} small" data-act="toggle-shortlist" data-proc="${p.id}" aria-pressed="${on}" ${!on&&full?'disabled':''}>${icon('flag')}${on?'Shortlisted':'Shortlist'}</button></div>`; }).join('')}</div></div></section>`;
  }
  return `<header class="scene"><h1>Where does the pain live?</h1><p class="lede">Open each part of Meridian Reserve Bank and read its signals. Shortlist up to three processes worth a closer look.</p></header>
  <div class="tray"><span class="trayl">Your shortlist</span><ul class="slots">${slots}</ul></div>
  <div class="survey">${bands}</div>${drawer}
  <div class="actions sticky"><span class="count">${S.shortlist.length} of 3 shortlisted</span><button class="btn primary" data-act="to-reveal" ${S.shortlist.length?'':'disabled'}>Compare with the full survey</button></div>`;
}
function heatBar(r){ return `<span class="heatbar" aria-label="Hotspot rating ${r} of 5">${[1,2,3,4,5].map(i=>`<i class="${i<=r?'on':''}"></i>`).join('')}</span>`; }
function viewReveal(){
  const all = []; FUNCTIONS.forEach(fn=>fn.processes.forEach(p=>all.push({fn, ...p}))); all.sort((a,b)=>b.rating-a.rating);
  const top = all.slice(0,6).map(p=>p.id), hits = S.shortlist.filter(id=>top.includes(id)).length;
  const lineTxt = hits===S.shortlist.length ? 'Every pick is among the strongest hotspots in the Bank.' : (hits ? `${hits} of your ${S.shortlist.length} picks are among the six strongest hotspots.` : 'The strongest hotspots were elsewhere. Your picks are still worth walking.');
  const rows = all.map((p,i)=>{ const mine = S.shortlist.includes(p.id);
    return `<li class="${mine?'mine':''}" style="--i:${i}">${heatBar(p.rating)}<div class="lw"><b>${esc(p.name)}</b> <span class="lfn">${esc(p.fn.name)}</span>${mine?` <span class="you">${icon('flag')}Your pick</span>`:''}${mine?`<p>${esc(p.why)}</p>`:`<details><summary>Why</summary><p>${esc(p.why)}</p></details>`}</div></li>`; }).join('');
  return `<header class="scene"><h1>The full survey</h1><p class="lede">Every process, ranked by how strong a hotspot it is: volume, repetition, a pain you can measure, and data already captured.</p></header>
  <p class="callout">${esc(lineTxt)}</p>
  <ol class="ladder">${rows}</ol>
  <div class="actions"><button class="btn primary" data-act="to-pick">Choose the process to walk</button></div>`;
}
function viewPick(){
  return `<header class="scene"><h1>Pick one to walk</h1><p class="lede">One process, every step. You will read each step, then see how the field reads it.</p></header>
  <div class="routes">${S.shortlist.map(pid=>{ const e = getExpedition(pid);
    return `<button class="routecard" data-act="pick-proc" data-proc="${pid}"><span class="rill" aria-hidden="true">${ILLUS.dept[e.fnId]||''}</span><span class="rfn">${icon(e.fnId)} ${esc(e.fn)}</span><span class="rn">${esc(e.name)}</span><span class="rmeta">${heatBar(e.rating)}<span>${e.steps.length} steps</span></span><span class="rd">${esc(e.intro)}</span><span class="rgo">Walk this process</span></button>`; }).join('')}</div>`;
}

/* ---------- the map ---------- */
function chip(band, small){ return band ? `<span class="chip b-${band} ${small?'sm':''}">${esc(bandName(band))}</span>` : ''; }
function volLine(st){
  if(S.mode==='guided'){ const v = splitVolume(st.volume); return `<div class="vol">${v.big?`<b>${esc(v.big)}</b>`:''}<span>${esc(v.big?v.rest:st.volume)}</span></div>`; }
  const n = numbersOf((S.ans[st.id]||{}).nums);
  return n ? `<div class="vol"><b>${Math.round(n.perMonth).toLocaleString()}</b><span>a month, about ${round(n.total)} hours</span></div>` : `<div class="vol"><span class="muted">Numbers not given</span></div>`;
}
function stepCard(st, i, opts){
  const done = stepDone(st), next = nextOpenIndex();
  const isCur = !done && i===next;
  const canOpen = S.mode==='own' || done || isCur;
  const e = done ? stepEval(st) : null;
  let body = `<h3 class="ct">${esc(st.name)}</h3>${volLine(st)}`;
  if(done){
    body = `<span class="cill" aria-hidden="true">${ILLUS.shape[e.a.shape]||''}</span>` + body + chip(e.a.band);
    if(opts && opts.final){ const v = VERDICTS[e.verdict]; body += `<p class="cverdict v-${v.tone}">${S.mode==='guided'?'<span class="muted">Field: </span>':''}${esc(v.name)}</p>`; }
    if(e.tool) body += `<span class="points">${icon('arrow')}Points to <b>${esc(destOf(e.tool.winner).name)}</b></span>`;
  } else if(isCur){
    body += `${S.mode==='guided'?`<p class="cpain">${emph(st.pain)}</p>`:''}<span class="cgo">${startedReading(st) ? 'Continue reading' : 'Read this step'}</span>`;
  } else body += `<span class="muted cnr">Not read yet</span>`;
  const node = done ? `<span class="node done">${icon('check')}</span>` : (isCur ? `<span class="node cur">${i+1}</span>` : `<span class="node">${i+1}</span>`);
  const cls = done ? 'done' : (isCur ? 'cur' : 'up');
  const prevDone = i>0 && stepDone(S.steps[i-1]);
  const tag = canOpen ? 'button' : 'div';
  return `<li class="mcol ${cls}">
    <div class="rail" aria-hidden="true"><span class="seg ${i===0?'none':(prevDone?'solid':'dash')}"></span>${node}<span class="seg ${i===S.steps.length-1?'none':(done?'solid':'dash')}"></span></div>
    <${tag} class="mcard ${cls}" ${canOpen?`data-act="open-step" data-idx="${i}"`:''} style="view-transition-name: step-${i}">${body}</${tag}>
  </li>`;
}
function startedReading(st){ const a = S.ans[st.id] || {}, c = a._carried || {}; return QUESTIONS.some(q=>a[q.k] && !c[q.k]) || !!(a.nums && (a.nums.count || a.nums.minutes)); }
function mapRow(opts){ return `<ol class="maprow" style="--n:${S.steps.length}">${S.steps.map((st,i)=>stepCard(st,i,opts)).join('')}</ol>`; }

function headingSection(final){
  const read = readSteps();
  if(!read.length) return `<section class="heading"><div class="hh"><h2>Where this process is heading</h2><span class="muted">Read a step and the approved tools it points to appear here.</span></div>${destRail({leaders:[],by:{}})}</section>`;
  const h = headingFor(read);
  const names = h.leaders.map(id=>destOf(id).name);
  const title = names.length>1 ? `Two destinations: ${names[0]} and ${names[1]}` : `Heading toward ${names[0]}`;
  const sub = read.length===S.steps.length ? `All ${S.steps.length} steps read` : `Early read, ${read.length} of ${S.steps.length} steps`;
  const cols = h.leaders.map(id=>fitColumn(id, h, read, final ? '' : (h.leaders.length===1 ? `Why ${destOf(id).name} leads` : ''))).join('')
    + (!final && h.rising ? fitColumn(h.rising, h, read, `Also in play: ${destOf(h.rising).name}`, true) : '');
  return `<section class="heading"><div class="hh"><h2>${esc(title)}</h2><span class="muted">${esc(sub)}</span></div>${destRail(h)}<div class="fits">${cols}</div></section>`;
}
function fitColumn(id, h, read, label, also){
  const d = destOf(id), why = [];
  read.forEach(st=>{ const t = stepEval(st).tool; if(t && t.winner===id) (t.reasons[id]||[]).forEach(r=>{ if(!why.includes(r)) why.push(r); }); });
  return `<div class="fit ${also?'also':''}"><div class="fh"><span class="fn">${esc(label || d.name)}</span><span class="fs">${esc(stepsLabel(h.by[id]||[]))}</span></div><span class="fw">${esc(d.what)}. ${esc(d.about)}</span><p>${esc(why.slice(0,3).join(' ') || 'No step points here yet.')}</p></div>`;
}
function destRail(h){
  return `<div class="drail">${DESTINATIONS.map(d=>{
    const lead = (h.leaders||[]).includes(d.id), n = (h.by[d.id]||[]).length;
    return `<div class="dstop ${lead?'lead':''} ${n?'has':''}"><span class="dn">${esc(d.name)}</span><span class="dw">${esc(d.what)}</span>${lead?`<span class="ds">${esc(stepsLabel(h.by[d.id]))}</span>`:''}</div>`;
  }).join('')}</div>`;
}
function viewMap(){
  const exp = S.mode==='guided' ? getExpedition(S.procId) : null;
  const read = readSteps().length, n = S.steps.length, next = nextOpenIndex();
  const org = S.mode==='guided' ? exp.fn : S.own.org;
  const sub = `${org ? org+'. ' : ''}${n} steps, in the order the work happens. Read each one, starting with the highlighted step.`;
  const cta = next==null ? `<button class="btn primary" data-act="to-finished">See the finished map</button>` : '';
  const ill = S.mode==='guided' ? ILLUS.dept[exp.fnId] : '';
  return `<header class="scene ${ill?'withill':''}"><div class="sh"><h1>Where would an LLM earn its keep?</h1><p class="lede">${esc(sub)}</p></div>${ill?`<div class="hill" aria-hidden="true">${ill}</div>`:''}</header>
  ${mapRow()}
  ${cta || S.mode==='own' ? `<div class="actions">${cta}${S.mode==='own'?`<button class="btn ghost" data-act="own-edit">Edit the steps</button>`:''}</div>` : ''}
  ${headingSection(false)}`;
}

/* ---------- a step ---------- */
function dotField(n, caption){
  if(!(n>0)) return '';
  const units = [1,2,5,10,20,25,50,100,200,250,500,1000,2000,5000,10000];
  const unit = units.find(u=>n/u<=40) || 10000, count = Math.max(1, Math.round(n/unit));
  return `<div class="dots" aria-hidden="true">${'<i></i>'.repeat(count)}</div><span class="cap">Each dot is ${unit.toLocaleString()}${caption?` ${esc(caption)}`:''}.</span>`;
}
function ministrip(){
  return `<nav class="ministrip" aria-label="Steps">${S.steps.map((st,i)=>{
    const done = stepDone(st), cur = i===S.cur, can = S.mode==='own' || done || i===nextOpenIndex() || cur;
    const inner = `${done?icon('check'):`<span class="mn">${i+1}</span>`}<span class="ml">${esc(st.name)}</span>`;
    return `${i?`<span class="mlink ${done?'solid':''}"></span>`:''}${can?`<button class="mchip ${done?'done':''} ${cur?'cur':''}" data-act="open-step" data-idx="${i}" ${cur?'aria-current="step"':''}>${inner}</button>`:`<span class="mchip up">${inner}</span>`}`;
  }).join('')}</nav>`;
}
function viewStep(){
  const st = curStep(), a = ansOf(st), i = S.cur;
  const left = S.mode==='guided' ? situationGuided(st, i) : situationOwn(st, i, a);
  return `<div class="stepbar"><button class="linkbtn strong" data-act="to-map">${icon('back')}The map</button>${ministrip()}</div>
  <div class="steplayout">
    <section class="situation">${left}</section>
    <section class="read" aria-labelledby="readh">${readPanel(st, a)}</section>
  </div>`;
}
function situationGuided(st, i){
  const v = splitVolume(st.volume), big = parseFloat(String(v.big).replace(/,/g,''));
  const pills = st.systems.split(',').map(s=>{ s = s.trim(); return `<span class="pill">${esc(s.charAt(0).toUpperCase()+s.slice(1))}</span>`; }).join('');
  return `<div class="sit-head"><span class="muted">Step ${i+1} of ${S.steps.length}, done by ${esc(whoName(st.who))}</span>
    <h1 style="view-transition-name: step-${i}">${esc(st.name)}</h1>
    <p class="arrive">${esc(line('arrive:'+st.id, REACT.arrive, {who:whoName(st.who)}))}</p></div>
    <div class="sblock" data-ev="volume"><h2 class="h4">How much of it there is</h2>
      <div class="bigvol">${v.pre?`<span class="pre">${esc(v.pre)}</span>`:''}${v.big?`<b>${esc(v.big)}</b>`:''}<span>${esc(v.big?v.rest:st.volume)}</span></div>
      ${big>=10 ? dotField(big) : ''}</div>
    <div class="sblock" data-ev="systems"><h2 class="h4">How it runs today</h2><div class="pills">${pills}</div><p class="notes" data-ev="notes">${emph(st.notes)}</p></div>
    <figure class="pain" data-ev="pain"><figcaption>The measured pain</figcaption><blockquote>${emph(st.pain)}</blockquote></figure>`;
}
function situationOwn(st, i, a){
  const n = a.nums || {}, r = numbersOf(n);
  const perOpts = ['day','week','month','year'].map(p=>`<option value="${p}" ${ (n.per||'month')===p?'selected':''}>a ${p}</option>`).join('');
  const minChips = MINUTE_CHIPS.map(c=>`<button class="nchip ${String(n.minutes)===String(c.v)?'on':''}" data-act="num-min" data-v="${c.v}" aria-pressed="${String(n.minutes)===String(c.v)}">${c.l}</button>`).join('');
  const rwChips = REWORK.map(c=>`<button class="nchip ${n.rework===c.id?'on':''}" data-act="num-rework" data-v="${c.id}" aria-pressed="${n.rework===c.id}">${c.l}</button>`).join('');
  const custom = n.minutes && !MINUTE_CHIPS.some(c=>String(c.v)===String(n.minutes));
  return `<div class="sit-head"><span class="muted">Step ${i+1} of ${S.steps.length}</span>
    <h1 style="view-transition-name: step-${i}">${esc(st.name)}</h1>${st.notes?`<p class="arrive">${esc(st.notes)}</p>`:''}</div>
    <div class="sblock numbers">
      <h2 class="h4">The numbers <span class="muted">(optional, rough is fine)</span></h2>
      <div class="nq"><label for="ncount">How often does it happen?</label>
        <div class="nrow"><input class="in short" id="ncount" type="number" min="0" inputmode="decimal" data-act="num-count" value="${esc(n.count||'')}" placeholder="e.g. 300"><select class="in short" data-act="num-per" aria-label="per">${perOpts}</select></div></div>
      <div class="nq"><span class="nl" id="minl">Roughly how long does each one take?</span>
        <div class="nchips" role="group" aria-labelledby="minl">${minChips}<span class="nother"><input class="in tiny" type="number" min="0" data-act="num-mincustom" value="${custom?esc(n.minutes):''}" placeholder="other" aria-label="Other, in minutes"> min</span></div></div>
      <div class="nq"><span class="nl" id="rwl">How often is it redone or corrected?</span><div class="nchips" role="group" aria-labelledby="rwl">${rwChips}</div></div>
      <div class="nq"><label for="npeople">How many people do this work?</label><input class="in short" id="npeople" type="number" min="0" data-act="num-people" value="${esc(n.people||'')}" placeholder="e.g. 4"></div>
      <p class="nsum" id="nsum" aria-live="polite">${r ? esc(numbersSentence(r)) : 'Add how often and how long, and the hours appear here.'}</p>
      <div id="nviz">${numViz(r)}</div>
    </div>`;
}
function numViz(r){
  if(!r) return '';
  let out = dotField(r.perMonth, 'a month');
  if(r.share!=null){ const p = Math.min(100, Math.round(r.share*100)); out += `<div class="share"><span class="sbar"><i style="width:${p}%"></i></span><span class="cap">${p}% of the team\u2019s time</span></div>`; }
  return out;
}

function readPanel(st, a){
  const guided = S.mode==='guided', revealed = guided && a.revealed;
  const done = answered(a);
  let qi = S.q;
  if(revealed || done && qi<0) qi = -1;
  const blocks = QUESTIONS.map((q,i)=>{
    const val = a[q.k];
    if(i===qi && !revealed) return openQuestion(q, a, st);
    if(!val) return '';
    const name = optName(q.opts(a), val) || capName(val);
    const mk = revealed ? markOf(q, st, val) : null;
    const fieldTxt = mk && mk!=='match' ? `<span class="rf">Field: ${esc(optName(q.opts(Object.assign({}, a, {band:expertBand(st)})), q.field(st)) || capName(q.field(st)))}</span>` : '';
    const carried = a._carried && a._carried[q.k] ? ' <span class="muted">(from the last step)</span>' : '';
    const markI = mk ? `<span class="rm m-${mk}" aria-label="${mk==='match'?'Matches the field':(mk==='near'?'Close to the field':'Differs from the field')}">${icon(mk==='match'?'check':(mk==='near'?'near':'x'))}</span>` : '';
    const inner = `<span class="rk">${esc(q.label)}</span><span class="rv">${markI}<span>${esc(name)}${carried}</span>${fieldTxt}</span>`;
    return revealed
      ? `<div class="arow ${mk?'m-'+mk:''}">${inner}</div>`
      : `<button class="arow" data-act="reopen" data-k="${q.k}" aria-label="Change: ${esc(q.label)}, ${esc(name)}">${inner}<span class="rc">${icon('chev')}</span></button>`;
  }).join('');
  const count = QUESTIONS.filter(q=>a[q.k]).length;
  let tail = '';
  if(!done) tail = `<p class="muted small">${count} of ${QUESTIONS.length} answered</p>`;
  else if(guided && !revealed) tail = `<div class="actions"><button class="btn primary" data-act="reveal">Compare with the field</button></div>`;
  else tail = guided ? revealGuided(st, a) : resultOwn(st, a);
  return `<div class="rhead"><h2 id="readh">Your read</h2>${!revealed&&!done?`<span class="muted small">Each question folds into a row once answered. Tap a row to change it.</span>`:''}</div>
  <div class="arows">${blocks}</div>${tail}`;
}
function openQuestion(q, a, st){
  const opts = q.opts(a), sel = a[q.k], selO = opts.find(o=>o.id===sel);
  const many = opts.length>6, isAuto = q.k==='auto', isShape = q.k==='shape';
  const defTxt = selO ? selO.d : 'Point at an option to see what it means.';
  const defP = `<p class="def" id="def" aria-live="polite" data-default="${esc(defTxt)}">${esc(defTxt)}</p>`;
  return `<div class="question" data-q="${q.k}">
    <h3>${esc(q.q)}</h3>
    <div class="opts ${many?'many':''} ${isAuto?'trio':''}" role="radiogroup" aria-label="${esc(q.label)}">${opts.map(o=>`<button class="opt ${sel===o.id?'on':''}" role="radio" aria-checked="${sel===o.id}" data-act="answer" data-k="${q.k}" data-v="${o.id}" data-def="${esc(o.d||'')}">${isAuto?`<span class="oill" aria-hidden="true">${ILLUS.auto[o.id]}</span>`:''}<b>${esc(o.name)}</b>${!many&&o.d?`<span>${esc(o.d)}</span>`:''}</button>`).join('')}</div>
    ${isShape ? `<div class="qrow"><div class="qill" id="qill" aria-hidden="true" data-default="${esc(sel||'')}">${sel?ILLUS.shape[sel]:''}</div>${defP}</div>` : (many ? defP : '')}
    ${guideCard(q, a, st)}
  </div>`;
}

/* ---------- results ---------- */
function pointerLine(st){
  const t = stepEval(st).tool; if(!t) return '';
  const before = headingFor(readSteps().filter(x=>x!==st && S.steps.indexOf(x)<S.steps.indexOf(st)));
  const after = headingFor(readSteps().filter(x=>S.steps.indexOf(x)<=S.steps.indexOf(st)));
  const w = destOf(t.winner).name;
  let shift;
  const b0 = before.leaders[0], a0 = after.leaders[0];
  if(!b0) shift = `The first reading points to ${destOf(a0).name}.`;
  else if(a0!==b0) shift = `The heading shifts: ${destOf(a0).name} now leads.`;
  else if(after.leaders.length>before.leaders.length) shift = `The heading shifts: ${destOf(after.leaders[1]).name} draws level with ${destOf(a0).name}.`;
  else shift = `The heading holds: ${destOf(a0).name}.`;
  const runner = t.runnerUp ? ` ${destOf(t.runnerUp).name} is close behind.` : '';
  return `<div class="pointer">${icon('arrow')}<p><b>Points to ${esc(w)}.</b> ${esc(whyTool(t))}${esc(runner)} ${esc(shift)}</p></div>`;
}
function nextButton(){
  const i = S.cur, last = i===S.steps.length-1, nxt = nextOpenIndex();
  if(nxt==null) return `<button class="btn primary" data-act="next-step">See the finished map</button>`;
  return `<button class="btn primary" data-act="next-step">Next: ${esc(S.steps[nxt].name)}</button>`;
}
function revealGuided(st, a){
  const marks = SCORED.map(q=>markOf(q, st, a[q.k]));
  const score = marks.reduce((s,m)=>s + (m==='match'?1:(m==='near'?0.5:0)), 0), ratio = score/SCORED.length;
  const tier = ratio>=.85?'great':(ratio>=.6?'good':(ratio>=.35?'mixed':'off'));
  const v = VERDICTS[fieldVerdict(st)];
  const bandOk = a.band===expertBand(st);
  const order = S.dug[st.id] ? [0,1] : [0];
  const notes = order.map(k=>{ const d = st.discoveries[k]; return `<article class="fnote ${k?'fresh':''}"><span class="fni">${icon('notes')}</span><div><h4>${esc(d.title)}</h4><p>${esc(d.text)}</p><p class="eff">${esc(d.effect)}</p></div></article>`; }).join('');
  return `<div class="agree t-${tier}"><span class="ag">${Math.round(score*10)/10} of ${SCORED.length}</span><p>${esc(line('rv:'+st.id, REACT.profile[tier]))}</p></div>
    <div class="fieldread ${bandOk?'ok':'differs'}">
      <h3>${bandOk ? 'The field agrees on the LLM call' : `The field reads it as: ${esc(bandName(expertBand(st)))}`}</h3>
      <p>${esc(st.expertWhy)}</p>
      <p class="small">${esc(st.autoNote)}</p>
    </div>
    <div class="verdict vt-${v.tone}"><span class="vl">The verdict for this step</span><h3>${esc(v.name)}</h3><p>${esc(v.advice)}</p></div>
    <div class="fnotes">${notes}${S.dug[st.id] ? '' : `<button class="fnote sealed" data-act="dig">${icon('interview')}<span><b>Hear more from the floor</b><span>One more field note from ${esc(teamOf(st.who))}.</span></span></button>`}</div>
    ${pointerLine(st)}
    <div class="actions">${nextButton()}</div>`;
}
function resultOwn(st, a){
  const e = stepEval(st), v = VERDICTS[e.verdict], ch = challengesOf(e.a, e.nums);
  const challenges = ch.length ? `<div class="challenges">${ch.map(c=>`<div class="challenge"><span class="ci">${icon('near')}</span><p>${esc(c.text)}</p><button class="linkbtn" data-act="reopen" data-k="${c.q}">Change my answer</button></div>`).join('')}</div>` : '';
  return `${challenges}
    <div class="verdict vt-${v.tone}"><span class="vl">The verdict for this step</span><h3>${esc(v.name)}</h3><p>${esc(v.advice)}</p>
      <dl class="moves"><div><dt>First move</dt><dd>${esc(v.first)}</dd></div><div><dt>Involve</dt><dd>${esc(v.who)}</dd></div>
      <div><dt>Value and feasibility</dt><dd>${levelName(e.value)} value, ${levelName(e.feas).toLowerCase()} feasibility${e.nums?`, from about ${round(e.nums.total)} hours a month`:''}.</dd></div></dl></div>
    ${pointerLine(st)}
    <div class="actions">${nextButton()}</div>`;
}

/* ---------- finished ---------- */
function startStep(){
  const scored = S.steps.filter(stepDone).map(st=>{ const e = stepEval(st); return {st, e, s:LV[e.value]*2 + LV[e.feas] - (['capture','small','park','fix'].includes(e.verdict)?10:0)}; });
  scored.sort((x,y)=>y.s-x.s);
  return scored[0];
}
function matrix(){
  const cells = {};
  S.steps.forEach((st,i)=>{ if(!stepDone(st)) return; const e = stepEval(st); const k = e.value+'|'+e.feas; (cells[k] = cells[k]||[]).push(`<span class="mdot b-${e.a.band}" title="${esc(st.name)}">${i+1}</span>`); });
  const row = v=>`<span class="ax">${levelName(v)}</span>${['low','mid','high'].map(f=>`<div class="mcell ${v==='high'&&f==='high'?'win':''}">${v==='high'&&f==='high'?'<span class="ml2">Start here</span>':''}${(cells[v+'|'+f]||[]).join('')}</div>`).join('')}`;
  return `<div class="matrix">${row('high')}${row('mid')}${row('low')}<span></span><span class="ax c">Low</span><span class="ax c">Medium</span><span class="ax c">High</span></div>
  <div class="maxes"><span>Value runs up the side</span><span>Feasibility runs across</span></div>`;
}
function viewFinished(){
  const read = readSteps(), counts = {core:0, assist:0, other:0, none:0};
  read.forEach(st=>{ counts[stepEval(st).a.band]++; });
  const h1 = counts.core===0 ? (counts.assist ? `${counts.assist} ${plural(counts.assist,'step')} where an LLM supports a person` : 'No step here needs an LLM, and that is a finding')
    : `${counts.core===1?'One step':`${counts.core} steps`} where an LLM earns its keep`;
  const parts = [];
  if(counts.core) parts.push(`${counts.core} ${plural(counts.core,'is','are')} an LLM\u2019s kind of work`);
  if(counts.assist) parts.push(`${counts.assist} ${plural(counts.assist,'needs','need')} an LLM to support a person\u2019s judgment`);
  if(counts.other) parts.push(`${counts.other} ${plural(counts.other,'calls','call')} for a different kind of AI`);
  if(counts.none) parts.push(`${counts.none} ${plural(counts.none,'is','are')} better served by rules, integration or a process fix`);
  const lede = `Of ${read.length} steps, ${parts.length>1 ? parts.slice(0,-1).join(', ') + ' and ' + parts[parts.length-1] : parts[0]}.`;
  const best = startStep();
  let start = '';
  if(best){
    const st = best.st, e = best.e, v = VERDICTS[e.verdict];
    const g = suggestGuardrails(e.a, e.a.cap); if(e.a.sens==='personal' && !g.includes('privacy')) g.unshift('privacy');
    const metric = S.mode==='guided' ? st.metric : (e.nums ? `Hours a month on this step (about ${round(e.nums.total)} today), and how often it is redone.` : 'Time per item, and how often it is redone. Measure both for two weeks first.');
    start = `<section class="start"><span class="sl">Where to start</span><h2>${esc(st.name)}</h2>
      <p class="sv"><b>${esc(v.name)}.</b> ${esc(v.advice)}</p>
      <dl class="moves"><div><dt>First move</dt><dd>${esc(v.first)}</dd></div><div><dt>Measure it by</dt><dd>${esc(metric)}</dd></div><div><dt>Tool</dt><dd>${e.tool?esc(destOf(e.tool.winner).name)+'. '+esc(whyTool(e.tool)):''}</dd></div></dl>
      <div class="gchips">${g.slice(0,4).map(id=>`<span>${esc((GUARDRAILS.find(x=>x.id===id)||{}).name||'')}</span>`).join('')}</div></section>`;
  }
  const whatif = S.mode==='own' ? `<section class="whatif"><h2 class="h3">What if…</h2><p class="muted small">Flip a switch and see what would change. Your answers stay as they are.</p>
    <div class="wis">${[['double','The volume doubled'],['digital','Everything arrived digitally'],['devs','Developers were available']].map(([k,l])=>`<button class="wi ${S.whatif[k]?'on':''}" data-act="whatif" data-w="${k}" role="switch" aria-checked="${S.whatif[k]}"><span class="sw"><i></i></span>${l}</button>`).join('')}</div>${whatifChanges()}</section>` : '';
  const anyWi = S.mode==='own' && Object.values(S.whatif).some(Boolean);
  return `<header class="scene"><span class="muted">${esc(S.mode==='guided' ? getExpedition(S.procId).name : S.own.process)}, all steps read</span><h1>${esc(h1)}</h1><p class="lede">${esc(lede)}</p></header>
  ${anyWi?`<p class="callout wi-on">${icon('spark')}What-if view. The map shows what would change; switch everything off to see your answers again.</p>`:''}
  ${mapRow({final:true})}
  ${headingSection(true)}
  <div class="fgrid">${start}<section class="mbox"><h2 class="h4">Value and feasibility</h2>${matrix()}</section></div>
  ${whatif}
  <div class="actions"><button class="btn primary" data-act="to-export">${icon('download')}Take the map further</button>
    ${S.mode==='guided' ? `<button class="btn ghost" data-act="start-guided">Walk another process</button>` : `<button class="btn ghost" data-act="to-map">Back to the map</button>`}
    <button class="btn ghost" data-act="home">${icon('home')}Home</button></div>`;
}

function evalUnder(wi){
  const save = S.whatif; S.whatif = wi;
  const out = S.steps.map(st=>{ if(!stepDone(st)) return null; const e = stepEval(st); return {value:e.value, feas:e.feas, verdict:e.verdict, tool:e.tool && e.tool.winner, hours:e.nums ? e.nums.total : null}; });
  S.whatif = save; return out;
}
function whatifChanges(){
  if(!Object.values(S.whatif).some(Boolean)) return '';
  const base = evalUnder({double:false, digital:false, devs:false}), now = evalUnder(S.whatif), items = [];
  S.steps.forEach((st,i)=>{
    const b = base[i], n = now[i]; if(!b || !n) return;
    const d = [];
    if(b.hours!=null && Math.round(b.hours)!==Math.round(n.hours)) d.push(`about ${round(b.hours)} \u2192 ${round(n.hours)} hours a month`);
    if(b.value!==n.value) d.push(`value ${levelName(b.value).toLowerCase()} \u2192 ${levelName(n.value).toLowerCase()}`);
    if(b.feas!==n.feas) d.push(`feasibility ${levelName(b.feas).toLowerCase()} \u2192 ${levelName(n.feas).toLowerCase()}`);
    if(b.verdict!==n.verdict) d.push(`verdict: ${VERDICTS[n.verdict].name.toLowerCase()}`);
    if(b.tool!==n.tool) d.push(`points to ${destOf(n.tool).name} instead of ${destOf(b.tool).name}`);
    if(d.length) items.push(`<li><b>Step ${i+1}, ${esc(st.name)}:</b> ${esc(d.join('; '))}.</li>`);
  });
  return items.length ? `<ul class="wichanges">${items.join('')}</ul>` : `<p class="wichanges none">Nothing changes. These steps hold up under this what-if.</p>`;
}

/* ---------- export ---------- */
function buildExport(){
  const guided = S.mode==='guided', exp = guided ? getExpedition(S.procId) : null;
  const steps = S.steps.map((st,i)=>{
    if(!stepDone(st)) return {n:i+1, name:st.name, read:false};
    const e = stepEval(st), a = e.a;
    const g = suggestGuardrails(a, a.cap); if(a.sens==='personal' && !g.includes('privacy')) g.unshift('privacy');
    const o = {n:i+1, name:st.name, read:true,
      kindOfWork:optName(SHAPES,a.shape), inputs:optName(INPUTS,a.input), volume:optName(REPS,a.rep), stakes:optName(STAKES,a.stakes),
      llmFit:bandName(a.band), capability:capName(a.cap), autonomy:optName(AUTONOMY,a.auto),
      whereItHappens:optName(WHERE,a.where), whoWouldBuild:optName(BUILDERS,a.builder), dataSensitivity:optName(SENSITIVITY,a.sens),
      value:levelName(e.value), feasibility:levelName(e.feas), verdict:VERDICTS[e.verdict].name,
      tool:e.tool?destOf(e.tool.winner).name:'', toolReason:whyTool(e.tool), guardrails:g.map(id=>(GUARDRAILS.find(x=>x.id===id)||{}).name)};
    if(e.nums) o.numbers = {perMonth:Math.round(e.nums.perMonth), hoursPerMonth:round(e.nums.hours), reworkHoursPerMonth:round(e.nums.rework)};
    if(S.includeDesc) o.description = guided ? st.notes : (st.notes||'');
    return o;
  });
  const h = headingFor(readSteps());
  return {source:'Groundwork', version:4, exported:new Date().toISOString(),
    organisation: guided ? COMPANY.name : (S.own.org||''), process: guided ? exp.name : (S.own.process||''),
    example: guided, steps,
    heading:{destinations:h.leaders.map(id=>({tool:destOf(id).name, steps:h.by[id]}))}};
}
function lppPrompt(d){
  const rows = d.steps.filter(s=>s.read).map(s=>`${s.n}. ${s.name} | ${s.kindOfWork.toLowerCase()} | ${s.numbers?`${s.numbers.hoursPerMonth} hours a month`:s.volume.toLowerCase()+' volume'} | ${s.llmFit.toLowerCase()} | ${s.tool} | ${s.verdict.toLowerCase()}${s.description?` | ${s.description}`:''}`).join('\n');
  return `Review this AI use-case map for one process. Challenge each verdict, flag risks we missed, and say which step to pilot first and why.\n\nProcess: ${d.process}${d.organisation?` (${d.organisation})`:''}, ${d.steps.length} steps\n${rows}\n\nColumns: step | kind of work | volume | LLM fit | approved tool it points to | verdict.`;
}
function csvOf(d){
  const cols = ['n','name','kindOfWork','inputs','volume','stakes','llmFit','capability','autonomy','whereItHappens','whoWouldBuild','dataSensitivity','value','feasibility','verdict','tool','toolReason','perMonth','hoursPerMonth','reworkHoursPerMonth','guardrails','description'];
  const q = v=>{ v = v==null ? '' : String(v); return /[",\n]/.test(v) ? '"'+v.replace(/"/g,'""')+'"' : v; };
  const rows = d.steps.map(s=>cols.map(c=> c in (s.numbers||{}) ? s.numbers[c] : (c==='guardrails' ? (s.guardrails||[]).join('; ') : s[c])).map(q).join(','));
  return [cols.join(',')].concat(rows).join('\n');
}
function viewExport(){
  const d = buildExport();
  return `<button class="linkbtn strong" data-act="to-finished">${icon('back')}The finished map</button>
  <header class="scene"><h1>Take this map further</h1><p class="lede">Each option uses the same abstracted results: step profiles, your numbers, verdicts, tool leanings and guardrails. Nothing is sent anywhere. You choose where it goes.</p></header>
  <label class="toggle"><input type="checkbox" data-act="include-desc" ${S.includeDesc?'checked':''}><span><b>Include step descriptions</b><span class="muted">Off by default. Descriptions can carry internal detail that the abstracted results leave out.</span></span></label>
  <div class="xgrid">
    <section class="xcard"><h2>Analyse in LPP</h2><p>LPP has no connector, so the map comes with a prompt ready to paste. It asks LPP to challenge the verdicts and find the risks you missed.</p>
      <pre class="prompt" id="prompt">${esc(lppPrompt(d))}</pre><button class="btn primary" data-act="copy-prompt">${icon('copy')}Copy prompt</button></section>
    <div class="xcol">
      <section class="xcard"><h2>Hand off to Copilot Studio</h2><p>Download the map file and save it where your agent reads, such as its knowledge folder. The structure is the same from map to map, so an agent can rely on it.</p><button class="btn primary" data-act="dl-json">${icon('download')}Download map file (.json)</button></section>
      <section class="xcard"><h2>Open in a spreadsheet</h2><p>One row per step with every field, for your own analysis or to combine several maps.</p><button class="btn secondary" data-act="dl-csv">${icon('download')}Download .csv</button></section>
      <section class="xcard"><h2>Bring it to a meeting</h2><p>The finished map and the start-here case, ready to print or save as a PDF.</p><button class="btn secondary" data-act="print">${icon('print')}Print or save as PDF</button></section>
    </div>
  </div>`;
}
function download(name, text, type){
  const blob = new Blob([text], {type}), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function slug(s){ return String(s||'map').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'map'; }

/* =====================================================================
   FIELD GUIDE: a hint inside the open question, at the moment of need.
   ===================================================================== */
const G = {open:false, tier:1, key:null, auto:{}, lastAct:Date.now()};
function guideCard(q, a, st){
  if(!G.open) return '';
  const guided = S.mode==='guided';
  let ask = '', where = '', target = '';
  if(['shape','input','rep','stakes'].includes(q.k)){
    ask = HINTS.dimAsk[q.k];
    if(guided){ where = HINTS[q.k][q.field(st)]; target = HINTS.dimWhere[q.k]; }
  } else if(q.k==='band'){
    ask = 'Ask what the step produces. If it is language read, written or answered, an LLM may fit. If it follows fixed rules or moves data, it does not.';
    if(guided){ const b = BANDS.find(x=>x.id===expertBand(st)); where = `The field\u2019s answer is in the description of \u201c${b.name.toLowerCase()}\u201d: ${b.d}`; target = 'notes'; }
  } else if(q.k==='cap'){
    ask = fill(HINTS.capAsk, {shape:optName(SHAPES,a.shape).toLowerCase()});
    if(guided) where = `The field picks from ${bandName(expertBand(st)).toLowerCase()}: look closely at \u201c${capName(st.expertPick)}\u201d.`;
  } else if(q.k==='auto'){
    ask = fill(HINTS.autoAsk, {stakes:levelName(a.stakes).toLowerCase()||'unknown'});
    if(guided){ where = HINTS.auto[st.autoBest]; target = 'pain'; }
  } else ask = 'There is no field answer here. This is about your organisation, and it decides which approved tool fits.';
  const levels = GUIDANCE.map(g=>`<button class="${S.guide===g.id?'on':''}" data-act="guide-level" data-v="${g.id}" aria-pressed="${S.guide===g.id}" title="${esc(g.d)}">${esc(g.name)}</button>`).join('');
  return `<aside class="guide-card" aria-label="Field guide">
    <header><span>${icon('compass')}Field guide</span><button class="iconbtn" data-act="guide-toggle" aria-label="Close the field guide">${icon('close')}</button></header>
    <p class="g-ask">${esc(ask)}</p>
    ${where ? (G.tier>=2 ? `<p class="g-where" data-target="${esc(target)}">${icon('spark')}${esc(where)}</p>` : `<button class="g-btn" data-act="guide-more">${icon('spark')}Point me to the evidence</button>`) : ''}
    <footer><span>Guidance</span><div class="g-levels">${levels}</div></footer>
  </aside>`;
}
function afterGuide(){
  document.querySelectorAll('.ev-glow').forEach(x=>x.classList.remove('ev-glow'));
  const w = document.querySelector('.g-where[data-target]');
  if(w && w.dataset.target) document.querySelectorAll(`[data-ev="${w.dataset.target}"]`).forEach(x=>x.classList.add('ev-glow'));
}
function syncGuideKey(){
  const st = curStep(); if(!st || S.view!=='step') return;
  const key = st.id + ':' + S.q;
  if(key!==G.key){ G.key = key; G.tier = 1; G.lastAct = Date.now(); G.open = S.guide==='ropes' && S.q>=0; }
}
setInterval(()=>{
  if(S.view!=='step' || G.open || S.guide!=='stall' || S.q<0 || S.modal) return;
  if(G.auto[G.key]) return;
  if(Date.now()-G.lastAct > 25000){ G.auto[G.key] = true; G.open = true; render(); }
}, 1000);

/* =====================================================================
   COMPLICATIONS (Meridian walk): judgment calls with feedback, no score.
   ===================================================================== */
function fireComplication(slotIdx, cb){
  if(S.mode!=='guided' || S.compl.fired.length>slotIdx){ cb(); return; }
  const pool = EVENT_POOL.filter(e=>COMPLICATION_SLOTS[slotIdx].includes(e.slot) && !S.compl.fired.includes(e.id));
  if(!pool.length){ cb(); return; }
  const ev = pool[Math.floor(Math.random()*pool.length)];
  S.compl.fired.push(ev.id);
  const st = curStep();
  S.modal = {id:ev.id, phase:'choose', order:shuffle(ev.opts.map((_,i)=>i)), chosen:null, cb,
    vars:{who:whoName(st.who), team:teamOf(st.who), proc:getExpedition(S.procId).name.toLowerCase()}};
  render();
}
function renderModal(){
  const wrap = document.getElementById('modal'), card = document.getElementById('modalCard');
  if(!S.modal){ wrap.hidden = true; card.innerHTML = ''; return; }
  const M = S.modal, ev = EVENT_POOL.find(e=>e.id===M.id);
  let body;
  if(M.phase==='choose'){
    body = `<p class="dtext">${esc(fill(ev.text, M.vars))}</p><div class="choices">${M.order.map(i=>`<button class="choice" data-act="compl-choose" data-idx="${i}">${esc(fill(ev.opts[i].t, M.vars))}</button>`).join('')}</div>`;
  } else {
    const o = ev.opts[M.chosen], tag = o.s===2 ? ['good','Strong answer'] : (o.s===1 ? ['ok','Workable, but'] : ['bad','Risky']);
    body = `<p class="dchosen">${esc(fill(o.t, M.vars))}</p><p class="vtag vt-${tag[0]}">${tag[1]}</p><p class="dtext">${esc(o.fb)}</p><div class="actions"><button class="btn primary" data-act="compl-continue">Continue</button></div>`;
  }
  const opening = wrap.hidden;
  card.innerHTML = `<p class="dfrom">${icon('interview')}${esc(ev.from)}. A complication</p><h2 id="evTitle">${esc(ev.title)}</h2>${body}`;
  wrap.hidden = false;
  if(opening || M.phase==='feedback'){ const f = card.querySelector(M.phase==='choose' ? '.choice' : '[data-act="compl-continue"]'); if(f) setTimeout(()=>f.focus({preventScroll:true}), 30); }
}

/* =====================================================================
   MARKS AND TOASTS
   ===================================================================== */
function toast(title, text){
  const wrap = document.getElementById('toasts'); if(!wrap) return;
  const el = document.createElement('div'); el.className = 'toast';
  el.innerHTML = `<span class="ticon">${icon('mark')}</span><div><b>${esc(title)}</b>${text?`<p>${esc(text)}</p>`:''}</div>`;
  wrap.appendChild(el); while(wrap.children.length>3) wrap.removeChild(wrap.firstChild);
  setTimeout(()=>el.classList.add('out'), 4200); setTimeout(()=>el.remove(), 4700);
}
function award(id){
  if(J.marks[id]) return;
  J.marks[id] = true; saveJournal();
  const m = MARKS.find(x=>x.id===id); if(m) toast(`Mark earned: ${m.name}`, m.d);
}
function finishGuided(){
  if(S.finishedOnce) return; S.finishedOnce = true;
  const exp = getExpedition(S.procId);
  award('first');
  if(exp.flagship && !J.flagships.includes(exp.id)) J.flagships.push(exp.id);
  if(J.flagships.length>=4) award('flagships');
  if(!exp.flagship) award('offpath');
  const steps = S.steps;
  if(steps.some(st=>S.ans[st.id].band==='none' && expertBand(st)==='none')) award('saidno');
  if(steps.every(st=>S.ans[st.id].band===expertBand(st))) award('inagree');
  if(steps.every(st=>S.ans[st.id].auto===st.autoBest)) award('steady');
  if(steps.every(st=>S.dug[st.id])) award('digger');
  if(S.compl.answers.length>=2 && S.compl.answers.every(s=>s===2)) award('coolhead');
  const agree = steps.filter(st=>S.ans[st.id].band===expertBand(st)).length;
  J.walks.unshift({proc:exp.name, summary:`Matched the field\u2019s LLM call on ${agree} of ${steps.length} steps.`});
  J.walks = J.walks.slice(0,8);
  saveJournal();
}
function saveOwn(){
  if(S.mode!=='own' || !S.own) return;
  J.maps[S.own.id] = {id:S.own.id, org:S.own.org, process:S.own.process, steps:S.own.steps, ans:S.ans, updated:Date.now()};
  saveJournal();
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
function openStep(i){
  S.cur = i; S.view = 'step';
  const st = curStep(), a = ansOf(st);
  // carry builder and sensitivity over from the previous read step
  if(i>0){ const prev = S.ans[S.steps[i-1].id] || {};
    QUESTIONS.filter(q=>q.carry).forEach(q=>{ if(!a[q.k] && prev[q.k]){ a[q.k] = prev[q.k]; (a._carried = a._carried || {})[q.k] = true; } }); }
  S.q = a.revealed ? -1 : nextUnanswered(a, -1);
  syncGuideKey();
}
function handle(ds, el){
  G.lastAct = Date.now();
  switch(ds.act){
    case 'home': { const g = S.guide; S = fresh(); S.guide = g; break; }
    case 'clear-ask': S.confirmClear = true; break;
    case 'clear-no': S.confirmClear = false; break;
    case 'clear-yes':
      try{ localStorage.removeItem(JKEY); OLD_KEYS.forEach(k=>localStorage.removeItem(k)); }catch(e){}
      J = blankJournal(); S.confirmClear = false; toast('Cleared', 'Your marks, walks and maps are gone from this browser.'); break;

    case 'start-guided': { const g = S.guide; S = fresh(); S.guide = g; S.mode = 'guided'; S.view = 'terrain'; break; }
    case 'view-fn': S.viewFn = S.viewFn===ds.fn ? null : ds.fn; break;
    case 'toggle-shortlist': { const i = S.shortlist.indexOf(ds.proc); if(i>=0) S.shortlist.splice(i,1); else if(S.shortlist.length<3) S.shortlist.push(ds.proc); break; }
    case 'to-reveal': S.view = 'reveal'; break;
    case 'to-pick': S.view = 'pick'; break;
    case 'pick-proc': { const e = getExpedition(ds.proc); S.procId = ds.proc; S.steps = e.steps; S.ans = {}; S.dug = {}; S.view = 'map'; break; }

    case 'start-own': {
      const g = S.guide; S = fresh(); S.guide = g; S.mode = 'own'; S.view = 'own-setup';
      S.own = {id:'m'+Date.now().toString(36), org:'', process:'', steps:[{id:'s1',name:'',notes:''},{id:'s2',name:'',notes:''},{id:'s3',name:'',notes:''}]};
      break;
    }
    case 'open-map': {
      const m = J.maps[ds.id]; if(!m) return;
      const g = S.guide; S = fresh(); S.guide = g; S.mode = 'own';
      S.own = {id:m.id, org:m.org, process:m.process, steps:m.steps}; S.steps = m.steps; S.ans = m.ans || {}; S.view = 'map'; break;
    }
    case 'own-step-add': { const n = S.own.steps.length; S.own.steps.push({id:'s'+Date.now().toString(36)+n, name:'', notes:''}); break; }
    case 'own-step-remove': S.own.steps.splice(parseInt(ds.idx,10),1); break;
    case 'own-start': {
      S.own.org = (document.getElementById('org')||{}).value || S.own.org;
      S.own.process = (document.getElementById('proc')||{}).value || S.own.process;
      const steps = S.own.steps.filter(s=>s.name.trim());
      if(!S.own.process.trim() || steps.length<2){ S.setupError = true; break; }
      S.setupError = false; S.own.steps = steps; S.steps = steps; S.view = 'map'; saveOwn(); award('ownmap'); break;
    }
    case 'own-edit': S.view = 'own-setup'; break;

    case 'to-map': S.view = 'map'; break;
    case 'open-step': openStep(parseInt(ds.idx,10)); break;
    case 'reopen': { const st = curStep(), a = ansOf(st); if(a.revealed) return; S.q = QUESTIONS.findIndex(q=>q.k===ds.k); syncGuideKey(); break; }
    case 'answer': {
      const st = curStep(), a = ansOf(st), q = QUESTIONS.find(x=>x.k===ds.k);
      a[q.k] = ds.v; if(a._carried) delete a._carried[q.k];
      if(q.k==='band' && a.cap && !BAND_CAPS[a.band].includes(a.cap)) delete a.cap;
      saveOwn();
      const idx = QUESTIONS.indexOf(q);
      render();
      const nxt = nextUnanswered(a, idx);
      const tok = ++advTok;
      setTimeout(()=>{ if(tok!==advTok) return; S.q = nxt; syncGuideKey(); render();
        const f = document.querySelector('.question .opt') || document.querySelector('[data-act="reveal"]') || document.querySelector('.verdict'); if(f && f.focus) f.focus({preventScroll:true}); }, 260);
      return;
    }
    case 'reveal': { const st = curStep(); ansOf(st).revealed = true; S.q = -1; break; }
    case 'dig': S.dug[curStep().id] = true; break;
    case 'next-step': {
      const go = ()=>{ const n = nextOpenIndex(); if(n==null){ if(S.mode==='guided') finishGuided(); S.view = 'finished'; } else openStep(n); render(); };
      const readCount = readSteps().length;
      if(S.mode==='guided' && readCount===2 && S.steps.length>=3) { fireComplication(0, go); return; }
      if(S.mode==='guided' && nextOpenIndex()==null) { fireComplication(1, go); return; }
      go(); return;
    }
    case 'to-finished': S.view = 'finished'; break;
    case 'whatif': S.whatif[ds.w] = !S.whatif[ds.w]; break;
    case 'to-export': S.view = 'export'; break;
    case 'copy-prompt': {
      const t = lppPrompt(buildExport());
      const done = ()=>{ toast('Prompt copied', 'Paste it into LPP.'); award('further'); };
      if(navigator.clipboard) navigator.clipboard.writeText(t).then(done, ()=>{ selectPrompt(); });
      else selectPrompt();
      return;
    }
    case 'dl-json': { const d = buildExport(); download(`groundwork-${slug(d.process)}.json`, JSON.stringify(d, null, 2), 'application/json'); award('further'); return; }
    case 'dl-csv': { const d = buildExport(); download(`groundwork-${slug(d.process)}.csv`, csvOf(d), 'text/csv'); award('further'); return; }
    case 'print': window.print(); return;

    case 'compl-choose': {
      const M = S.modal, ev = EVENT_POOL.find(e=>e.id===M.id);
      M.chosen = parseInt(ds.idx,10); M.phase = 'feedback'; S.compl.answers.push(ev.opts[M.chosen].s); break;
    }
    case 'compl-continue': { const cb = S.modal.cb; S.modal = null; cb(); return; }

    case 'guide-toggle': G.open = !G.open; if(G.open) G.tier = 1; break;
    case 'guide-more': G.tier = 2; break;
    case 'guide-level': S.guide = ds.v; try{ localStorage.setItem('gw_guide', S.guide); }catch(e){} break;

    case 'num-min': numSet('minutes', ds.v); break;
    case 'num-rework': { const n = numObj(); n.rework = n.rework===ds.v ? '' : ds.v; saveOwn(); break; }
    default: return;
  }
  render();
}
let advTok = 0;
function selectPrompt(){ const p = document.getElementById('prompt'); if(!p) return; const r = document.createRange(); r.selectNodeContents(p); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); toast('Prompt selected', 'Press Ctrl+C or Cmd+C to copy it.'); }
function numObj(){ const a = ansOf(curStep()); return a.nums || (a.nums = {per:'month'}); }
function numSet(k, v){ numObj()[k] = v; saveOwn(); }
function refreshNumbers(){
  const r = numbersOf(numObj());
  const s = document.getElementById('nsum'); if(s) s.textContent = r ? numbersSentence(r) : 'Add how often and how long, and the hours appear here.';
  const z = document.getElementById('nviz'); if(z) z.innerHTML = numViz(r);
}

/* =====================================================================
   INIT
   ===================================================================== */
function boot(){
  const app = document.getElementById('app');
  app.addEventListener('click', e=>{
    const t = e.target.closest('[data-act]');
    if(!t || t.disabled || t.tagName==='INPUT' || t.tagName==='SELECT') return;
    handle(t.dataset, t);
  });
  app.addEventListener('input', e=>{
    const t = e.target, ds = t.dataset; G.lastAct = Date.now(); if(!ds || !ds.act) return;
    if(ds.act==='own-org') S.own.org = t.value;
    else if(ds.act==='own-proc') S.own.process = t.value;
    else if(ds.act==='own-step-name') S.own.steps[ds.idx].name = t.value;
    else if(ds.act==='own-step-notes') S.own.steps[ds.idx].notes = t.value;
    else if(ds.act==='num-count'){ numSet('count', t.value); refreshNumbers(); }
    else if(ds.act==='num-people'){ numSet('people', t.value); refreshNumbers(); }
    else if(ds.act==='num-mincustom'){ numSet('minutes', t.value); refreshNumbers(); document.querySelectorAll('.nchip[data-act="num-min"]').forEach(b=>{ b.classList.remove('on'); b.setAttribute('aria-pressed','false'); }); }
  });
  app.addEventListener('change', e=>{
    const t = e.target, ds = t.dataset; if(!ds || !ds.act) return;
    if(ds.act==='num-per'){ numSet('per', t.value); refreshNumbers(); }
    if(ds.act==='include-desc'){ S.includeDesc = t.checked; render(); }
  });
  const showDef = e=>{
    const t = e.target.closest && e.target.closest('[data-def]'); if(!t) return;
    const d = document.getElementById('def'); if(d && t.dataset.def) d.textContent = t.dataset.def;
    const qi = document.getElementById('qill'); if(qi && t.dataset.k==='shape') qi.innerHTML = ILLUS.shape[t.dataset.v] || '';
  };
  const hideDef = e=>{
    if(!(e.target.closest && e.target.closest('[data-def]'))) return;
    const d = document.getElementById('def'); if(d) d.textContent = d.dataset.default || '';
    const qi = document.getElementById('qill'); if(qi) qi.innerHTML = qi.dataset.default ? (ILLUS.shape[qi.dataset.default] || '') : '';
  };
  app.addEventListener('mouseover', showDef); app.addEventListener('focusin', showDef);
  app.addEventListener('mouseout', hideDef); app.addEventListener('focusout', hideDef);
  document.getElementById('modal').addEventListener('click', e=>{ const t = e.target.closest('[data-act]'); if(t) handle(t.dataset, t); });
  ['pointerdown','keydown','wheel','touchstart'].forEach(ev=>window.addEventListener(ev, ()=>{ G.lastAct = Date.now(); }, {passive:true}));
  document.addEventListener('keydown', e=>{ if(e.key==='Escape' && G.open){ G.open = false; render(); } });
  render();
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();

})();
