(function(){
'use strict';

/* =====================================================================
   JOURNAL: marks, endings and run history, kept in this browser.
   ===================================================================== */
const JKEY = 'gw_journal_v1';
function blankJournal(){ return {marks:{}, endings:{}, runs:0, flagships:[], bgs:[], history:[]}; }
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
    mode:null, stage:'hero',
    bg:null, guide:savedGuide(),
    stats:{cred:4, trust:4, rigor:4}, weeks:START_WEEKS, maxWeeks:START_WEEKS, overrun:0,
    score:0, maxScore:0, projTotal:140, rankIdx:0,
    cat:{terrain:{s:0,m:0}, profile:{s:0,m:0}, match:{s:0,m:0}, judgment:{s:0,m:0}, reality:{s:0,m:0}, canvas:{s:0,m:0}},
    once:{}, effectsOn:{}, flags:{}, freeDigs:0, rethinks:0,
    log:[], notes:[], lines:{}, eventLog:[], newMarks:[],
    hintsUsed:0, hintedKeys:{}, missNext:null,
    plan:null, eventsShown:{}, modal:null, lastGain:null,
    viewFn:null, shortlist:[], terrainRevealed:false, terrainGain:null, replay:null,
    procId:null, trailAt:[], stepIndex:0, stepPhase:'brief', dimIdx:0,
    stepAnswers:{}, curProfile:{}, curCap:null, curAuto:null,
    marked:[], dug:{}, discOrder:{},
    realityRatings:{}, realityDone:false, realityGain:null, headlineStep:null,
    canvasGuardrails:[], canvasScored:false, canvasRevealed:false, canvasGain:null,
    ending:null, finalRank:null, finalized:false,
    applyOrg:'', applyProcess:'', applySteps:[], applyStepsError:false,
    applyIndex:0, applyAnswers:{}, applyPhase:'profile', applyDim:0,
  };
}
let S = fresh();

/* =====================================================================
   HELPERS
   ===================================================================== */
function esc(str){
  return String(str==null?'':str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
/* Escape, and set every figure in bold so the numbers that matter stand out. */
function emph(t){
  const re = /\$?\d+(?:[.,]\d+)*(?:%| percent)?/g;
  let out = '', last = 0, m;
  t = String(t||'');
  while((m = re.exec(t))){ out += esc(t.slice(last, m.index)) + '<b class="num">' + esc(m[0]) + '</b>'; last = m.index + m[0].length; }
  return out + esc(t.slice(last));
}
const clamp = (v,a,b)=>Math.max(a, Math.min(b, v));
function shuffle(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }
const lastPick = {};
function pickFrom(list, key){
  if(!list || !list.length) return '';
  let i = Math.floor(Math.random()*list.length);
  if(list.length>1 && lastPick[key]===i) i = (i+1) % list.length;
  lastPick[key] = i;
  return list[i];
}
/* A line chosen once per moment, so re-renders do not reshuffle the words. */
function line(momentKey, list, poolKey, vars){
  if(!S.lines[momentKey]) S.lines[momentKey] = pickFrom(list, poolKey || momentKey);
  return fill(S.lines[momentKey], vars);
}
function fill(s, vars){ return String(s||'').replace(/\{(\w+)\}/g, (m,k)=> vars && vars[k]!=null ? vars[k] : m); }

const COLLECTIVE = ['team','desk','finance','services','committee','office','unit'];
function whoName(who){
  let w = String(who||'').trim().replace(/^the\s+/i,'').replace(/^\d+\s+/,'');
  return w.charAt(0).toLowerCase() + w.slice(1);
}
function teamOf(who){
  const w = whoName(who), lastWord = w.split(' ').pop();
  if(/ and /.test(w)) return 'the ' + w;
  if(COLLECTIVE.includes(lastWord)) return 'the ' + w + (lastWord==='team' ? '' : ' team');
  if(/[^s]s$/.test(lastWord)) return 'the ' + w;
  return 'the ' + w + '\u2019s team';
}

function capName(id){ return CAPS[id] ? CAPS[id].name : id; }
function levelName(id){ return ({low:'Low', mid:'Medium', high:'High'})[id] || id; }
function optName(list, id){ const o = list.find(x=>x.id===id); return o ? o.name : id; }
function autoName(id){ return optName(AUTONOMY, id); }
function famOf(capId){ const f = CAP_FAMILIES.find(f=>f.caps.includes(capId)); return f || CAP_FAMILIES[0]; }
function bgOf(id){ return BACKGROUNDS.find(b=>b.id===id); }
function pct(s,m){ return m>0 ? Math.round(100*s/m) : 0; }
function plural(n, one, many){ return n===1 ? one : (many || one+'s'); }
const WORDS = ['no','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen'];
function wordNum(n){ return WORDS[n] != null ? WORDS[n] : String(n); }

function curExp(){ return S.procId ? getExpedition(S.procId) : null; }
function curStep(){ const e = curExp(); return e ? e.steps[S.stepIndex] : null; }
function stepById(id){ const e = curExp(); return e ? e.steps.find(s=>s.id===id) : null; }
function findProcessMeta(id){
  for(const fn of FUNCTIONS){ const p = fn.processes.find(x=>x.id===id); if(p) return {fn, proc:p}; }
  return null;
}
function heatOf(fn){ return fn.signals.reduce((a,s)=> a + (s.s==='strong'?2:(s.s==='medium'?1:0)), 0); }
function feasOf(r){
  return feasibilityLevel({data:LEVEL_IDX[r.data]+1, risk:LEVEL_IDX[r.risk]+1, change:LEVEL_IDX[r.change]+1, integ:LEVEL_IDX[r.integ]+1});
}
const QCLASS = {'Quick win':'win','Strategic bet':'bet','Build toward':'build','Fill-in':'fill','Park':'park','Avoid':'avoid'};

/* Split a volume line into a headline figure and the words around it. */
function splitVolume(v){
  const m = String(v||'').match(/^((?:about|around|~)\s+)?(\d[\d,.]*%?)\s+(.*)$/i);
  if(!m) return {pre:'', big:'', rest:v};
  return {pre:(m[1]||'').trim(), big:m[2], rest:m[3]};
}

/* =====================================================================
   STANDING: score, stats, weeks, ranks, effects
   ===================================================================== */
let fxq = [];          // floating deltas, shown after the next render
let shownScore = 0;    // for the XP counter animation

function score(cat, earned, max){
  S.score += earned; S.maxScore += max;
  S.cat[cat].s += earned; S.cat[cat].m += max;
  if(earned>0) fxq.push({stat:'xp', v:earned});
  const idx = liveRankIdx();
  if(idx > S.rankIdx){
    S.rankIdx = idx;
    toast('rank', `Rank up: ${RANKS[idx].name}`, 'Your standing on the expedition has risen.');
    logIt('rank', `Reached the rank of ${RANKS[idx].name}.`);
  }
}
function liveRankIdx(){
  const r = S.projTotal>0 ? S.score / S.projTotal : 0;
  let idx = 0; RANKS.forEach((k,i)=>{ if(r >= k.at) idx = i; });
  return idx;
}
function finalRankIdx(){
  const r = S.maxScore>0 ? S.score / S.maxScore : 0;
  let idx = 0; RANKS.forEach((k,i)=>{ if(r >= k.at) idx = i; });
  return idx;
}

function adjust(d){
  const out = {};
  ['cred','trust','rigor'].forEach(k=>{
    if(!d || !d[k]) return;
    const before = S.stats[k];
    S.stats[k] = clamp(before + d[k], 0, 10);
    const real = S.stats[k] - before;
    if(real){ out[k] = real; fxq.push({stat:k, v:real}); }
  });
  if(d && d.weeks){
    if(d.weeks>0) addWeeks(d.weeks); else spendWeeks(-d.weeks);
    out.weeks = d.weeks;
  }
  checkEffects();
  return out;
}
function addWeeks(n){ S.weeks += n; fxq.push({stat:'weeks', v:n}); }
function spendWeeks(n){
  if(!n) return;
  for(let i=0;i<n;i++){ if(S.weeks>0) S.weeks--; else S.overrun++; }
  fxq.push({stat:'weeks', v:-n});
  if(S.weeks<=3 && S.weeks>0 && !S.once.lowWeeks){ S.once.lowWeeks = true; toast('dispatch', `From ${SPONSOR.name}`, DISPATCH.lowWeeks); }
  if(S.weeks===0 && !S.once.noWeeks){ S.once.noWeeks = true; toast('dispatch', `From ${SPONSOR.name}`, DISPATCH.noWeeks); }
}
function checkEffects(){
  if(S.mode!=='guided') return;
  const st = S.stats;
  const now = {trustHigh: st.trust>=7, trustLow: st.trust<=2, rigorHigh: st.rigor>=7};
  Object.keys(now).forEach(k=>{
    if(now[k] && !S.effectsOn[k]) toast('effect', now[k] ? 'Standing effect' : '', EFFECTS[k]);
    S.effectsOn[k] = now[k];
  });
  if(st.cred>=7 && !S.once.credHigh){ S.once.credHigh = true; addWeeks(1); toast('effect', 'Standing effect', EFFECTS.credHigh); logIt('effect', EFFECTS.credHigh); }
  if(st.cred<=2 && !S.once.credLow){ S.once.credLow = true; spendWeeks(1); toast('effect', 'Standing effect', EFFECTS.credLow); logIt('effect', EFFECTS.credLow); }
}
function activeEffects(){
  const out = [];
  if(S.stats.trust>=7) out.push(EFFECTS.trustHigh);
  if(S.stats.trust<=2) out.push(EFFECTS.trustLow);
  if(S.stats.rigor>=7) out.push(EFFECTS.rigorHigh);
  if(S.once.credHigh) out.push(EFFECTS.credHigh);
  if(S.once.credLow) out.push(EFFECTS.credLow);
  return out;
}
function logIt(kind, text, d, xp){ S.log.push({kind, text, d:d||null, xp:xp||0}); }

function digCost(){
  if(S.stats.trust>=7) return {weeks:0, why:'The floor makes time for you.'};
  if(S.freeDigs>0) return {weeks:0, why:`Pattern eye: ${wordNum(S.freeDigs)} free ${plural(S.freeDigs,'interview')} left.`, perk:true};
  if(S.stats.trust<=2) return {weeks:2, why:'The floor is guarded.'};
  return {weeks:1, why:''};
}

function awardMark(id){
  if(J.marks[id]) return;
  J.marks[id] = true; saveJournal();
  S.newMarks.push(id);
  const m = MARKS.find(x=>x.id===id);
  if(m) toast('mark', `Mark earned: ${m.name}`, m.d);
}

/* =====================================================================
   TOASTS AND FLOATING DELTAS
   ===================================================================== */
function toast(kind, title, text){
  const wrap = document.getElementById('toasts'); if(!wrap) return;
  const ic = {rank:'mark', mark:'mark', dispatch:'cred', effect:'spark', waypoint:'flag', info:'compass'}[kind] || 'compass';
  const el = document.createElement('div');
  el.className = 'toast t-' + kind;
  el.innerHTML = `<span class="ticon">${icon(ic)}</span><div>${title?`<b>${esc(title)}</b>`:''}${text?`<p>${esc(text)}</p>`:''}</div>`;
  wrap.appendChild(el);
  while(wrap.children.length>3) wrap.removeChild(wrap.firstChild);
  setTimeout(()=>el.classList.add('out'), 4600);
  setTimeout(()=>el.remove(), 5100);
}
function visibleEl(sel){
  return Array.from(document.querySelectorAll(sel)).find(el=>el.offsetParent!==null || getComputedStyle(el).position==='fixed');
}
function runFx(){
  const layer = document.getElementById('fx');
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // merge deltas per stat
  const merged = {};
  fxq.forEach(f=>{ merged[f.stat] = (merged[f.stat]||0) + f.v; });
  fxq = [];
  Object.keys(merged).forEach(stat=>{
    const v = merged[stat]; if(!v) return;
    const target = visibleEl(`[data-stat="${stat}"]`);
    if(!target) return;
    target.classList.remove('bump-up','bump-down'); void target.offsetWidth;
    target.classList.add(v>0 ? 'bump-up' : 'bump-down');
    if(reduce || !layer) return;
    const r = target.getBoundingClientRect();
    const f = document.createElement('span');
    f.className = 'float ' + (v>0 ? 'up' : 'down') + ' f-' + stat;
    const label = stat==='xp' ? 'XP' : stat==='weeks' ? plural(Math.abs(v),'week') : stat==='notes' ? plural(Math.abs(v),'field note') : (STATS.find(s=>s.id===stat)||{}).name;
    f.textContent = `${v>0?'+':'\u2212'}${Math.abs(v)} ${label}`;
    f.style.left = Math.round(r.left + Math.min(r.width-20, 150)) + 'px';
    f.style.top = Math.round(r.top + 2) + 'px';
    layer.appendChild(f);
    setTimeout(()=>f.remove(), 1500);
  });
  // XP counter
  const from = shownScore, to = S.score;
  shownScore = to;
  if(from!==to){
    const els = document.querySelectorAll('[data-xp]');
    if(reduce){ els.forEach(e=>e.textContent = to); return; }
    const t0 = performance.now(), dur = 650;
    const tick = now=>{
      const k = Math.min(1, (now-t0)/dur), v = Math.round(from + (to-from)*(1-Math.pow(1-k,3)));
      els.forEach(e=>e.textContent = v);
      if(k<1) requestAnimationFrame(tick);
    };
    els.forEach(e=>e.textContent = from);
    requestAnimationFrame(tick);
  }
}
function gainChips(g){
  if(!g) return '';
  const out = [];
  if(g.xp!=null) out.push(`<span class="gain xp">+${g.xp} XP</span>`);
  const d = g.d || {};
  STATS.forEach(s=>{ if(d[s.id]) out.push(`<span class="gain ${d[s.id]>0?'up':'down'}">${d[s.id]>0?'+':'\u2212'}${Math.abs(d[s.id])} ${s.name}</span>`); });
  if(d.weeks) out.push(`<span class="gain ${d.weeks>0?'up':'down'}">${d.weeks>0?'+':'\u2212'}${Math.abs(d.weeks)} ${plural(Math.abs(d.weeks),'week')}</span>`);
  return out.length ? `<p class="gains">${out.join('')}</p>` : '';
}

/* =====================================================================
   RENDER
   ===================================================================== */
let lastKey = '', lastDim = -1, advanceToken = 0;

function screenKey(){ return [S.mode, S.stage, S.stepIndex, S.stepPhase, S.realityDone, S.applyIndex, S.applyPhase].join('|'); }
function focusSig(){
  const a = document.activeElement;
  if(!a || !a.dataset || !a.dataset.act) return null;
  const ds = a.dataset, keys = ['act','val','cap','dim','step','key','g','proc','fn','idx','bg','level'];
  return keys.filter(k=>ds[k]!=null).map(k=>`[data-${k}="${CSS.escape(ds[k])}"]`).join('');
}

function render(){
  const key = screenKey();
  const changed = key !== lastKey; lastKey = key;
  const dimChanged = S.stepPhase==='profile' || S.applyPhase==='profile' ? (curDimIdx() !== lastDim) : false;
  lastDim = curDimIdx();
  const sig = changed ? null : focusSig();

  let html;
  if(S.stage==='hero') html = viewHero();
  else if(S.stage==='setup') html = `<div class="frame solo"><main class="main" id="main">${viewSetup()}</main></div>`;
  else if(S.mode==='guided') html = frame(viewGuided(), rail());
  else html = frame(viewApply(), railApply());

  const app = document.getElementById('app');
  app.innerHTML = html;
  const main = document.getElementById('main');
  if(changed){
    if(main){ main.classList.add('enter'); }
    window.scrollTo({top:0});
    const h = app.querySelector('h1, h2');
    if(h && S.stage!=='hero'){ h.setAttribute('tabindex','-1'); h.focus({preventScroll:true}); }
  } else {
    if(dimChanged){ const q = app.querySelector('.question'); if(q) q.classList.add('q-enter'); }
    if(sig){ const el = app.querySelector(sig); if(el) el.focus({preventScroll:true}); }
  }
  renderModal();
  syncGuide();
  runFx();
}
function curDimIdx(){ return S.mode==='apply' ? S.applyDim : S.dimIdx; }
function frame(inner, railHtml){ return `<div class="frame">${railHtml}<main class="main" id="main">${inner}</main></div>`; }

/* =====================================================================
   RAIL: route, standing, footer
   ===================================================================== */
const COMPASS = `<svg class="brandmark" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="14" cy="14" r="8.5" fill="none" stroke="currentColor" stroke-width=".8" opacity=".5"/><path d="M18.5 9.5 L12.6 12.6 L9.5 18.5 L15.4 15.4 Z" fill="var(--brass)"/></svg>`;

function stageGroup(stage){
  if(stage==='terrain-map' || stage==='terrain-reveal') return 'terrain';
  if(stage==='pick-expedition') return 'pick';
  if(stage==='step') return 'walk';
  return stage;
}
function rail(){
  const exp = curExp();
  const groups = [
    {id:'terrain', label:'Survey the terrain'},
    {id:'pick', label:'Choose an expedition'},
    {id:'walk', label: exp ? exp.name : 'Walk the process'},
    {id:'reality', label:'Reality check'},
    {id:'canvas', label:'Build the case'},
    {id:'debrief', label:'Debrief'},
  ];
  const cur = stageGroup(S.stage), order = groups.map(g=>g.id), ci = order.indexOf(cur);
  const items = groups.map((g,i)=>{
    const cls = i<ci ? 'done' : (i===ci ? 'cur' : 'up');
    let sub = '';
    if(g.id==='walk' && exp){
      sub = `<ol class="wps">${exp.steps.map((st,j)=>{
        const a = S.stepAnswers[st.id];
        const res = a && a.matchScored ? ' r-'+a.matchScored.tier : '';
        const sc = (S.stage==='step' && j===S.stepIndex) ? 'cur' : (a && a.matchScored ? 'done' : 'up');
        const mk = S.marked.includes(st.id) ? `<span class="carried" title="Carried forward">${icon('flag')}</span>` : '';
        return `<li class="${sc}${res}"><span class="wpd" aria-hidden="true"></span><span class="wpn">${esc(st.name)}</span>${mk}</li>`;
      }).join('')}</ol>`;
    }
    return `<li class="${cls}"><span class="rm" aria-hidden="true"></span><span class="rt">${esc(g.label)}</span>${sub}</li>`;
  }).join('');
  return `<aside class="rail" aria-label="Your expedition">
    <div class="brand">${COMPASS}<span>Groundwork</span></div>
    ${standing()}
    <nav aria-label="Route"><ol class="route">${items}</ol></nav>
    ${railFoot()}
  </aside>`;
}
function standing(){
  const idx = S.rankIdx, cur = RANKS[idx], next = RANKS[idx+1];
  const lo = cur.at*S.projTotal, hi = next ? next.at*S.projTotal : S.projTotal;
  const w = next ? clamp(Math.round(100*(S.score-lo)/Math.max(1,hi-lo)),0,100) : 100;
  const need = next ? Math.max(0, Math.ceil(hi - S.score)) : 0;
  const meters = STATS.map(s=>{
    const v = S.stats[s.id];
    const pips = Array.from({length:10},(_,i)=>`<i class="${i<v?'on':''}"></i>`).join('');
    return `<li data-stat="${s.id}" class="${v>=7?'hi':(v<=2?'lo':'')}" title="${esc(s.d)}">
      <span class="mi">${icon(s.icon)}</span><span class="mn">${esc(s.name)}</span>
      <span class="pips" aria-hidden="true">${pips}</span><b class="mv" aria-label="${esc(s.name)} ${v} of 10">${v}</b></li>`;
  }).join('');
  const ticks = Array.from({length:Math.max(S.maxWeeks, S.weeks)},(_,i)=>`<i class="${i<S.weeks?'on':''}"></i>`).join('');
  const eff = activeEffects();
  return `<section class="standing" aria-label="Your standing">
    <div class="rankbox" data-stat="xp">
      <div class="rkline"><span class="rk">${esc(cur.name)}</span><span class="xpn"><b data-xp>${shownScore}</b> XP</span></div>
      <span class="xpbar" aria-hidden="true"><i style="width:${w}%"></i></span>
      <span class="nx">${next ? `${need} XP to ${esc(next.name)}` : 'Top rank reached'}</span>
    </div>
    <ul class="meters">${meters}</ul>
    <div class="weeks ${S.weeks<=3?'low':''}" data-stat="weeks">
      <span class="mi">${icon('weeks')}</span>
      <span class="wn"><b>${S.weeks}</b> ${plural(S.weeks,'week')} to the meeting${S.overrun?`, ${S.overrun} over`:''}</span>
      <span class="ticks" aria-hidden="true">${ticks}</span>
    </div>
    <div class="ncount" data-stat="notes">${icon('notes')}<span><b>${S.notes.length}</b> field ${plural(S.notes.length,'note')}</span></div>
    ${eff.length ? `<ul class="effects">${eff.map(e=>`<li>${esc(e)}</li>`).join('')}</ul>` : ''}
  </section>
  <div class="mstatus" aria-hidden="true">
    <span class="ms-rank" data-stat="xp">${esc(cur.name)} <b data-xp>${shownScore}</b></span>
    ${STATS.map(s=>`<span class="ms" data-stat="${s.id}">${icon(s.icon)}<b>${S.stats[s.id]}</b></span>`).join('')}
    <span class="ms" data-stat="weeks">${icon('weeks')}<b>${S.weeks}</b></span>
  </div>`;
}
function railFoot(){
  const bg = bgOf(S.bg);
  const extra = [];
  if(S.bg==='analyst' && S.freeDigs>0) extra.push(`${wordNum(S.freeDigs)} free ${plural(S.freeDigs,'interview')} left`);
  if(S.bg==='strategist') extra.push(S.rethinks>0 ? 'One rethink left' : 'Rethink used');
  return `<div class="railfoot">
    ${bg ? `<p class="bgline"><b>${esc(bg.name)}</b><span>${esc(bg.perk)}${extra.length?`: ${esc(extra.join(', '))}`:''}</span></p>` : ''}
    <button class="linkbtn" data-act="restart">Leave this expedition</button>
  </div>`;
}
function railApply(){
  const groups = [
    {id:'apply-setup', label:'Name your process'},
    {id:'apply-steps', label:'List the steps'},
    {id:'apply-walk', label:'Walk each step'},
    {id:'apply-canvas', label:'Your canvas'},
  ];
  const ci = groups.findIndex(g=>g.id===S.stage);
  const items = groups.map((g,i)=>{
    const cls = i<ci ? 'done' : (i===ci ? 'cur' : 'up');
    let sub = '';
    if(g.id==='apply-walk' && S.applySteps.length && ci>=2){
      sub = `<ol class="wps">${S.applySteps.map((st,j)=>`<li class="${j<S.applyIndex||ci>2?'done':(j===S.applyIndex?'cur':'up')}"><span class="wpd"></span><span class="wpn">${esc(st.name||'Untitled')}</span></li>`).join('')}</ol>`;
    }
    return `<li class="${cls}"><span class="rm" aria-hidden="true"></span><span class="rt">${esc(g.label)}</span>${sub}</li>`;
  }).join('');
  return `<aside class="rail" aria-label="Your process">
    <div class="brand">${COMPASS}<span>Groundwork</span></div>
    <p class="railnote">Your own process. No score here: the suggestions come from how you describe the work.</p>
    <nav aria-label="Route"><ol class="route">${items}</ol></nav>
    <div class="railfoot"><button class="linkbtn" data-act="restart">Back to the start</button></div>
  </aside>`;
}

/* =====================================================================
   HERO AND JOURNAL
   ===================================================================== */
function viewHero(){
  const found = Object.keys(J.endings).length, marks = Object.keys(J.marks).length;
  const markTiles = MARKS.map(m=>{
    const on = !!J.marks[m.id];
    let prog = '';
    if(!on && m.id==='flagships' && J.flagships.length) prog = ` (${J.flagships.length} of 4)`;
    if(!on && m.id==='allbg' && J.bgs.length) prog = ` (${J.bgs.length} of 3)`;
    return `<li class="mk ${on?'on':''}"><span class="mki">${icon(on?m.icon:'lock')}</span><span><b>${esc(m.name)}</b><span>${esc(m.d)}${prog}</span></span></li>`;
  }).join('');
  const endings = ENDINGS.map(e=> J.endings[e.id]
    ? `<li class="on">${esc(e.name)}</li>` : `<li>Not yet found</li>`).join('');
  const hist = J.history.slice(0,3).map(h=>`<li><b>${esc(h.ending)}</b> <span>${esc(h.proc)}, as ${esc(h.bg)}. ${h.pct}%</span></li>`).join('');
  return `<div class="hero">
    <div class="hero-top">
      <svg class="hero-map" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g class="contours" fill="none" stroke="currentColor">
          <path d="M-40,120 C140,70 300,170 520,120 S900,40 1240,120"/>
          <path d="M-40,180 C160,120 330,230 560,180 S930,110 1240,190"/>
          <path d="M-40,250 C180,200 360,300 600,250 S960,180 1240,260"/>
          <path d="M-40,330 C200,290 400,380 640,330 S990,260 1240,340"/>
          <path d="M-40,410 C220,370 430,450 680,410 S1010,350 1240,420"/>
          <path d="M-40,480 C240,450 460,520 700,480 S1030,430 1240,500"/>
          <ellipse cx="930" cy="190" rx="120" ry="58"/><ellipse cx="930" cy="190" rx="74" ry="34"/><ellipse cx="930" cy="190" rx="32" ry="14"/>
          <ellipse cx="300" cy="360" rx="150" ry="60"/><ellipse cx="300" cy="360" rx="90" ry="34"/>
        </g>
        <defs><mask id="trailmask" maskUnits="userSpaceOnUse"><path class="trailmask" d="M640,470 C700,452 730,410 770,380 S830,330 860,290 S900,214 930,190" pathLength="1"/></mask></defs>
        <path class="trailpath" mask="url(#trailmask)" d="M640,470 C700,452 730,410 770,380 S830,330 860,290 S900,214 930,190"/>
        <g class="wpts">
          <circle cx="640" cy="470" r="7"/><circle cx="770" cy="380" r="7"/><circle cx="860" cy="290" r="7"/><circle cx="930" cy="190" r="10" class="end"/>
        </g>
      </svg>
      <div class="hero-copy">
        <h1>Groundwork</h1>
        <p class="hero-line">Find where AI actually belongs in an organisation, by surveying the terrain before anyone names a tool.</p>
        <div class="hero-actions">
          <button class="btn primary big" data-act="start-guided">Begin an expedition</button>
          <button class="btn ghost big" data-act="start-apply">Map your own process</button>
        </div>
        <p class="hero-note">You lead the search for AI use cases at Meridian Reserve Bank. About 25 minutes. Who you are, what happens on the trail and how it ends change with every run.</p>
      </div>
    </div>
    <section class="journal" aria-labelledby="jh">
      <div class="jhead">
        <h2 id="jh">Field journal</h2>
        <p>${J.runs ? `${J.runs} ${plural(J.runs,'expedition')} finished. ${found} of ${ENDINGS.length} endings found. ${marks} of ${MARKS.length} marks earned.` : 'Empty for now. Marks and endings you earn are kept in this browser, so you can come back and try another approach.'}</p>
      </div>
      <div class="jgrid">
        <div><h3>Marks</h3><ul class="marks">${markTiles}</ul></div>
        <div>
          <h3>Endings</h3><ol class="endings">${endings}</ol>
          ${hist ? `<h3>Recent expeditions</h3><ul class="hist">${hist}</ul>` : ''}
        </div>
      </div>
    </section>
  </div>`;
}

/* =====================================================================
   SETUP: the letter, background, guidance
   ===================================================================== */
function viewSetup(){
  const rp = S.replay ? getExpedition(S.replay) : null;
  const bgs = BACKGROUNDS.map(b=>{
    const on = S.bg===b.id;
    const rows = STATS.map(s=>`<span class="bgstat"><span>${esc(s.name)}</span><span class="pips">${Array.from({length:10},(_,i)=>`<i class="${i<b.stats[s.id]?'on':''}"></i>`).join('')}</span></span>`).join('');
    const tried = !J.runs || J.bgs.includes(b.id);
    return `<button class="bgcard ${on?'on':''}" data-act="pick-bg" data-bg="${b.id}" aria-pressed="${on}">
      <span class="bgn">${esc(b.name)}${tried?'':' <span class="new">Not tried yet</span>'}</span>
      <span class="bgl">${esc(b.line)}</span>
      <span class="bgstats">${rows}</span>
      <span class="perk"><b>${esc(b.perk)}.</b> ${esc(b.perkD)}</span>
    </button>`;
  }).join('');
  const guides = GUIDANCE.map(g=>`<button class="gopt ${S.guide===g.id?'on':''}" data-act="pick-guide" data-level="${g.id}" aria-pressed="${S.guide===g.id}"><b>${esc(g.name)}</b><span>${esc(g.d)}</span></button>`).join('');
  return `<div class="setup">
    <article class="letter">
      <p class="from">${icon('cred')} From ${esc(SPONSOR.name)}, ${esc(SPONSOR.role)}</p>
      <h1>${rp ? `Back to ${esc(rp.name.toLowerCase())}` : 'Twelve weeks to the leadership meeting'}</h1>
      ${rp ? `<p>Same process, fresh eyes. Choose who walks it this time and see what changes.</p>` :
      `<p>The president wants a shortlist of places where AI could help the Bank, ready for the leadership meeting in twelve weeks. Nobody has yet asked which processes need help first, or what the Bank can afford to get wrong.</p>
      <p>That is your job. Survey the map, walk one process step by step, and bring me one case I can defend.</p>`}
      <details class="about"><summary>About Meridian Reserve Bank</summary><p>${esc(COMPANY.blurb)}</p></details>
    </article>
    <section class="choose" aria-labelledby="who">
      <h2 id="who">Who are you?</h2>
      <p class="lede">Your background sets where you start, and gives you one advantage.</p>
      <div class="bgs">${bgs}</div>
    </section>
    <section class="choose" aria-labelledby="gd">
      <h2 id="gd">How much guidance?</h2>
      <p class="lede">You can change this at any time from the field guide.</p>
      <div class="gopts">${guides}</div>
    </section>
    <div class="actions">
      <button class="btn ghost" data-act="restart">${icon('back')}Back</button>
      <button class="btn primary big" data-act="setup-go" ${S.bg?'':'disabled'}>${rp ? 'Start the expedition' : 'Open the map'}</button>
    </div>
  </div>`;
}

/* =====================================================================
   GUIDED VIEWS
   ===================================================================== */
function viewGuided(){
  switch(S.stage){
    case 'terrain-map': return viewTerrainMap();
    case 'terrain-reveal': return viewTerrainReveal();
    case 'pick-expedition': return viewPickExpedition();
    case 'step': return viewStep();
    case 'reality': return viewReality();
    case 'canvas': return viewCanvas();
    case 'debrief': return viewDebrief();
    default: return viewTerrainMap();
  }
}
function scene(title, lede, extra){
  return `<header class="scene"><h2>${title}</h2>${lede?`<p class="lede">${lede}</p>`:''}${extra||''}</header>`;
}
function teamPrompt(k){ return DISCUSS[k] ? `<details class="teamprompt"><summary>${icon('trust')}For your team</summary><p>${esc(DISCUSS[k])}</p></details>` : ''; }

/* ---------- Terrain ---------- */
function viewTerrainMap(){
  const slots = [0,1,2].map(i=>{
    const pid = S.shortlist[i];
    if(!pid) return `<li class="slot empty"><span class="sf">${icon('flag')}</span><span>Open slot</span></li>`;
    const m = findProcessMeta(pid);
    return `<li class="slot"><span class="sf">${icon('flag')}</span><span><b>${esc(m.proc.name)}</b><span>${esc(m.fn.name)}</span></span>
      <button class="iconbtn" data-act="toggle-shortlist" data-proc="${pid}" aria-label="Remove ${esc(m.proc.name)} from the shortlist">${icon('close')}</button></li>`;
  }).join('');
  const station = f=>{
    const n = f.processes.length, heat = heatOf(f);
    const flags = f.processes.filter(p=>S.shortlist.includes(p.id)).length;
    const on = S.viewFn===f.id;
    return `<button class="station heat-${heat} ${on?'on':''}" data-act="view-fn" data-fn="${f.id}" aria-pressed="${on}" aria-label="${esc(f.name)}, ${n} processes">
      <span class="halo" aria-hidden="true"></span>
      <span class="sicon">${icon(f.icon)}</span>
      <span class="sname">${esc(f.name)}</span>
      <span class="scount">${n} ${plural(n,'process','processes')}</span>
      ${flags?`<span class="sflag">${icon('flag')}${flags}</span>`:''}
    </button>`;
  };
  const bands = MAP_GROUPS.map(g=>{
    const fns = FUNCTIONS.filter(f=>f.group===g.id);
    return `<section class="band"><h3>${esc(g.label)}<span>${esc(g.d)}</span></h3><div class="stations">${fns.map(station).join('')}</div></section>`;
  }).join('');
  const detail = S.viewFn ? viewFnDetail(FUNCTIONS.find(f=>f.id===S.viewFn))
    : `<div class="drawer empty"><p>${icon('compass')} Open any part of the Bank to read its signals and processes. The glow marks where the evidence is strongest.</p></div>`;
  return `${scene('Where does the pain live?', 'Open each part of the Bank and read its signals. Shortlist up to three processes worth investigating. Only what you shortlist can become your expedition.')}
  <div class="tray"><span class="trayl">Your shortlist</span><ul class="slots">${slots}</ul></div>
  <div class="guide-slot" id="guideSlot"></div>
  <div class="survey">${bands}</div>
  ${detail}
  <div class="actions sticky">
    <span class="count">${S.shortlist.length} of 3 shortlisted</span>
    <button class="btn primary" data-act="goto-terrain-reveal" ${S.shortlist.length?'':'disabled'}>Compare with the full survey</button>
  </div>`;
}
function viewFnDetail(fn){
  const full = S.shortlist.length>=3;
  return `<section class="drawer" aria-label="${esc(fn.name)}">
    <header class="dhead"><span class="dicon">${icon(fn.icon)}</span><div><h3>${esc(fn.name)}</h3><p>${emph(fn.brief)}</p></div></header>
    <div class="dgrid">
      <div>
        <h4>Signals</h4>
        <ul class="signals">${fn.signals.map(s=>`<li class="sig-${s.s}"><span class="sig" aria-label="${s.s} signal"></span><span>${emph(s.t)}</span></li>`).join('')}</ul>
      </div>
      <div>
        <h4>Processes</h4>
        ${fn.processes.map(p=>{
          const on = S.shortlist.includes(p.id);
          return `<div class="proc ${on?'on':''}">
            <div><b>${esc(p.name)}</b><span>${esc(p.d)}</span></div>
            <button class="btn ${on?'flagged':'secondary'} small" data-act="toggle-shortlist" data-proc="${p.id}" aria-pressed="${on}" ${!on&&full?'disabled title="Your shortlist is full"':''}>${icon('flag')}${on?'Shortlisted':'Shortlist'}</button>
          </div>`;
        }).join('')}
      </div>
    </div>
  </section>`;
}
function heatBar(r){ return `<span class="heatbar" aria-label="Hotspot rating ${r} of 5">${[1,2,3,4,5].map(i=>`<i class="${i<=r?'on':''}"></i>`).join('')}</span>`; }
function viewTerrainReveal(){
  const all = [];
  FUNCTIONS.forEach(fn=>fn.processes.forEach(p=>all.push({fn, ...p})));
  all.sort((a,b)=> b.rating - a.rating);
  const rows = all.map((p,i)=>{
    const mine = S.shortlist.includes(p.id);
    return `<li class="${mine?'mine':''}" style="--i:${i}">
      ${heatBar(p.rating)}
      <div class="lw">
        <b>${esc(p.name)}</b> <span class="lfn">${esc(p.fn.name)}</span>${mine?` <span class="you">${icon('flag')}Your pick</span>`:''}
        ${mine ? `<p>${esc(p.why)}</p>` : `<details><summary>Why</summary><p>${esc(p.why)}</p></details>`}
      </div>
    </li>`;
  }).join('');
  const g = S.terrainGain;
  return `${scene('The full survey', 'Every process in the Bank, ranked by how strong a hotspot it is: volume, repetition, measurable pain and captured data, together.')}
  <div class="verdict v-${g && g.tier}">
    <div class="ring" style="--p:${g?g.p:0}"><b>${S.cat.terrain.s}</b><span>of ${S.cat.terrain.m}</span></div>
    <div><h3>${esc(g?g.line:'')}</h3>${gainChips(g)}<p class="small">The survey took a week. Closeness to the top of this list is what counts, not agreement with it.</p></div>
  </div>
  <ol class="ladder">${rows}</ol>
  ${teamPrompt('terrain')}
  <div class="actions"><button class="btn primary" data-act="to-pick-expedition">Choose your expedition</button></div>`;
}
function viewPickExpedition(){
  const cards = S.shortlist.map(pid=>{
    const e = getExpedition(pid);
    return `<button class="routecard" data-act="pick-expedition" data-proc="${pid}">
      <span class="rfn">${icon(e.fnId)} ${esc(e.fn)}</span>
      <span class="rn">${esc(e.name)}</span>
      <span class="rmeta">${heatBar(e.rating)}<span>${e.steps.length} steps</span>${e.flagship?'<span class="tagq">Flagship</span>':''}</span>
      <span class="rd">${esc(e.intro)}</span>
      <span class="rgo">Walk this process</span>
    </button>`;
  }).join('');
  return `${scene('Pick one to walk', 'These are the processes you shortlisted. Depth beats breadth: choose one and walk every step of it. Each step costs a week.')}
  <div class="routes">${cards}</div>`;
}

/* ---------- Step dissection ---------- */
function fieldCard(step, compact){
  const v = splitVolume(step.volume);
  const pills = step.systems.split(',').map(s=>{ s = s.trim(); return `<span class="pill">${esc(s.charAt(0).toUpperCase()+s.slice(1))}</span>`; }).join('');
  return `<article class="fieldcard ${compact?'compact':''}">
    <div class="fc-top">
      <div class="fc-vol" data-ev="volume">${v.pre?`<span class="pre">${esc(v.pre)}</span>`:''}${v.big?`<b>${esc(v.big)}</b>`:''}<span class="vrest">${esc(v.rest)}</span></div>
      <dl class="fc-meta">
        <div><dt>Who does it</dt><dd>${esc(step.who)}</dd></div>
        <div data-ev="systems"><dt>Systems</dt><dd class="pills">${pills}</dd></div>
      </dl>
    </div>
    <p class="fc-notes" data-ev="notes">${emph(step.notes)}</p>
    <blockquote class="fc-pain" data-ev="pain"><span class="pl">The measured pain</span>${emph(step.pain)}</blockquote>
  </article>`;
}
function floorWord(step){
  if(S.bg!=='operator') return '';
  const d = step.discoveries[S.discOrder[step.id][0]];
  return `<aside class="floorword"><span class="fwi">${icon('interview')}</span><div><b>Word from the floor</b><p>${esc(d.text)}</p></div></aside>`;
}
function stepHead(exp, step, withArrive){
  const pips = exp.steps.map((st,i)=>{
    const a = S.stepAnswers[st.id];
    const cls = i<S.stepIndex ? 'done' + (a&&a.matchScored?' r-'+a.matchScored.tier:'') : (i===S.stepIndex?'cur':'');
    return `<li class="${cls}"></li>`;
  }).join('');
  const arrive = withArrive ? `<p class="arrive">${esc(line('arrive:'+step.id, REACT.arrive, 'arrive', {who:whoName(step.who)}))}</p>` : '';
  return `<header class="scene stephead">
    <div class="stepline"><ol class="pips" aria-hidden="true">${pips}</ol><span>Step ${S.stepIndex+1} of ${exp.steps.length}</span><span class="pn">${esc(exp.name)}</span></div>
    <h2>${esc(step.name)}</h2>
    ${arrive}
  </header>`;
}
function viewStep(){
  const exp = curExp(), step = curStep();
  const head = stepHead(exp, step, S.stepPhase==='brief');
  switch(S.stepPhase){
    case 'brief': return head + `
      ${S.stepIndex===0 ? `<p class="intro">${esc(exp.intro)}</p>` : ''}
      ${fieldCard(step)}
      ${floorWord(step)}
      <div class="actions"><button class="btn primary" data-act="step-to-profile">Profile the work</button></div>`;
    case 'profile': return head + `<div class="split">
        <div class="evidence">${fieldCard(step, true)}${floorWord(step)}</div>
        <div class="decide">${profileStepper(S.curProfile, S.dimIdx, 'profile')}
          <div class="actions">${DIMS.every(d=>S.curProfile[d.id])
            ? `<button class="btn primary" data-act="submit-profile">Compare with the field read</button>`
            : `<span class="count">${DIMS.filter(d=>S.curProfile[d.id]).length} of 4 set</span>`}</div>
        </div></div>`;
    case 'profile-reveal': return head + viewProfileReveal(step);
    case 'match': return head + viewMatch(step);
    default: return head + viewMatchReveal(step, exp);
  }
}
const DIAL_SHORT = {shape:'Shape', input:'Inputs', rep:'Volume', stakes:'Stakes'};
function profileStepper(values, idx, group){
  const dials = DIMS.map((d,i)=>{
    const v = values[d.id];
    return `<button class="dial ${i===idx?'cur':''} ${v?'set':''}" data-act="goto-dim" data-idx="${i}" data-group="${group}" aria-current="${i===idx?'step':'false'}">
      <span class="dl">${esc(DIAL_SHORT[d.id] || d.label)}</span><span class="dv">${v?esc(optName(d.opts,v)):'Not set'}</span></button>`;
  }).join('');
  const dim = DIMS[idx];
  const sel = values[dim.id];
  const selOpt = dim.opts.find(o=>o.id===sel);
  const opts = dim.opts.map(o=>`<button class="opt ${sel===o.id?'on':''}" role="radio" aria-checked="${sel===o.id}" data-act="pick-dim" data-group="${group}" data-dim="${dim.id}" data-val="${o.id}" data-def="${esc(o.d)}">${esc(o.name)}</button>`).join('');
  return `<div class="dials">${dials}</div>
    <div class="question">
      <h3>${esc(dim.q)}</h3>
      <div class="opts ${dim.opts.length>6?'many':''}" role="radiogroup" aria-label="${esc(dim.label)}">${opts}</div>
      <p class="def" id="def" aria-live="polite" data-default="${esc(selOpt?selOpt.d:'Point at an option to see what it means.')}">${esc(selOpt?selOpt.d:'Point at an option to see what it means.')}</p>
    </div>
    <div class="guide-slot" id="guideSlot"></div>`;
}
function viewProfileReveal(step){
  const res = S.stepAnswers[step.id].profileScored;
  const tier = res.total>=7?'great':(res.total>=5?'good':(res.total>=3?'mixed':'off'));
  const rows = DIMS.map((d,i)=>{
    const r = res.dims[d.id];
    const cls = r.pts===2?'match':(r.pts===1?'near':'miss');
    const ic = r.pts===2?'check':(r.pts===1?'near':'x');
    return `<li class="r-${cls}" style="--i:${i}">
      <span class="cl">${esc(d.label)}</span>
      <span class="cy">${icon(ic)}${esc(optName(d.opts,r.val))}</span>
      <span class="cf">${r.pts===2 ? 'Matches the field' : `Field: <b>${esc(optName(d.opts,r.best))}</b>`}</span>
      <details ${r.pts<2?'open':''}><summary>Why</summary><p>${esc(step.profileNotes[d.id])}</p></details>
    </li>`;
  }).join('');
  return `<div class="verdict v-${tier}">
      <div class="ring" style="--p:${res.total/8}"><b>${res.total}</b><span>of 8</span></div>
      <div><h3>${esc(line('pr:'+step.id, REACT.profile[tier], 'profile-'+tier))}</h3>${gainChips(S.lastGain)}</div>
    </div>
    <ol class="cmp">${rows}</ol>
    ${teamPrompt('profile')}
    <div class="actions"><button class="btn primary" data-act="step-to-match">Choose a capability</button></div>`;
}
function readTokens(p){
  return `<ul class="tokens" aria-label="Your read">${DIMS.map(d=>p[d.id]?`<li><span>${esc(d.label)}</span><b>${esc(optName(d.opts,p[d.id]))}</b></li>`:'').join('')}</ul>`;
}
function capCard(id){
  const c = CAPS[id];
  return `<div class="capcard">
    <h4>${esc(c.name)}</h4><p>${esc(c.one)}</p>
    <dl><div><dt>Good for</dt><dd>${c.good.map(esc).join('; ')}</dd></div>
    <div><dt>Needs</dt><dd>${esc(c.needs)}</dd></div>
    <div><dt>Watch for</dt><dd>${esc(c.watch)}</dd></div></dl>
  </div>`;
}
function capPicker(selected, act){
  return `<div class="families">${CAP_FAMILIES.map(f=>`<section class="fam fam-${f.id}" data-fam="${f.id}">
    <h4>${icon(f.id)}${esc(f.name)}</h4>
    <div class="caps">${f.caps.map(c=>`<button class="cap ${selected===c?'on':''}" data-act="${act}" data-cap="${c}" aria-pressed="${selected===c}">${esc(CAPS[c].name)}</button>`).join('')}</div>
  </section>`).join('')}</div>`;
}
function autoDial(selected, act, suggested){
  const i = AUTONOMY.findIndex(a=>a.id===selected);
  const btns = AUTONOMY.map(a=>`<button class="stop ${selected===a.id?'on':''}" role="radio" aria-checked="${selected===a.id}" data-act="${act}" data-val="${a.id}">
    <span class="sti">${icon(a.id)}</span><b>${esc(a.name)}</b>${suggested===a.id?'<span class="sug">Suggested</span>':''}</button>`).join('');
  const sel = AUTONOMY.find(a=>a.id===selected);
  return `<div class="autodial" role="radiogroup" aria-label="Autonomy" style="--a:${i<0?-1:i}">
    <div class="track" aria-hidden="true"><i></i></div>
    <div class="stops">${btns}</div>
    <p class="def">${esc(sel ? sel.d : 'From a person deciding every case, to the tool acting on its own.')}</p>
  </div>`;
}
function viewMatch(step){
  const p = S.stepAnswers[step.id].p || {};
  const ready = S.curCap && S.curAuto;
  return `<div class="split">
    <div class="evidence">${fieldCard(step, true)}<div class="yourread"><h4>Your read</h4>${readTokens(p)}</div></div>
    <div class="decide">
      <h3>Which capability does this step need?</h3>
      <p class="small">Judge by the shape of the work. Brands are left off on purpose.</p>
      <div class="guide-slot" id="guideSlot"></div>
      ${capPicker(S.curCap, 'pick-cap')}
      ${S.curCap ? capCard(S.curCap) : ''}
      <h3 class="mt">How much should it act on its own?</h3>
      ${autoDial(S.curAuto, 'pick-auto')}
      <div class="actions"><button class="btn primary" data-act="submit-match" ${ready?'':'disabled'}>Reveal the field take</button></div>
    </div>
  </div>`;
}
function autoVerdict(step, auto){
  if(auto===step.autoBest) return 'exact';
  const ord = ['assist','review','auto'];
  return ord.indexOf(auto) > ord.indexOf(step.autoBest) ? 'over' : 'under';
}
function viewMatchReveal(step, exp){
  const ans = S.stepAnswers[step.id], m = ans.matchScored;
  const label = {best:'Strong fit', ok:'Workable', poor:'Poor fit'}[m.tier];
  const av = autoVerdict(step, ans.auto);
  const yourNote = step.fitNotes[ans.cap] || step.poorNote;
  const isLast = S.stepIndex === exp.steps.length-1;
  const order = S.discOrder[step.id];
  const first = step.discoveries[order[0]], second = step.discoveries[order[1]];
  const noteCard = (d, cls)=>`<article class="fnote ${cls||''}"><span class="fni">${icon('notes')}</span><div><h4>${esc(d.title)}</h4><p>${esc(d.text)}</p><p class="eff">${esc(d.effect)}</p></div></article>`;
  let sealed;
  if(S.dug[step.id]) sealed = noteCard(second, 'fresh');
  else {
    const c = digCost(), can = c.weeks <= S.weeks;
    const cost = c.weeks===0 ? `Costs no time. ${c.why}` : `Costs ${wordNum(c.weeks)} ${plural(c.weeks,'week')}. ${c.why} ${S.weeks} ${plural(S.weeks,'week')} left.`;
    sealed = `<article class="fnote sealed"><span class="fni">${icon('interview')}</span><div>
      <h4>There is more to hear on this step</h4>
      <p>An interview with ${esc(teamOf(step.who))} adds a field note, sharpens your read on feasibility, and raises your Rigor.</p>
      <button class="btn secondary small" data-act="dig" ${can?'':'disabled'}>${icon('interview')}Interview ${esc(teamOf(step.who))}</button>
      <p class="cost">${can ? esc(cost) : 'There is no time left for interviews.'}</p></div></article>`;
  }
  const marked = S.marked.includes(step.id);
  return `<div class="verdict v-${m.tier}">
      <div class="stamp">${icon(m.tier==='best'?'check':(m.tier==='ok'?'near':'x'))}<span>${label}</span></div>
      <div><h3>${esc(line('mr:'+step.id, REACT.match[m.tier], 'match-'+m.tier))}</h3>${gainChips(S.lastGain)}</div>
    </div>
    <dl class="takes">
      <div><dt>Your pick</dt><dd><b>${esc(capName(ans.cap))}</b>. ${esc(yourNote)}</dd></div>
      ${m.tier!=='best'
        ? `<div class="ftake"><dt>The field\u2019s pick</dt><dd><b>${esc(capName(step.expertPick))}</b>. ${esc(step.expertWhy)}</dd></div>`
        : (yourNote!==step.expertWhy ? `<div class="ftake"><dt>Why it fits</dt><dd>${esc(step.expertWhy)}</dd></div>` : '')}
      <div class="${av==='exact'?'':'warnrow'}"><dt>Autonomy</dt><dd>You chose <b>${esc(autoName(ans.auto))}</b>${av==='exact'?'':`; the field chose <b>${esc(autoName(step.autoBest))}</b>`}. ${esc(line('av:'+step.id, REACT.auto[av], 'auto-'+av))} ${esc(step.autoNote)}</dd></div>
    </dl>
    <h3 class="mt">Field notes</h3>
    <div class="fnotes">${noteCard(first)}${sealed}</div>
    <button class="carry ${marked?'on':''}" data-act="toggle-mark" aria-pressed="${marked}">
      <span class="sw" aria-hidden="true"><i></i></span>
      <span><b>${marked?'Carried forward as a use-case candidate':'Carry this step forward as a use-case candidate'}</b>
      <span>${S.marked.length} carried so far. Two to four across the process is a good portfolio.</span></span>
    </button>
    ${teamPrompt('match')}
    <div class="actions"><button class="btn primary" data-act="next-step">${isLast?'Go to the reality check':'Next step'}</button></div>`;
}

/* ---------- Reality check ---------- */
function candidates(){ const e = curExp(); return e ? e.steps.filter(st=>S.marked.includes(st.id)) : []; }
function allRated(){ return candidates().every(st=>{ const r = S.realityRatings[st.id]; return r && r.data && r.risk && r.change && r.integ && r.value; }); }
function viewReality(){
  const steps = candidates();
  if(!S.realityDone){
    const blocks = steps.map(st=>{
      const r = S.realityRatings[st.id] || {};
      const ans = S.stepAnswers[st.id] || {};
      const seg = (key, label, help, goodHigh)=>`<div class="rrow"><div class="rq"><b>${esc(label)}</b><span>${esc(help)}</span></div>
        <div class="seg ${goodHigh?'goodhigh':'goodlow'}" role="radiogroup" aria-label="${esc(label)}">${LEVELS.map(l=>`<button class="${r[key]===l.id?'on':''}" role="radio" aria-checked="${r[key]===l.id}" data-act="rate" data-step="${st.id}" data-key="${key}" data-val="${l.id}">${l.name}</button>`).join('')}</div></div>`;
      const four = r.data && r.risk && r.change && r.integ;
      const fl = four ? feasOf(r) : null;
      const notes = S.notes.filter(n=>n.stepId===st.id);
      return `<article class="ground">
        <header><h3>${esc(st.name)}</h3>${ans.cap?`<span class="tok">${esc(capName(ans.cap))}</span>`:''}</header>
        <div class="evidence-chips">${notes.length ? `<h4>Your evidence</h4><ul>${notes.map(n=>`<li><b>${esc(n.title)}.</b> ${esc(n.effect)}</li>`).join('')}</ul>` : `<p class="small">No field notes on this step.</p>`}</div>
        <div class="rgrid">
          <div class="rcol">
            ${seg('data','Data readiness','How ready is the data it needs?', true)}
            ${seg('risk','Risk if it is wrong','How costly or sensitive are errors?')}
            ${seg('change','Change for the team','How much do work and habits have to change?')}
            ${seg('integ','Systems to touch','How much integration does it need?')}
          </div>
          <div class="rside">
            <div class="gauge g-${fl||'none'}"><span>Feasibility</span><b>${fl?levelName(fl):'Rate all four'}</b><span class="gbar"><i></i></span></div>
            ${seg('value','Value if it works','Your call: how big is the prize?', true)}
          </div>
        </div>
      </article>`;
    }).join('');
    return `${scene('What would it actually take?', 'A good match on paper is not a use case that survives contact with the organisation. Rate the ground each candidate has to cross. The reality check takes a week.')}
    ${teamPrompt('reality')}
    <div class="guide-slot" id="guideSlot"></div>
    ${blocks}
    <div class="actions"><button class="btn primary" data-act="plot-portfolio" ${allRated()?'':'disabled'}>${icon('plot')}Plot the portfolio</button></div>`;
  }
  const g = S.realityGain;
  const pickCards = steps.map((st,i)=>{
    const q = quadrant(st.expertFeas, st.expertValue);
    return `<button class="routecard" data-act="pick-headline" data-step="${st.id}">
      <span class="rfn"><span class="num">${i+1}</span> Candidate</span>
      <span class="rn">${esc(st.name)}</span>
      <span class="rmeta"><span class="q q-${QCLASS[q]}">Field view: ${esc(q)}</span></span>
      <span class="rd">${esc(st.realityNote)}</span>
      <span class="rgo">Build the case for this one</span>
    </button>`;
  }).join('');
  return `${scene('The portfolio', 'Quick wins build the trust that the harder, higher-value bets need. Your placement is in brass, the field\u2019s in blue; the line between them is the gap in your read.')}
  <figure class="plot">${plotSvg(steps)}</figure>
  <div class="verdict v-${g&&g.tier} slim"><div><h3>${esc(g?g.line:'')}</h3>${gainChips(g)}</div></div>
  <h3 class="mt">Choose the case you will pitch</h3>
  <div class="routes">${pickCards}</div>`;
}
function plotSvg(steps){
  const W=640, H=440, L=92, B=58, T=12, R=12;
  const cw=(W-L-R)/3, ch=(H-T-B)/3;
  let g = '';
  ['high','mid','low'].forEach((v,row)=>{
    ['low','mid','high'].forEach((f,col)=>{
      const q = quadrant(f,v);
      g += `<rect class="pc q-${QCLASS[q]}" x="${L+col*cw+2}" y="${T+row*ch+2}" width="${cw-4}" height="${ch-4}" rx="3"/>
            <text class="pq" x="${L+col*cw+12}" y="${T+row*ch+22}">${q}</text>`;
    });
    g += `<text class="pa" x="${L-12}" y="${T+row*ch+ch/2+4}" text-anchor="end">${levelName(v)}</text>`;
  });
  ['low','mid','high'].forEach((f,col)=>{ g += `<text class="pa" x="${L+col*cw+cw/2}" y="${H-B+22}" text-anchor="middle">${levelName(f)}</text>`; });
  g += `<text class="pt" x="${L+(W-L-R)/2}" y="${H-10}" text-anchor="middle">Feasibility</text>`;
  g += `<text class="pt" transform="translate(18 ${T+(H-T-B)/2}) rotate(-90)" text-anchor="middle">Value</text>`;
  const pos = (f,v,i,n,dy)=>({x: L + LEVEL_IDX[f]*cw + cw/2 + (i-(n-1)/2)*30, y: T + (2-LEVEL_IDX[v])*ch + ch/2 + dy});
  const n = steps.length;
  steps.forEach((st,i)=>{
    const r = S.realityRatings[st.id];
    const you = pos(feasOf(r), r.value, i, n, 6), fld = pos(st.expertFeas, st.expertValue, i, n, 22);
    g += `<line class="gap" x1="${you.x}" y1="${you.y}" x2="${fld.x}" y2="${fld.y}" style="--i:${i}"/>`;
    g += `<g class="dot field" style="--i:${i}"><circle cx="${fld.x}" cy="${fld.y}" r="11"/><text x="${fld.x}" y="${fld.y+4}" text-anchor="middle">${i+1}</text></g>`;
    g += `<g class="dot you" style="--i:${i}"><circle cx="${you.x}" cy="${you.y}" r="12"/><text x="${you.x}" y="${you.y+4}" text-anchor="middle">${i+1}</text></g>`;
  });
  const legend = steps.map((st,i)=>`<li><span class="num">${i+1}</span>${esc(st.name)}</li>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Portfolio: your placement and the field placement for each candidate">${g}</svg>
    <figcaption><ul class="plegend"><li class="k you"><i></i>Your placement</li><li class="k field"><i></i>Field placement</li></ul><ol class="pkeys">${legend}</ol></figcaption>`;
}

/* ---------- Canvas ---------- */
function viewCanvas(){
  const exp = curExp(), step = stepById(S.headlineStep), ans = S.stepAnswers[step.id];
  const guards = GUARDRAILS.map(g=>{
    const on = S.canvasGuardrails.includes(g.id);
    const fieldPick = S.canvasRevealed && step.guardrails.includes(g.id);
    return `<button class="guard ${on?'on':''} ${fieldPick?'fieldpick':''} ${S.canvasRevealed&&on&&!fieldPick?'extra':''}" data-act="toggle-guardrail" data-g="${g.id}" aria-pressed="${on}">
      <span class="gi">${icon(g.id)}</span><span><b>${esc(g.name)}</b><span>${esc(g.d)}</span></span>
      ${fieldPick?'<span class="fp">Field pick</span>':''}</button>`;
  }).join('');
  const echo = CONSEQUENCES.filter(c=>c.where==='canvas' && S.flags[c.flag]).map(c=>`<p class="echo">${icon('notes')}${esc(c.text)}</p>`).join('');
  const notes = S.notes.filter(n=>n.stepId===step.id);
  const q = quadrant(step.expertFeas, step.expertValue);
  return `${scene('One page you could pitch', 'Choose the guardrails this case needs before you call it done, then check them against the field view.')}
  ${echo}
  <div class="guide-slot" id="guideSlot"></div>
  <div class="guards">${guards}</div>
  ${S.canvasRevealed
    ? `<div class="verdict v-${S.canvasGain&&S.canvasGain.tier} slim"><div><h3>${esc(S.canvasGain?S.canvasGain.line:'')}</h3>${gainChips(S.canvasGain)}<p class="small">Blue outline: the field\u2019s picks. Dashed: yours, where the field differs.</p></div></div>`
    : `<div class="actions"><button class="btn secondary" data-act="reveal-canvas" ${S.canvasGuardrails.length?'':'disabled'}>Check against the field view</button></div>`}
  <article class="sheet">
    <header><p class="sorg">${esc(COMPANY.name)}, use-case canvas</p><h3>${esc(step.name)}</h3><p class="sproc">${esc(exp.name)}. ${esc(exp.fn)}.</p></header>
    <div class="sgrid">
      <div><span class="sl">Capability</span>${esc(capName(ans.cap))}</div>
      <div><span class="sl">Autonomy</span>${esc(autoName(ans.auto))}</div>
      <div><span class="sl">Field placement</span>${esc(q)}</div>
      <div class="wide"><span class="sl">Why this step</span>${emph(step.pain)}</div>
      <div class="wide"><span class="sl">Value hypothesis</span>${emph(step.valueHyp)}</div>
      <div class="wide"><span class="sl">Metric to prove it</span>${esc(step.metric)}</div>
      <div class="wide"><span class="sl">Data needed</span>${esc(step.dataNeeded)}</div>
      ${notes.length?`<div class="wide"><span class="sl">Evidence from the field</span><ul>${notes.map(n=>`<li><b>${esc(n.title)}.</b> ${esc(n.effect)}</li>`).join('')}</ul></div>`:''}
      <div class="wide"><span class="sl">Guardrails</span>${S.canvasGuardrails.length?`<ul>${S.canvasGuardrails.map(g=>`<li>${esc(GUARDRAILS.find(x=>x.id===g).name)}</li>`).join('')}</ul>`:'<span class="blank">None chosen yet</span>'}</div>
    </div>
  </article>
  ${teamPrompt('canvas')}
  <div class="actions">
    <button class="btn ghost" data-act="print-canvas">${icon('print')}Print or save this page</button>
    ${S.canvasRevealed?`<button class="btn primary" data-act="present">Present to leadership</button>`:''}
  </div>`;
}

/* ---------- Debrief ---------- */
function pathsNotTaken(){
  const exp = curExp(), out = [];
  const steps = exp.steps.filter(st=>S.stepAnswers[st.id] && S.stepAnswers[st.id].matchScored);
  const poor = steps.find(st=>S.stepAnswers[st.id].matchScored.tier==='poor');
  if(poor) out.push(`On \u201c${poor.name}\u201d, ${capName(S.stepAnswers[poor.id].cap)} was a poor fit. The field reached for ${capName(poor.expertPick)}.`);
  const off = steps.find(st=>S.stepAnswers[st.id].auto!==st.autoBest);
  if(off) out.push(`On \u201c${off.name}\u201d you chose ${autoName(S.stepAnswers[off.id].auto)}; the field chose ${autoName(off.autoBest)}. A run that matches autonomy to stakes plays very differently.`);
  const dug = Object.keys(S.dug).length;
  if(dug < exp.steps.length) out.push(`You interviewed on ${dug} of ${exp.steps.length} steps. With Trust at 7 or more, interviews cost no time.`);
  const weak = S.eventLog.find(e=>e.s<2);
  if(weak) out.push(`\u201c${weak.title}\u201d had a stronger answer. Different choices on the trail change what happens later.`);
  const untried = BACKGROUNDS.find(b=>!J.bgs.includes(b.id));
  if(untried) out.push(`You have not walked a process as ${untried.name.toLowerCase()} yet. ${untried.perk}: ${untried.perkD}`);
  const left = ENDINGS.length - Object.keys(J.endings).length;
  if(left>0) out.push(`${left} of ${ENDINGS.length} endings are still undiscovered.`);
  return out.slice(0,4);
}
function viewDebrief(){
  const exp = curExp(), e = S.ending, rank = RANKS[S.finalRank];
  const p = pct(S.score, S.maxScore);
  const bars = [['terrain','Terrain survey'],['profile','Reading the work'],['match','Matching capabilities'],['judgment','Judgment on the trail'],['reality','Reality check'],['canvas','Guardrails']].map(([k,label])=>{
    const c = S.cat[k]; if(!c.m) return '';
    const w = Math.round(100*c.s/c.m);
    return `<li><span>${esc(label)}</span><span class="tr"><i style="width:${w}%"></i></span><span class="bv">${c.s} of ${c.m}</span></li>`;
  }).join('');
  const finalStats = STATS.map(s=>`<li><span class="mi">${icon(s.icon)}</span><span>${esc(s.name)}</span><b>${S.stats[s.id]}</b></li>`).join('');
  const marks = MARKS.map(m=>{
    const on = !!J.marks[m.id], isNew = S.newMarks.includes(m.id);
    return `<li class="mk ${on?'on':''} ${isNew?'new':''}"><span class="mki">${icon(on?m.icon:'lock')}</span><span><b>${esc(m.name)}</b>${isNew?' <span class="newtag">New</span>':''}<span>${esc(m.d)}</span></span></li>`;
  }).join('');
  const kindIcon = {terrain:'map', event:'interview', step:'flag', dig:'notes', rank:'mark', effect:'spark', reality:'plot', canvas:'doc', pick:'route'};
  const log = S.log.map(l=>`<li class="lg-${l.kind}"><span class="li">${icon(kindIcon[l.kind]||'compass')}</span><div><p>${esc(l.text)}</p>${l.d||l.xp?gainChips({xp:l.xp||null, d:l.d}):''}</div></li>`).join('');
  const echoes = CONSEQUENCES.filter(c=>c.where==='debrief' && S.flags[c.flag]).map(c=>`<p class="echo">${icon('notes')}${esc(c.text)}</p>`).join('');
  const found = Object.keys(J.endings).length;
  const others = BACKGROUNDS.filter(b=>b.id!==S.bg);
  const caps = Object.values(S.stepAnswers).map(a=>a.cap), autos = Object.values(S.stepAnswers).map(a=>a.auto);
  return `<section class="ending e-${e.id}">
      <p class="ekick">Ending ${ENDINGS.findIndex(x=>x.id===e.id)+1} of ${ENDINGS.length}. You have found ${found}.</p>
      <h2>${esc(e.name)}</h2>
      <p class="etext">${esc(e.d)}</p>
      ${echoes}
      <div class="erank"><span class="mi">${icon('mark')}</span><div><b>${esc(rank.name)}</b><span>${S.score} XP, ${p}% of the points on offer</span></div></div>
      <ul class="estats">${finalStats}<li><span class="mi">${icon('weeks')}</span><span>Weeks left</span><b>${S.weeks}</b></li><li><span class="mi">${icon('notes')}</span><span>Field notes</span><b>${S.notes.length}</b></li></ul>
    </section>
    <p class="rankd">${esc(rank.d)}</p>
    <div class="dgrid2">
      <section><h3>Where the points came from</h3><ul class="bars">${bars}</ul></section>
      <section><h3>Paths not taken</h3><ul class="paths">${pathsNotTaken().map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section>
    </div>
    <section class="replay">
      <h3>Try another approach</h3>
      <div class="replaybtns">
        ${others.map(b=>`<button class="btn secondary" data-act="replay-bg" data-bg="${b.id}">${icon('replay')}Walk ${esc(exp.name.toLowerCase())} as ${esc(b.name.toLowerCase())}</button>`).join('')}
        <button class="btn primary" data-act="new-expedition">Start a new expedition</button>
        <button class="btn ghost" data-act="start-apply">Map your own process</button>
      </div>
    </section>
    <section><h3>Marks</h3><ul class="marks">${marks}</ul></section>
    <section><h3>Your expedition log</h3><ol class="xlog">${log}</ol></section>
    ${toolRecsSection(caps, autos)}
    <details class="method"><summary>The method in eight lines</summary><ul class="takeaways">${TAKEAWAYS.map(t=>`<li><b>${esc(t.h)}</b><span>${esc(t.d)}</span></li>`).join('')}</ul></details>`;
}

/* ---------- Tool recommendations ---------- */
let aiToken = 0;
function toolRecsSection(caps, autos){
  const uniq = Array.from(new Set(caps.filter(Boolean)));
  const au = Array.from(new Set(autos.filter(Boolean)));
  const tools = TOOL_RECS.suggestForCapabilities(uniq, au, ['mid']);
  if(!tools.length) return '';
  const note = tools.note ? `<p class="caution">${esc(tools.note)}</p>` : '';
  const echo = CONSEQUENCES.filter(c=>c.where==='tools' && S.flags[c.flag]).map(c=>`<p class="echo">${icon('notes')}${esc(c.text)}</p>`).join('');
  if(AI.enabled){
    const my = ++aiToken;
    AI.suggestTools(uniq, au, ['mid']).then(enh=>{
      if(my!==aiToken) return;
      const slot = document.getElementById('toolReason');
      if(slot && enh && enh[0] && enh[0].reasoning) slot.innerHTML = `<p class="toolwhy">${esc(enh[0].reasoning)}</p>`;
    });
  }
  return `<section class="tools">
    <h3>Approved tools for what you found</h3>
    <p class="small">Matched to the capability types you chose. Brands come last, on purpose.</p>
    ${echo}${note}
    ${tools.map((t,i)=>TOOL_RECS.formatAsCard(t,i)).join('')}
    <div id="toolReason"></div>
  </section>`;
}

/* =====================================================================
   APPLY MODE
   ===================================================================== */
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
  return `${scene('Name what you are about to dissect', 'One real process from your organisation. Not the whole department: one process, the way you walked a single one in the expedition.')}
  <div class="form">
    <div class="formfield"><label for="org">Organisation or team</label><input class="in" id="org" value="${esc(S.applyOrg)}" placeholder="For example, Riverside Health Network"></div>
    <div class="formfield"><label for="proc">The process</label><input class="in" id="proc" value="${esc(S.applyProcess)}" placeholder="For example, patient intake and scheduling">
      <span class="hint">Something with real volume: it happens many times, not once a year.</span></div>
  </div>
  <div class="actions"><button class="btn primary" data-act="apply-to-steps">List the steps</button></div>`;
}
function viewApplySteps(){
  const rows = S.applySteps.map((st,i)=>`<div class="steprow">
      <span class="num">${i+1}</span>
      <input class="in" data-act="apply-step-name" data-idx="${i}" value="${esc(st.name)}" placeholder="Step name, for example, triage the inbox" aria-label="Step ${i+1} name">
      <input class="in" data-act="apply-step-notes" data-idx="${i}" value="${esc(st.notes)}" placeholder="What actually happens here, in a sentence" aria-label="Step ${i+1} description">
      <button class="iconbtn" data-act="apply-step-remove" data-idx="${i}" aria-label="Remove step ${i+1}">${icon('close')}</button>
    </div>`).join('');
  return `${scene(`Break \u201c${esc(S.applyProcess||'your process')}\u201d into steps`, 'List it the way it actually runs, start to finish. Three to eight steps is normal. You will walk each one next.')}
  <div class="steprows">${rows}</div>
  ${S.applyStepsError?`<p class="caution">Name at least two steps before you start walking the process.</p>`:''}
  <div class="actions">
    <button class="btn ghost" data-act="apply-step-add">Add a step</button>
    <button class="btn primary" data-act="apply-to-walk">Start walking the process</button>
  </div>`;
}
function viewApplyWalk(){
  const st = S.applySteps[S.applyIndex];
  const ans = S.applyAnswers[S.applyIndex] || (S.applyAnswers[S.applyIndex] = {p:{}, cap:null, auto:null, guardrails:[], metric:'', data:''});
  const head = `<header class="scene stephead"><div class="stepline"><span>Step ${S.applyIndex+1} of ${S.applySteps.length}</span><span class="pn">${esc(S.applyProcess)}</span></div>
    <h2>${esc(st.name)}</h2>${st.notes?`<p class="arrive">${esc(st.notes)}</p>`:''}</header>`;
  if(S.applyPhase==='profile'){
    return head + `<div class="decide solo">${profileStepper(ans.p, S.applyDim, 'apply')}
      <div class="actions">${DIMS.every(d=>ans.p[d.id])
        ? `<button class="btn primary" data-act="apply-submit-profile">See suggested capabilities</button>`
        : `<span class="count">${DIMS.filter(d=>ans.p[d.id]).length} of 4 set</span>`}</div></div>`;
  }
  const sug = suggestCaps(ans.p);
  const suggestList = sug.caps.map(s=>`<button class="suggest ${ans.cap===s.id?'on':''}" data-act="apply-pick-cap" data-cap="${s.id}" aria-pressed="${ans.cap===s.id}">
      <span class="sgh"><b>${esc(capName(s.id))}</b><span class="tier t-${s.tier}">${s.tier==='best'?'Strong fit':'Workable'}</span></span>
      <span>${esc(s.why)}</span></button>`).join('');
  const recAuto = suggestAutonomy(ans.p);
  const recG = ans.cap ? suggestGuardrails(ans.p, ans.cap) : [];
  const guards = GUARDRAILS.map(g=>{
    const on = ans.guardrails.includes(g.id);
    return `<button class="guard ${on?'on':''}" data-act="apply-toggle-guardrail" data-g="${g.id}" aria-pressed="${on}"><span class="gi">${icon(g.id)}</span><span><b>${esc(g.name)}</b><span>${esc(g.d)}</span></span>${recG.includes(g.id)?'<span class="fp">Suggested</span>':''}</button>`;
  }).join('');
  const isLast = S.applyIndex === S.applySteps.length-1;
  return head + `<div class="yourread">${readTokens(ans.p)}</div>
    <h3 class="mt">Suggested for this shape of work</h3>
    ${sug.cautions.map(c=>`<p class="caution">${esc(c)}</p>`).join('')}
    <div class="suggests">${suggestList || '<p class="small">No strong suggestion for this combination. Browse the full toolkit below.</p>'}</div>
    <details class="browse"><summary>Browse the full toolkit</summary>${capPicker(ans.cap,'apply-pick-cap')}</details>
    ${ans.cap ? capCard(ans.cap) : ''}
    <h3 class="mt">How much should it act on its own?</h3>
    ${autoDial(ans.auto, 'apply-pick-auto', recAuto)}
    <h3 class="mt">Guardrails</h3>
    <div class="guards">${guards}</div>
    <div class="form mt">
      <div class="formfield"><label for="metric">The metric that would prove it worked</label><input class="in" id="metric" data-act="apply-metric" value="${esc(ans.metric)}" placeholder="For example, minutes per case, error rate, cost per item"></div>
      <div class="formfield"><label for="dataneed">Data or access it would need</label><textarea class="in" id="dataneed" data-act="apply-data">${esc(ans.data)}</textarea></div>
    </div>
    <div class="actions">
      <button class="btn ghost" data-act="apply-back-profile">${icon('back')}Back to the profile</button>
      <button class="btn primary" data-act="apply-next-step" ${ans.cap&&ans.auto?'':'disabled'}>${isLast?'Build your canvas':'Next step'}</button>
    </div>`;
}
function viewApplyCanvas(){
  const sheets = S.applySteps.map((st,i)=>{
    const a = S.applyAnswers[i] || {};
    const blank = '<span class="blank">Not set</span>';
    return `<article class="sheet">
      <header><p class="sorg">${esc(S.applyOrg||'Your organisation')}, use-case canvas</p><h3>${esc(st.name)}</h3><p class="sproc">${esc(S.applyProcess)}</p></header>
      <div class="sgrid">
        <div><span class="sl">Shape of the work</span>${a.p&&a.p.shape?esc(optName(SHAPES,a.p.shape)):blank}</div>
        <div><span class="sl">Capability</span>${a.cap?esc(capName(a.cap)):blank}</div>
        <div><span class="sl">Autonomy</span>${a.auto?esc(autoName(a.auto)):blank}</div>
        <div class="wide"><span class="sl">Metric</span>${a.metric?esc(a.metric):blank}</div>
        <div class="wide"><span class="sl">Guardrails</span>${a.guardrails&&a.guardrails.length?`<ul>${a.guardrails.map(g=>`<li>${esc(GUARDRAILS.find(x=>x.id===g).name)}</li>`).join('')}</ul>`:blank}</div>
        <div class="wide"><span class="sl">Data or access needed</span>${a.data?esc(a.data):blank}</div>
      </div></article>`;
  }).join('');
  const caps = Object.values(S.applyAnswers).map(a=>a.cap), autos = Object.values(S.applyAnswers).map(a=>a.auto);
  return `${scene(esc(S.applyProcess||'Your process'), `${esc(S.applyOrg||'Your organisation')}. One card per step, ready to bring into a planning conversation.`)}
  ${sheets}
  ${toolRecsSection(caps, autos)}
  <div class="actions">
    <button class="btn ghost" data-act="print-canvas">${icon('print')}Print or save this page</button>
    <button class="btn primary" data-act="restart">Back to the start</button>
  </div>`;
}

/* =====================================================================
   EVENTS
   ===================================================================== */
function planEvents(){
  const plan = {};
  Object.keys(EVENT_SLOTS).forEach(slot=>{
    plan[slot] = shuffle(EVENT_POOL.filter(e=>e.slot===slot).map(e=>e.id)).slice(0, EVENT_SLOTS[slot]);
  });
  return plan;
}
function eventStep(slot){
  const exp = curExp(); if(!exp) return null;
  if(slot==='team' || slot==='metric') return stepById(S.headlineStep) || exp.steps[0];
  if(slot==='data') return stepById(S.marked[0]) || exp.steps[S.stepIndex];
  return exp.steps[S.stepIndex] || exp.steps[0];
}
function triggerEvent(slot, n, cb){
  const id = S.plan && S.plan[slot] && S.plan[slot][n];
  if(!id || S.eventsShown[id]){ cb(); return; }
  S.eventsShown[id] = true;
  const ev = EVENT_POOL.find(e=>e.id===id);
  const st = eventStep(slot);
  const vars = {who: st ? whoName(st.who) : 'team', team: st ? teamOf(st.who) : 'the team', proc: curExp() ? curExp().name.toLowerCase() : ''};
  const lead = EVENT_LEADS.filter(l=>l.test(S));
  const echo = CONSEQUENCES.find(c=>c.where==='lead:'+slot && S.flags[c.flag]);
  S.modal = {id, slot, phase:'choose', order:shuffle(ev.opts.map((_,i)=>i)), chosen:null, cb, vars,
    lead: lead.length ? lead[Math.floor(Math.random()*lead.length)].text : null,
    echo: echo ? echo.text : null};
  render();
}
function snapshot(){
  return JSON.stringify({stats:S.stats, weeks:S.weeks, overrun:S.overrun, score:S.score, maxScore:S.maxScore, cat:S.cat, flags:S.flags, once:S.once, effectsOn:S.effectsOn, rankIdx:S.rankIdx, logLen:S.log.length, evLen:S.eventLog.length});
}
function restore(snap){
  const o = JSON.parse(snap);
  Object.assign(S, {stats:o.stats, weeks:o.weeks, overrun:o.overrun, score:o.score, maxScore:o.maxScore, cat:o.cat, flags:o.flags, once:o.once, effectsOn:o.effectsOn, rankIdx:o.rankIdx});
  S.log.length = o.logLen; S.eventLog.length = o.evLen;
  shownScore = S.score;
}
function renderModal(){
  const wrap = document.getElementById('modal'), card = document.getElementById('modalCard');
  if(!S.modal){ wrap.hidden = true; card.innerHTML = ''; return; }
  const M = S.modal, ev = EVENT_POOL.find(e=>e.id===M.id);
  const head = `<p class="dfrom">${icon(ev.from.indexOf('sponsor')>=0?'cred':(ev.from.indexOf('floor')>=0?'trust':'interview'))}${esc(ev.from)}</p>
    <h3 id="evTitle">${esc(ev.title)}</h3>
    ${M.echo?`<p class="echo">${icon('notes')}${esc(M.echo)}</p>`:''}
    ${M.lead?`<p class="leadin">${esc(M.lead)}</p>`:''}`;
  let body;
  if(M.phase==='choose'){
    body = `<p class="dtext">${esc(fill(ev.text, M.vars))}</p>
      <div class="choices" role="group" aria-label="How do you respond?">
        ${M.order.map(i=>`<button class="choice" data-act="event-choose" data-idx="${i}">${esc(fill(ev.opts[i].t, M.vars))}</button>`).join('')}
      </div>`;
  } else {
    const o = ev.opts[M.chosen];
    const tag = o.s===2 ? ['good','Solid instinct'] : (o.s===1 ? ['ok','Workable, but'] : ['bad','Off track']);
    body = `<p class="dchosen">${esc(fill(o.t, M.vars))}</p>
      <p class="vtag vt-${tag[0]}">${esc(tag[1])}</p>
      ${gainChips({xp:o.s, d:M.applied})}
      <p class="dtext">${esc(o.fb)}</p>
      <div class="actions">
        ${S.bg==='strategist' && S.rethinks>0 && o.s<2 ? `<button class="btn ghost" data-act="event-rethink">${icon('replay')}Rethink (once per expedition)</button>` : ''}
        <button class="btn primary" data-act="event-continue">Continue</button>
      </div>`;
  }
  card.innerHTML = head + body;
  card.setAttribute('aria-labelledby','evTitle');
  const opening = wrap.hidden;
  wrap.hidden = false;
  if(opening || M.phase==='feedback'){
    const f = card.querySelector(M.phase==='choose' ? '.choice' : '[data-act="event-continue"]');
    if(f) setTimeout(()=>f.focus({preventScroll:true}), 30);
  }
}

/* =====================================================================
   FIELD GUIDE: help at the moment of need
   ===================================================================== */
const G = {open:false, tier:1, key:null, ai:null, aiBusy:false, autoShown:{}, lastAct:Date.now(), manual:false};

function decisionNow(){
  if(S.modal) return null;
  if(S.mode==='guided'){
    if(S.stage==='terrain-map') return {key:'terrain', type:'terrain', answered:S.shortlist.length>0};
    if(S.stage==='step'){
      const st = curStep();
      if(S.stepPhase==='profile'){ const dim = DIMS[S.dimIdx]; return {key:`p:${st.id}:${dim.id}`, type:'dim', dim, step:st, answered:!!S.curProfile[dim.id]}; }
      if(S.stepPhase==='match'){ const sub = !S.curCap ? 'cap' : 'auto'; return {key:`m:${st.id}:${sub}`, type:sub, step:st, answered:!!(S.curCap && S.curAuto)}; }
    }
    if(S.stage==='reality' && !S.realityDone) return {key:'reality', type:'reality', answered:allRated()};
    if(S.stage==='canvas' && !S.canvasRevealed) return {key:'canvas', type:'canvas', answered:S.canvasGuardrails.length>0};
  }
  if(S.mode==='apply' && S.stage==='apply-walk' && S.applyPhase==='profile'){
    const dim = DIMS[S.applyDim], a = S.applyAnswers[S.applyIndex] || {p:{}};
    return {key:`ap:${S.applyIndex}:${dim.id}`, type:'apply-dim', dim, answered:!!a.p[dim.id]};
  }
  return null;
}
function guideText(d){
  if(!d) return null;
  if(d.type==='dim'){
    const ex = d.step.expert[d.dim.id];
    return {ask:HINTS.dimAsk[d.dim.id], where:HINTS[d.dim.id][ex], target:`[data-ev="${HINTS.dimWhere[d.dim.id]}"]`,
      miss: S.missNext==='profile' && d.dim.id==='shape' ? HINTS.missProfile : null};
  }
  if(d.type==='cap'){
    const p = (S.stepAnswers[d.step.id]||{}).p || {};
    const fam = famOf(d.step.expertPick);
    const rule = d.step.fit.best.some(c=>c==='rules'||c==='fix');
    return {ask:fill(HINTS.capAsk,{shape:optName(SHAPES,p.shape).toLowerCase()}),
      where:fill(HINTS.capFam,{fam:fam.name}) + (rule && fam.id!=='none' ? ' ' + HINTS.capRule : ''),
      target:`[data-fam="${fam.id}"]`, miss: S.missNext==='match' ? HINTS.missMatch : null};
  }
  if(d.type==='auto'){
    const p = (S.stepAnswers[d.step.id]||{}).p || {};
    return {ask:fill(HINTS.autoAsk,{stakes:levelName(p.stakes).toLowerCase()}), where:HINTS.auto[d.step.autoBest], target:'[data-ev="pain"]'};
  }
  if(d.type==='terrain') return {ask:HINTS.terrainAsk, where:HINTS.terrainWhere, target:'.station.heat-4, .station.heat-3'};
  if(d.type==='reality'){
    const thin = candidates().some(st=>!S.dug[st.id]);
    return {ask:HINTS.realityAsk, where:HINTS.realityWhere + (thin ? ' ' + HINTS.realityThin : ''), target:'.evidence-chips'};
  }
  if(d.type==='canvas'){
    const st = stepById(S.headlineStep), a = S.stepAnswers[st.id];
    const g = GUARDRAILS.find(x=>x.id===st.guardrails[0]);
    return {ask:HINTS.canvasAsk, where:fill(HINTS.canvasWhere,{cap:capName(a.cap), auto:autoName(a.auto).toLowerCase(), g:g.name.toLowerCase()}), target:`[data-g="${g.id}"]`};
  }
  if(d.type==='apply-dim') return {ask:HINTS.dimAsk[d.dim.id], where:'There is no single right answer for your own process. Pick the option a newcomer to the team would recognise.', target:null};
  return null;
}
function guideVisible(){ return S.stage!=='hero' && S.stage!=='setup' && S.stage!=='debrief' && !S.modal; }
function syncGuide(){
  const d = decisionNow();
  const key = d ? d.key : null;
  if(key !== G.key){
    G.key = key; G.tier = 1; G.ai = null; G.aiBusy = false; G.lastAct = Date.now();
    if(!G.manual) G.open = false;
    if(d && !d.answered){
      if(S.guide==='ropes') G.open = true;
      else if(S.guide==='stall' && S.missNext && ((S.missNext==='match' && d.type==='cap') || (S.missNext==='profile' && d.type==='dim' && d.dim.id==='shape'))) { G.open = true; }
    }
  }
  renderGuide();
}
function renderGuide(){
  const el = document.getElementById('guide');
  if(!el) return;
  const slot = document.getElementById('guideSlot');
  document.querySelectorAll('.ev-glow').forEach(x=>x.classList.remove('ev-glow'));
  if(!guideVisible()){ el.hidden = true; el.innerHTML = ''; if(slot) slot.innerHTML = ''; return; }
  const fab = `<button class="guide-fab" data-gact="open" aria-expanded="false">${icon('compass')}<span>Field guide</span></button>`;
  if(!G.open){
    el.hidden = false; el.className = 'guide'; el.innerHTML = fab;
    if(slot) slot.innerHTML = '';
    return;
  }
  const d = decisionNow(), t = guideText(d);
  const levels = GUIDANCE.map(g=>`<button class="${S.guide===g.id?'on':''}" data-gact="level" data-level="${g.id}" aria-pressed="${S.guide===g.id}" title="${esc(g.d)}">${esc(g.name)}</button>`).join('');
  let body;
  if(!t) body = `<p class="g-ask">Nothing to decide on this screen. The guide is here again at the next decision.</p>`;
  else {
    body = `${t.miss?`<p class="g-miss">${esc(t.miss)}</p>`:''}<p class="g-ask">${esc(t.ask)}</p>
      ${G.tier>=2 ? `<p class="g-where">${icon('spark')}${esc(t.where)}</p>` : `<button class="g-btn" data-gact="more">${icon('spark')}Point me to the evidence</button>`}
      ${AI.enabled && d && d.step ? (G.ai ? `<p class="g-ai">${esc(G.ai)}</p>` : `<button class="g-btn" data-gact="ai" ${G.aiBusy?'disabled':''}>${G.aiBusy?'Thinking\u2026':'Ask the AI guide'}</button>`) : ''}`;
  }
  const card = `<section class="guide-card" aria-label="Field guide">
    <header><span>${icon('compass')}Field guide</span><button class="iconbtn" data-gact="close" aria-label="Close the field guide">${icon('close')}</button></header>
    <div class="g-body" aria-live="polite">${body}</div>
    <footer><span>Guidance</span><div class="g-levels">${levels}</div></footer>
  </section>`;
  if(slot && t){
    // Inline, right where the decision is being made.
    const fresh = !slot.firstChild;
    slot.innerHTML = card; slot.classList.toggle('fresh', fresh);
    el.hidden = true; el.innerHTML = '';
  } else {
    el.hidden = false; el.className = 'guide open'; el.innerHTML = card;
  }
  if(t && G.tier>=2 && t.target){ document.querySelectorAll(t.target).forEach(x=>x.classList.add('ev-glow')); }
}
function guideAction(ds){
  const d = decisionNow();
  switch(ds.gact){
    case 'open': G.open = true; G.manual = true; break;
    case 'close': G.open = false; G.manual = false; if(d) G.autoShown[d.key] = true; break;
    case 'more':
      G.tier = 2;
      if(d && !S.hintedKeys[d.key] && S.mode==='guided'){ S.hintedKeys[d.key] = true; S.hintsUsed++; }
      break;
    case 'ai': {
      if(!d || !d.step) break;
      G.aiBusy = true;
      if(!S.hintedKeys[d.key] && S.mode==='guided'){ S.hintedKeys[d.key] = true; S.hintsUsed++; }
      const st = d.step, key = d.key;
      const decision = d.type==='dim' ? d.dim.q : (d.type==='cap' ? 'Which capability does this step need?' : 'How much should the tool act on its own?');
      const choices = d.type==='dim' ? d.dim.opts.map(o=>o.name).join(', ') : (d.type==='cap' ? Object.values(CAPS).map(c=>c.name).join(', ') : AUTONOMY.map(a=>a.name).join(', '));
      const p = S.curProfile;
      const sofar = Object.keys(p).map(k=>`${k}: ${p[k]}`).join('; ');
      AI.guide({step:st.name, notes:st.notes, pain:st.pain, decision, choices, sofar}).then(txt=>{
        if(G.key!==key) return;
        G.aiBusy = false; G.ai = txt || 'The AI guide did not answer. Use the pointer above instead.';
        renderGuide();
      });
      break;
    }
    case 'level':
      S.guide = ds.level;
      try{ localStorage.setItem('gw_guide', S.guide); }catch(e){}
      break;
  }
  renderGuide();
}
function guideTick(){
  if(!guideVisible() || G.open || S.guide!=='stall') return;
  const d = decisionNow();
  if(!d || d.answered || G.autoShown[d.key]) return;
  if(Date.now() - G.lastAct > 25000){ G.autoShown[d.key] = true; G.open = true; G.manual = false; renderGuide(); }
}

/* =====================================================================
   FLOW
   ===================================================================== */
function startGuidedRun(){
  const bg = bgOf(S.bg);
  S.stats = {...bg.stats};
  S.weeks = START_WEEKS + (S.bg==='strategist' ? 2 : 0);
  S.maxWeeks = S.weeks;
  S.freeDigs = S.bg==='analyst' ? 2 : 0;
  S.rethinks = S.bg==='strategist' ? 1 : 0;
  S.plan = planEvents();
  S.effectsOn = {trustHigh:S.stats.trust>=7, trustLow:S.stats.trust<=2, rigorHigh:S.stats.rigor>=7};
  shownScore = 0;
}
function startExpedition(pid){
  const exp = getExpedition(pid);
  S.procId = pid; S.stage = 'step'; S.stepIndex = 0;
  const n = exp.steps.length;
  const a = Math.max(0, Math.round(n*.33)-1), b = Math.max(a+1, Math.round(n*.75)-1);
  S.trailAt = [a, b].filter(i=>i < n-1);
  S.projTotal = S.cat.terrain.m + n*13 + 12 + Math.min(3,n)*4 + 3;
  S.rankIdx = Math.max(S.rankIdx, liveRankIdx());
  logIt('pick', `Set out on ${exp.name}: ${n} steps.`);
  startStep();
}
function startStep(){
  const st = curStep();
  S.stepPhase = 'brief'; S.dimIdx = 0; S.curProfile = {}; S.curCap = null; S.curAuto = null; S.lastGain = null;
  if(!S.stepAnswers[st.id]) S.stepAnswers[st.id] = {};
  if(!S.discOrder[st.id]) S.discOrder[st.id] = Math.random()<.5 ? [0,1] : [1,0];
  if(S.bg==='operator') collectNote(st, S.discOrder[st.id][0]);
}
function collectNote(st, i){
  const d = st.discoveries[i];
  if(S.notes.some(n=>n.stepId===st.id && n.title===d.title)) return;
  S.notes.push({stepId:st.id, title:d.title, text:d.text, effect:d.effect});
  fxq.push({stat:'notes', v:1});
}
function finishStep(){
  const st = curStep(), a = S.stepAnswers[st.id];
  spendWeeks(1);
  const tier = {best:'strong fit', ok:'workable fit', poor:'poor fit'}[a.matchScored.tier];
  logIt('step', `${st.name}: read ${a.profileScored.total} of 8, ${capName(a.cap)} (${tier}), ${autoName(a.auto)}.`, null, a.profileScored.total + a.matchScored.total);
  toast('waypoint', pickFrom(REACT.waypoint,'wp'), `${st.name}. ${S.weeks} ${plural(S.weeks,'week')} to the meeting.`);
}
function finalize(){
  if(S.finalized) return;
  S.finalized = true;
  const exp = curExp(), p = S.maxScore ? S.score/S.maxScore : 0;
  S.ending = ENDINGS.find(e=>e.test(S,p));
  S.finalRank = finalRankIdx();
  // marks
  awardMark('first');
  if(exp.flagship && !J.flagships.includes(exp.id)) J.flagships.push(exp.id);
  if(J.flagships.length>=4) awardMark('flagships');
  if(!exp.flagship) awardMark('offpath');
  if(exp.rating<=2) awardMark('lowroad');
  const steps = exp.steps;
  if(steps.every(st=>S.stepAnswers[st.id] && S.stepAnswers[st.id].auto===st.autoBest)) awardMark('steady');
  if(S.hintsUsed===0) awardMark('unaided');
  if(steps.every(st=>S.dug[st.id])) awardMark('digger');
  if(!J.bgs.includes(S.bg)) J.bgs.push(S.bg);
  if(J.bgs.length>=3) awardMark('allbg');
  if(S.finalRank===RANKS.length-1) awardMark('lead');
  if(S.weeks>=3 && !S.overrun) awardMark('ontime');
  J.runs++;
  J.endings[S.ending.id] = true;
  J.history.unshift({proc:exp.name, bg:bgOf(S.bg).name.toLowerCase(), ending:S.ending.name, pct:Math.round(p*100), rank:RANKS[S.finalRank].name});
  J.history = J.history.slice(0,6);
  saveJournal();
}

/* =====================================================================
   ACTIONS
   ===================================================================== */
function handleAction(ds){
  const act = ds.act;
  G.lastAct = Date.now();
  switch(act){
    case 'restart': S = fresh(); shownScore = 0; G.manual = false; G.open = false; render(); return;

    case 'ai-settings': {
      const m = document.getElementById('aiModel'); if(m) m.value = AI.model || '';
      const k = document.getElementById('aiKey'); if(k) k.value = '';
      const status = document.getElementById('aiStatus');
      if(status){ status.textContent = AI.enabled ? `Connected. Model: ${AI.model}` : 'Not connected. The field guide uses its built-in hints until you connect.'; status.className = 'small ' + (AI.enabled?'ok':''); }
      document.getElementById('aiSettings').hidden = false;
      return;
    }
    case 'ai-cancel': document.getElementById('aiSettings').hidden = true; return;
    case 'ai-connect': connectAI(); return;

    case 'start-guided': { const g = S.guide; S = fresh(); S.guide = g; S.mode = 'guided'; S.stage = 'setup'; render(); return; }
    case 'start-apply': { const g = S.guide; S = fresh(); S.guide = g; S.mode = 'apply'; S.stage = 'apply-setup'; render(); return; }
    case 'new-expedition': { const g = S.guide; S = fresh(); S.guide = g; S.mode = 'guided'; S.stage = 'setup'; render(); return; }
    case 'replay-bg': {
      const pid = S.procId, g = S.guide;
      S = fresh(); S.guide = g; S.mode = 'guided'; S.stage = 'setup'; S.replay = pid; S.bg = ds.bg; render(); return;
    }
    case 'pick-bg': S.bg = ds.bg; render(); return;
    case 'pick-guide': S.guide = ds.level; try{ localStorage.setItem('gw_guide', S.guide); }catch(e){} render(); return;
    case 'setup-go': {
      if(!S.bg) return;
      startGuidedRun();
      if(S.replay){
        S.shortlist = [S.replay]; S.terrainRevealed = true;
        logIt('pick', `Returned as ${bgOf(S.bg).name.toLowerCase()}.`);
        triggerEvent('sponsor', 0, ()=>{ startExpedition(S.replay); render(); });
        return;
      }
      S.stage = 'terrain-map'; render(); return;
    }

    case 'view-fn': S.viewFn = S.viewFn===ds.fn ? null : ds.fn; render(); return;
    case 'toggle-shortlist': {
      const i = S.shortlist.indexOf(ds.proc);
      if(i>=0) S.shortlist.splice(i,1);
      else if(S.shortlist.length<3) S.shortlist.push(ds.proc);
      render(); return;
    }
    case 'goto-terrain-reveal': {
      if(!S.terrainRevealed){
        let earned = 0, cred = 0;
        S.shortlist.forEach(pid=>{
          const r = findProcessMeta(pid).proc.rating;
          const e = [0,0,1,4,7,10][r] || 0;
          earned += e; score('terrain', e, 10);
          if(r>=4) cred = Math.min(2, cred+1); else if(r<=2) cred -= 1;
        });
        spendWeeks(1);
        const d = adjust({cred});
        const p = S.cat.terrain.s / Math.max(1,S.cat.terrain.m);
        const band = p>=.7 ? 'high' : (p>=.4 ? 'mid' : 'low');
        S.terrainGain = {xp:earned, d, p, tier: band==='high'?'great':(band==='mid'?'good':'off'),
          line: band==='high' ? 'You went where the volume is.' : band==='mid' ? 'Some of your picks are true hotspots.' : 'The hottest ground was elsewhere.'};
        toast('dispatch', `From ${SPONSOR.name}`, DISPATCH.terrain[band]);
        logIt('terrain', `Shortlisted ${S.shortlist.map(pid=>findProcessMeta(pid).proc.name).join(', ')}.`, d, earned);
        S.terrainRevealed = true;
      }
      S.stage = 'terrain-reveal'; render(); return;
    }
    case 'to-pick-expedition':
      triggerEvent('sponsor', 0, ()=>{ S.stage = 'pick-expedition'; render(); });
      return;
    case 'pick-expedition': startExpedition(ds.proc); render(); return;

    case 'step-to-profile': S.stepPhase = 'profile'; S.dimIdx = 0; render(); return;
    case 'goto-dim': {
      if(ds.group==='apply') S.applyDim = parseInt(ds.idx,10); else S.dimIdx = parseInt(ds.idx,10);
      render(); return;
    }
    case 'pick-dim': {
      const apply = ds.group==='apply';
      const vals = apply ? S.applyAnswers[S.applyIndex].p : S.curProfile;
      vals[ds.dim] = ds.val;
      render();
      const idx = apply ? S.applyDim : S.dimIdx;
      const nextUnset = DIMS.findIndex((d,i)=>i>idx && !vals[d.id]);
      const target = nextUnset>=0 ? nextUnset : DIMS.findIndex(d=>!vals[d.id]);
      if(target>=0 && target!==idx){
        const tok = ++advanceToken;
        setTimeout(()=>{
          if(tok!==advanceToken) return;
          if(apply) S.applyDim = target; else S.dimIdx = target;
          render();
          const f = document.querySelector('.question .opt'); if(f) f.focus({preventScroll:true});
        }, 320);
      } else if(target<0){
        setTimeout(()=>{ const b = document.querySelector('[data-act="submit-profile"],[data-act="apply-submit-profile"]'); if(b) b.focus({preventScroll:true}); }, 40);
      }
      return;
    }
    case 'submit-profile': {
      const st = curStep();
      const res = scoreProfile(st, S.curProfile);
      score('profile', res.total, 8);
      const d = adjust({rigor: res.total>=7 ? 1 : (res.total<=3 ? -1 : 0)});
      S.stepAnswers[st.id].p = {...S.curProfile};
      S.stepAnswers[st.id].profileScored = res;
      S.lastGain = {xp:res.total, d};
      S.missNext = res.total<=3 ? 'profile' : (S.missNext==='profile' ? null : S.missNext);
      S.stepPhase = 'profile-reveal'; render(); return;
    }
    case 'step-to-match': S.stepPhase = 'match'; render(); return;
    case 'pick-cap': S.curCap = ds.cap; render(); return;
    case 'pick-auto': S.curAuto = ds.val; render(); return;
    case 'submit-match': {
      const st = curStep();
      const m = scoreMatch(st, S.curCap, S.curAuto);
      score('match', m.total, 5);
      const av = autoVerdict(st, S.curAuto);
      const delta = {rigor: m.tier==='best' ? 1 : (m.tier==='poor' ? -1 : 0), trust:0, cred:0};
      if(av==='over' && st.autoBest==='assist') delta.trust -= 1;
      if(av==='under' && st.autoBest==='auto') delta.cred -= 1;
      if(av==='exact' && st.expert.stakes==='high') delta.trust += 1;
      const d = adjust(delta);
      Object.assign(S.stepAnswers[st.id], {cap:S.curCap, auto:S.curAuto, matchScored:m});
      S.lastGain = {xp:m.total, d};
      S.missNext = m.tier==='poor' ? 'match' : (S.missNext==='match' ? null : S.missNext);
      if((S.curCap==='rules' || S.curCap==='fix') && m.tier==='best') awardMark('norule');
      collectNote(st, S.discOrder[st.id][0]);
      S.stepPhase = 'match-reveal'; render(); return;
    }
    case 'dig': {
      const st = curStep();
      if(S.dug[st.id]) return;
      const c = digCost();
      if(c.weeks > S.weeks) return;
      if(c.perk) S.freeDigs--;
      spendWeeks(c.weeks);
      S.dug[st.id] = true;
      collectNote(st, S.discOrder[st.id][1]);
      const d = adjust({rigor:1});
      logIt('dig', `Interviewed ${teamOf(st.who)} on ${st.name.toLowerCase()}.`, Object.assign({}, d, c.weeks?{weeks:-c.weeks}:{}));
      render(); return;
    }
    case 'toggle-mark': {
      const id = curStep().id, i = S.marked.indexOf(id);
      if(i>=0) S.marked.splice(i,1); else S.marked.push(id);
      render(); return;
    }
    case 'next-step': {
      const exp = curExp(), isLast = S.stepIndex === exp.steps.length-1;
      if(isLast && S.marked.length===0){
        S.marked.push(curStep().id);
        toast('info', 'A candidate came with you', 'You carried no steps forward, so this last one comes with you to the reality check.');
      }
      finishStep();
      const go = ()=>{
        if(isLast) triggerEvent('data', 0, ()=>{ S.stage = 'reality'; render(); });
        else { S.stepIndex += 1; startStep(); render(); }
      };
      const ti = S.trailAt.indexOf(S.stepIndex);
      if(!isLast && ti>=0) triggerEvent('trail', ti, go); else go();
      return;
    }

    case 'rate': {
      const r = S.realityRatings[ds.step] || (S.realityRatings[ds.step] = {});
      r[ds.key] = ds.val; render(); return;
    }
    case 'plot-portfolio': {
      let earned = 0, max = 0;
      candidates().forEach(st=>{
        const r = S.realityRatings[st.id];
        const res = scoreReality(st, feasOf(r), r.value);
        score('reality', res.total, 4); earned += res.total; max += 4;
      });
      spendWeeks(1);
      const p = earned/Math.max(1,max);
      S.realityGain = {xp:earned, d:{weeks:-1}, tier: p>=.75?'great':(p>=.5?'good':'mixed'),
        line: p>=.75 ? 'Your placements sit close to the field\u2019s.' : p>=.5 ? 'Close on some, a gap on others. The lines show where.' : 'The ground looks different from the field. Follow the lines.'};
      logIt('reality', `Plotted ${candidates().length} ${plural(candidates().length,'candidate')} on the portfolio.`, null, earned);
      S.realityDone = true; render(); return;
    }
    case 'pick-headline': {
      S.headlineStep = ds.step;
      const st = stepById(ds.step), q = quadrant(st.expertFeas, st.expertValue);
      let d = {};
      if(q==='Quick win'){ d = adjust({cred:1}); awardMark('quickwin'); }
      else if(q==='Park' || q==='Avoid') d = adjust({cred:-1});
      logIt('canvas', `Chose ${st.name.toLowerCase()} as the case to pitch. The field rates it: ${q.toLowerCase()}.`, d);
      triggerEvent('team', 0, ()=>{
        S.stage = 'canvas';
        const band = S.stats.cred>=7?'high':(S.stats.cred>=4?'mid':'low');
        toast('dispatch', `From ${SPONSOR.name}`, DISPATCH.canvas[band]);
        render();
      });
      return;
    }
    case 'toggle-guardrail': {
      const i = S.canvasGuardrails.indexOf(ds.g);
      if(i>=0) S.canvasGuardrails.splice(i,1); else S.canvasGuardrails.push(ds.g);
      render(); return;
    }
    case 'reveal-canvas': {
      if(!S.canvasScored){
        const st = stepById(S.headlineStep);
        const correct = st.guardrails.filter(g=>S.canvasGuardrails.includes(g)).length;
        score('canvas', Math.min(correct,3), 3);
        const d = adjust({trust: correct>=2 ? 1 : 0});
        S.canvasGain = {xp:Math.min(correct,3), d, tier: correct>=2?'great':(correct===1?'mixed':'off'),
          line: correct>=st.guardrails.length ? 'Every guardrail the field would insist on.' : correct>=2 ? 'The guardrails that matter most are there.' : 'The field would want more protection than this.'};
        logIt('canvas', `Chose ${S.canvasGuardrails.length} ${plural(S.canvasGuardrails.length,'guardrail')}; ${correct} matched the field.`, d, Math.min(correct,3));
        S.canvasScored = true;
      }
      S.canvasRevealed = true; render(); return;
    }
    case 'present': {
      spendWeeks(1);
      if(S.stats.rigor>=7){ const d = adjust({cred:1}); toast('effect','Standing effect','Your case holds up under questioning.'); logIt('effect','Your case held up under questioning.', d); }
      triggerEvent('metric', 0, ()=>{ finalize(); S.stage = 'debrief'; render(); });
      return;
    }
    case 'print-canvas': window.print(); return;

    case 'event-choose': {
      const M = S.modal, ev = EVENT_POOL.find(e=>e.id===M.id), idx = parseInt(ds.idx,10), o = ev.opts[idx];
      M.snap = snapshot();
      score('judgment', o.s, 2);
      M.applied = adjust(o.d || {});
      if(o.flag) S.flags[o.flag] = true;
      S.eventLog.push({id:ev.id, title:ev.title, s:o.s});
      logIt('event', `${ev.title}: ${fill(o.t, M.vars)}`, M.applied, o.s);
      M.chosen = idx; M.phase = 'feedback';
      render(); return;
    }
    case 'event-rethink': {
      const M = S.modal, ev = EVENT_POOL.find(e=>e.id===M.id), o = ev.opts[M.chosen];
      restore(M.snap);
      if(o.flag) delete S.flags[o.flag];
      S.rethinks--;
      M.phase = 'choose'; M.chosen = null; M.applied = null;
      toast('info', 'Sponsor\u2019s ear', 'You quietly take the decision back. Choose again.');
      render(); return;
    }
    case 'event-continue': { const cb = S.modal.cb; S.modal = null; cb(); return; }

    /* ---- apply mode ---- */
    case 'apply-to-steps': {
      S.applyOrg = document.getElementById('org').value.trim();
      S.applyProcess = document.getElementById('proc').value.trim();
      if(!S.applySteps.length) S.applySteps = [{name:'',notes:''},{name:'',notes:''},{name:'',notes:''}];
      S.stage = 'apply-steps'; render(); return;
    }
    case 'apply-step-add': S.applySteps.push({name:'',notes:''}); render(); return;
    case 'apply-step-remove': S.applySteps.splice(parseInt(ds.idx,10),1); render(); return;
    case 'apply-to-walk': {
      S.applySteps = S.applySteps.filter(s=>s.name.trim());
      if(S.applySteps.length<2){ S.applyStepsError = true; while(S.applySteps.length<2) S.applySteps.push({name:'',notes:''}); render(); return; }
      S.applyStepsError = false; S.applyIndex = 0; S.applyPhase = 'profile'; S.applyDim = 0; S.stage = 'apply-walk'; render(); return;
    }
    case 'apply-submit-profile': S.applyPhase = 'detail'; render(); return;
    case 'apply-back-profile': S.applyPhase = 'profile'; S.applyDim = 0; render(); return;
    case 'apply-pick-cap': S.applyAnswers[S.applyIndex].cap = ds.cap; render(); return;
    case 'apply-pick-auto': S.applyAnswers[S.applyIndex].auto = ds.val; render(); return;
    case 'apply-toggle-guardrail': {
      const a = S.applyAnswers[S.applyIndex], i = a.guardrails.indexOf(ds.g);
      if(i>=0) a.guardrails.splice(i,1); else a.guardrails.push(ds.g);
      render(); return;
    }
    case 'apply-next-step': {
      if(S.applyIndex === S.applySteps.length-1){ S.stage = 'apply-canvas'; render(); }
      else { S.applyIndex++; S.applyPhase = 'profile'; S.applyDim = 0; render(); }
      return;
    }
    default: return;
  }
}

async function connectAI(){
  const model = document.getElementById('aiModel').value.trim();
  const key = document.getElementById('aiKey').value.trim();
  const status = document.getElementById('aiStatus');
  status.textContent = 'Connecting\u2026'; status.className = 'small';
  if(model) AI.model = model;
  if(key) AI.apiKey = key;
  const ok = await AI.init();
  AI.saveSettings();
  updateAIPill();
  if(ok){
    status.textContent = `Connected. Model: ${AI.model}`; status.className = 'small ok';
    renderGuide();
    setTimeout(()=>{ document.getElementById('aiSettings').hidden = true; }, 900);
  } else {
    status.textContent = 'Could not connect to Together.ai. Check the model id and the key.'; status.className = 'small bad';
  }
}
function updateAIPill(){
  const dot = document.getElementById('aiPillDot');
  if(dot) dot.classList.toggle('on', !!AI.enabled);
  const btn = document.getElementById('aiSettingsBtn');
  if(btn) btn.title = AI.enabled ? ('AI guide connected: ' + AI.model) : 'AI guide not connected. The game works fully without it.';
}

/* =====================================================================
   INIT
   ===================================================================== */
function boot(){
  const app = document.getElementById('app');
  app.addEventListener('click', e=>{
    const g = e.target.closest('[data-gact]');
    if(g){ guideAction(g.dataset); return; }
    const t = e.target.closest('[data-act]');
    if(!t || t.tagName==='INPUT' || t.tagName==='TEXTAREA') return;
    if(t.disabled) return;
    handleAction(t.dataset);
  });
  app.addEventListener('input', e=>{
    const t = e.target, ds = t.dataset; G.lastAct = Date.now();
    if(!ds || !ds.act) return;
    if(ds.act==='apply-step-name') S.applySteps[ds.idx].name = t.value;
    if(ds.act==='apply-step-notes') S.applySteps[ds.idx].notes = t.value;
    if(ds.act==='apply-metric') S.applyAnswers[S.applyIndex].metric = t.value;
    if(ds.act==='apply-data') S.applyAnswers[S.applyIndex].data = t.value;
  });
  // Option definitions follow the pointer and keyboard focus, without re-rendering.
  const showDef = e=>{
    const t = e.target.closest && e.target.closest('[data-def]'); const def = document.getElementById('def');
    if(t && def) def.textContent = t.dataset.def;
  };
  const hideDef = e=>{
    const def = document.getElementById('def');
    if(def && e.target.closest && e.target.closest('[data-def]')) def.textContent = def.dataset.default || '';
  };
  app.addEventListener('mouseover', showDef); app.addEventListener('focusin', showDef);
  app.addEventListener('mouseout', hideDef); app.addEventListener('focusout', hideDef);

  document.getElementById('modal').addEventListener('click', e=>{
    const t = e.target.closest('[data-act]'); if(t) handleAction(t.dataset);
  });
  document.getElementById('guide').addEventListener('click', e=>{
    const t = e.target.closest('[data-gact]'); if(t) guideAction(t.dataset);
  });
  ['pointerdown','keydown','wheel','touchstart'].forEach(ev=>window.addEventListener(ev, ()=>{ G.lastAct = Date.now(); }, {passive:true}));
  setInterval(guideTick, 1000);

  const aiBtn = document.getElementById('aiSettingsBtn');
  if(aiBtn) aiBtn.addEventListener('click', ()=>handleAction({act:'ai-settings'}));
  const aiModal = document.getElementById('aiSettings');
  aiModal.addEventListener('click', e=>{
    if(e.target.id==='aiSettings'){ aiModal.hidden = true; return; }
    const t = e.target.closest('[data-act]'); if(t) handleAction(t.dataset);
  });
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape'){
      if(!aiModal.hidden){ aiModal.hidden = true; return; }
      if(G.open){ G.open = false; G.manual = false; renderGuide(); }
    }
  });

  render();
  AI.loadSettings();
  AI.init().then(ok=>{ updateAIPill(); if(ok) renderGuide(); });
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();

})();
