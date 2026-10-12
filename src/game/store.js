/* =====================================================================
   STORE: the game state and every action a player can take.
   S        the current walk or map (resets on Home)
   J        the journal: marks, walks, saved maps and the player profile,
            kept in this browser under the v4 key so nothing is lost
   settings sound and volume
   toasts, popups, sfx   short-lived feedback, drained by the UI
   ===================================================================== */
import {produce} from 'immer';
import {useSyncExternalStore} from 'react';
import {flushSync} from 'react-dom';
import {EVENT_POOL, MARKS} from '../content/story.js';
import {V5_EVENTS} from '../content/campaign.js';
import {getExpedition} from '../content/expeditions.js';
import {expertBand, fieldVerdict, verdictOf} from '../engine/engine.js';
import {reportFor, reportById} from '../content/fieldReports.js';
import {NEW_FUNCTIONS} from '../content/districts.js';
import {XP, rankOf, blankStats, applyStats, roleOf} from './rpg.js';
import {QUESTIONS, SCORED, answered, stepDone, nextUnanswered, markOf, readSteps, nextOpenIndex, stepEval,
  familyOfCap, whoName, teamOf, shuffle, buildExport, lppPrompt, csvOf, slug} from './flow.js';
import {play, setSound} from '../audio/sound.js';

/* ---------- persistence ---------- */
const JKEY = 'gw_journal_v4', OLD_KEYS = ['gw_journal_v1'], SKEY = 'gw_settings_v5', GKEY = 'gw_guide';
export function blankProfile(){ return {role:null, xp:0, stats:blankStats(), skills:{}, families:{}, codex:{}, exported:{}, walks:0, complications:0, strong:0}; }
export function blankJournal(){ return {marks:{}, flagships:[], walks:[], maps:{}, profile:blankProfile()}; }
function read(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
function write(key, v){ try{ localStorage.setItem(key, v); }catch(e){ /* private mode: play on without saving */ } }
function loadJournal(){
  try{
    const j = JSON.parse(read(JKEY) || 'null'); if(!j) return blankJournal();
    const out = Object.assign(blankJournal(), j);
    out.profile = Object.assign(blankProfile(), j.profile || {});
    out.profile.stats = Object.assign(blankStats(), out.profile.stats || {});
    return out;
  }catch(e){ return blankJournal(); }
}
function loadSettings(){ try{ return Object.assign({sound:false, volume:0.6}, JSON.parse(read(SKEY) || '{}')); }catch(e){ return {sound:false, volume:0.6}; } }

/* V5 marks join the v4 set. */
export const ALL_MARKS = MARKS.concat([
  {id:'newground', icon:'route',   name:'New ground',        d:'Walk a process in one of the five newer parts of the Bank.'},
  {id:'charter',   icon:'notes',   name:'A clear charter',   d:'Start your own map with the challenge and what success looks like.'},
  {id:'library5',  icon:'book',    name:'Well read',         d:'Collect five Field Reports.'},
  {id:'standing',  icon:'shieldup',name:'Standing tall',     d:'Finish a walk with credibility, rigour and trust all higher than you started.'},
]);
const NEW_FN_IDS = NEW_FUNCTIONS.map(f=>f.id);
/* Complications: one part way through a walk, one before the finished map. */
const SLOTS = [['trail','sponsor'], ['data','team','metric']];
export const ALL_EVENTS = EVENT_POOL.concat(V5_EVENTS);

export function fresh(guide){
  return {
    mode:null, view:'home', next:null, guide:guide || read(GKEY) || 'stall',
    shortlist:[], viewFn:null, procId:null,
    own:null, steps:[], ans:{}, cur:0, q:0,
    dug:{}, compl:{fired:[], answers:[]}, modal:null,
    whatif:{double:false, digital:false, devs:false},
    includeDesc:false, confirmClear:false, setupError:false, finishedOnce:false,
    walk:{start:null, stats:null, xp:0, reports:[]},
    gui:{open:false, tier:1, key:null, auto:{}},
  };
}

let state = {S:fresh(), J:loadJournal(), settings:loadSettings(), toasts:[], popups:[], sfx:[]};
setSound(state.settings.sound, state.settings.volume);
const listeners = new Set();
let uid = 0;

export function getState(){ return state; }
export function subscribe(l){ listeners.add(l); return ()=>listeners.delete(l); }
export function useGame(sel){ return useSyncExternalStore(subscribe, ()=>sel(state)); }

export function update(fn){
  const prev = state;
  state = produce(state, fn);
  if(state.J!==prev.J) write(JKEY, JSON.stringify(state.J));
  if(state.settings!==prev.settings) write(SKEY, JSON.stringify(state.settings));
  if(state.S.guide!==prev.S.guide) write(GKEY, state.S.guide);
  if(state.sfx.length){
    const q = state.sfx; state = Object.assign({}, state, {sfx:[]});
    q.forEach((n,i)=>setTimeout(()=>play(n), i*140));
  }
  listeners.forEach(l=>l());
}
/* Screen changes animate with a view transition where the browser supports it. */
function screenKey(s){ return [s.S.mode, s.S.view, s.S.cur].join('|'); }
export function navigate(fn){
  const before = screenKey(state);
  const reduce = typeof window!=='undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const run = ()=>flushSync(()=>update(fn));
  if(typeof document!=='undefined' && document.startViewTransition && !reduce){
    const probe = produce(state, fn);
    if(screenKey(probe)!==before){ document.startViewTransition(run); return; }
  }
  run();
}

/* ---------- activity clock for the field guide ---------- */
export const activity = {last:Date.now()};
export function touch(){ activity.last = Date.now(); }

/* ---------- feedback helpers (inside a draft) ---------- */
function toast(d, title, text, icon){ d.toasts.push({id:++uid, title, text, icon:icon||'mark'}); if(d.toasts.length>3) d.toasts.shift(); }
function sfx(d, name){ d.sfx.push(name); }
function gain(d, n, label){
  if(!(n>0)) return;
  const before = rankOf(d.J.profile.xp).index;
  d.J.profile.xp += n; d.S.walk.xp += n;
  d.popups.push({id:++uid, n, label}); if(d.popups.length>4) d.popups.shift();
  const r = rankOf(d.J.profile.xp);
  if(r.index>before){
    /* A toast now; the full celebration waits for the finished map, so it never hides a reveal. */
    sfx(d, 'levelup');
    toast(d, `New rank: ${r.name}`, 'Your reads are sharper for it.', 'shieldup');
    d.S.rankUp = r.name;
  }
}
function award(d, id){
  if(d.J.marks[id]) return;
  d.J.marks[id] = true;
  const m = ALL_MARKS.find(x=>x.id===id); if(m){ toast(d, `Mark earned: ${m.name}`, m.d, m.icon); sfx(d, 'mark'); }
}
function collect(d, id){
  if(!id || d.J.profile.codex[id]) return;
  d.J.profile.codex[id] = Date.now();
  if(!d.S.walk.reports.includes(id)) d.S.walk.reports.push(id);
  const r = reportById(id);
  gain(d, XP.report, 'Field report');
  toast(d, 'New in your Field Library', r ? r.title : '', 'book');
  if(Object.keys(d.J.profile.codex).length>=5) award(d, 'library5');
}
function record(rec, mark){ rec.n++; rec.pts += mark==='match' ? 1 : (mark==='near' ? 0.5 : 0); }
function syncGuideKey(d){
  const S = d.S, st = S.steps[S.cur]; if(!st || S.view!=='step') return;
  const key = st.id + ':' + S.q;
  if(key!==S.gui.key){ S.gui.key = key; S.gui.tier = 1; S.gui.open = S.guide==='ropes' && S.q>=0; touch(); }
}
function ansOf(S, st){ return S.ans[st.id] || (S.ans[st.id] = {}); }
function saveOwn(d){
  const S = d.S; if(S.mode!=='own' || !S.own) return;
  d.J.maps[S.own.id] = {id:S.own.id, org:S.own.org, process:S.own.process, steps:S.own.steps, charter:S.own.charter, ans:S.ans, updated:Date.now()};
}
function openStepIn(d, i){
  const S = d.S; S.cur = i; S.view = 'step';
  const st = S.steps[i], a = ansOf(S, st);
  if(i>0){ const prev = S.ans[S.steps[i-1].id] || {};
    QUESTIONS.filter(q=>q.carry).forEach(q=>{ if(!a[q.k] && prev[q.k]){ a[q.k] = prev[q.k]; (a._carried = a._carried || {})[q.k] = true; } }); }
  S.q = a.revealed ? -1 : nextUnanswered(a, -1);
  syncGuideKey(d);
}
function resetTo(d, patch){ const g = d.S.guide; d.S = Object.assign(fresh(g), patch || {}); }

/* ---------- home, roles, journal ---------- */
export const actions = {
  home(){ navigate(d=>{ resetTo(d); }); },
  view(v){ navigate(d=>{ d.S.prevView = d.S.view==='character'||d.S.view==='library' ? d.S.prevView : d.S.view; d.S.view = v; }); },
  back(){ navigate(d=>{ d.S.view = d.S.prevView || 'home'; d.S.prevView = null; }); },
  chooseRole(id){
    navigate(d=>{
      const first = !d.J.profile.role;
      d.J.profile.role = id; sfx(d, 'select');
      const r = roleOf(id); if(r) toast(d, `Lens: ${r.name}`, r.perk, 'user');
      const next = d.S.next; d.S.next = null;
      if(next==='guided'){ resetTo(d, {mode:'guided', view:'terrain'}); }
      else if(next==='own'){ actions._ownInit(d); }
      else if(first) d.S.view = 'home';
      else d.S.view = d.S.prevView || 'character';
    });
  },
  askRole(next){ navigate(d=>{ d.S.next = next || null; d.S.prevView = d.S.view; d.S.view = 'role'; }); },
  clearAsk(){ update(d=>{ d.S.confirmClear = true; }); },
  clearNo(){ update(d=>{ d.S.confirmClear = false; }); },
  clearYes(){
    try{ localStorage.removeItem(JKEY); OLD_KEYS.forEach(k=>localStorage.removeItem(k)); }catch(e){}
    update(d=>{ d.J = blankJournal(); d.S.confirmClear = false; toast(d, 'Cleared', 'Your marks, walks, maps and progress are gone from this browser.', 'trash'); });
  },

  /* ---------- Meridian walk ---------- */
  startGuided(){
    if(!state.J.profile.role) return actions.askRole('guided');
    navigate(d=>{ resetTo(d, {mode:'guided', view:'terrain'}); sfx(d, 'page'); });
  },
  viewFn(id){ update(d=>{ d.S.viewFn = d.S.viewFn===id ? null : id; sfx(d, 'tap'); }); },
  toggleShortlist(pid){
    update(d=>{ const sl = d.S.shortlist, i = sl.indexOf(pid);
      if(i>=0){ sl.splice(i,1); sfx(d, 'unflag'); } else if(sl.length<3){ sl.push(pid); sfx(d, 'flag'); } });
  },
  toReveal(){ navigate(d=>{ d.S.view = 'reveal'; sfx(d, 'page'); }); },
  toPick(){ navigate(d=>{ d.S.view = 'pick'; }); },
  pickProc(pid){
    navigate(d=>{
      const e = getExpedition(pid), S = d.S;
      S.procId = pid; S.steps = e.steps; S.ans = {}; S.dug = {}; S.view = 'map';
      S.walk = {start:Object.assign({}, d.J.profile.stats), stats:Object.assign({}, d.J.profile.stats), xp:0, reports:[]};
      sfx(d, 'page');
    });
  },

  /* ---------- your own process ---------- */
  _ownInit(d){
    resetTo(d, {mode:'own', view:'own-setup'});
    d.S.own = {id:'m'+Date.now().toString(36), org:'', process:'',
      charter:{challenge:'', success:'', tracking:'', audience:[]},
      steps:[{id:'s1',name:'',notes:''},{id:'s2',name:'',notes:''},{id:'s3',name:'',notes:''}]};
  },
  startOwn(){
    if(!state.J.profile.role) return actions.askRole('own');
    navigate(d=>{ actions._ownInit(d); sfx(d, 'page'); });
  },
  openMap(id){
    const m = state.J.maps[id]; if(!m) return;
    navigate(d=>{ resetTo(d, {mode:'own', view:'map'});
      d.S.own = {id:m.id, org:m.org, process:m.process, steps:m.steps, charter:m.charter || {challenge:'', success:'', tracking:'', audience:[]}};
      d.S.steps = m.steps; d.S.ans = m.ans || {}; });
  },
  ownField(k, v){ update(d=>{ d.S.own[k] = v; }); },
  ownStep(idx, k, v){ update(d=>{ d.S.own.steps[idx][k] = v; }); },
  ownStepAdd(){ update(d=>{ const n = d.S.own.steps.length; d.S.own.steps.push({id:'s'+Date.now().toString(36)+n, name:'', notes:''}); sfx(d, 'tap'); }); },
  ownStepRemove(idx){ update(d=>{ d.S.own.steps.splice(idx,1); sfx(d, 'tap'); }); },
  charterSet(k, v){ update(d=>{ d.S.own.charter[k] = v; }); },
  charterAudience(id){ update(d=>{ const a = d.S.own.charter.audience, i = a.indexOf(id); if(i>=0) a.splice(i,1); else a.push(id); sfx(d, 'tap'); }); },
  ownStart(){
    navigate(d=>{
      const o = d.S.own, steps = o.steps.filter(s=>s.name.trim());
      if(!o.process.trim() || steps.length<2){ d.S.setupError = true; return; }
      d.S.setupError = false; o.steps = steps; d.S.steps = steps; d.S.view = 'map';
      saveOwn(d); award(d, 'ownmap');
      if(o.charter && o.charter.challenge.trim() && o.charter.success.trim()) award(d, 'charter');
      sfx(d, 'page');
    });
  },
  ownEdit(){ navigate(d=>{ d.S.view = 'own-setup'; }); },

  /* ---------- reading a step ---------- */
  toMap(){ navigate(d=>{ d.S.view = 'map'; }); },
  openStep(i){ navigate(d=>{ openStepIn(d, i); sfx(d, 'page'); }); },
  reopen(k){ update(d=>{ const st = d.S.steps[d.S.cur], a = ansOf(d.S, st); if(a.revealed) return; d.S.q = QUESTIONS.findIndex(q=>q.k===k); syncGuideKey(d); sfx(d, 'tap'); }); },
  answer(k, v){
    touch();
    let next = -1;
    update(d=>{
      const S = d.S, st = S.steps[S.cur], a = ansOf(S, st), q = QUESTIONS.find(x=>x.k===k);
      a[k] = v; if(a._carried) delete a._carried[k];
      if(k==='band' && a.cap && !(QUESTIONS[5].opts(a).some(o=>o.id===a.cap))) delete a.cap;
      sfx(d, 'select');
      next = nextUnanswered(a, QUESTIONS.indexOf(q));
      if(S.mode==='own' && answered(a) && !a._xp){
        a._xp = true; gain(d, XP.ownStep, 'Step read'); sfx(d, 'stamp');
        if(S.steps.every(x=>answered(S.ans[x.id])) && !S.own.finishedXp){ S.own.finishedXp = true; gain(d, XP.ownMap, 'Map complete'); }
      }
      saveOwn(d);
      S.advTok = (S.advTok || 0) + 1;
    });
    const tok = state.S.advTok;
    setTimeout(()=>{
      if(state.S.advTok!==tok) return;
      update(d=>{ d.S.q = next; syncGuideKey(d); });
      const f = document.querySelector('.question .token') || document.querySelector('[data-focus="reveal"]') || document.querySelector('.verdict');
      if(f && f.focus) f.focus({preventScroll:true});
    }, 260);
  },
  reveal(){
    update(d=>{
      const S = d.S, st = S.steps[S.cur], a = ansOf(S, st), P = d.J.profile;
      a.revealed = true; S.q = -1;
      let gained = 0;
      SCORED.forEach(q=>{
        const m = markOf(S, q, st, a[q.k]);
        record(P.skills[q.k] || (P.skills[q.k] = {n:0, pts:0}), m);
        gained += m==='match' ? XP.match : (m==='near' ? XP.near : 0);
        if(q.k==='cap'){ const fam = familyOfCap(st.expertPick); if(fam) record(P.families[fam] || (P.families[fam] = {n:0, pts:0}), m); }
      });
      if(P.role==='practitioner') S.dug[st.id] = true;
      sfx(d, 'reveal');
      gain(d, gained, 'Read compared');
      const r = reportFor({cap:st.expertPick, verdict:fieldVerdict(st), shape:st.expert.shape}, P.codex);
      if(r){ a.report = r.id; collect(d, r.id); }
    });
  },
  dig(){ update(d=>{ const st = d.S.steps[d.S.cur]; if(d.S.dug[st.id]) return; d.S.dug[st.id] = true; gain(d, XP.dig, 'Heard from the floor'); sfx(d, 'page'); }); },
  seeReport(id){ update(d=>{ collect(d, id); d.S.modal = {type:'report', id}; sfx(d, 'page'); }); },
  /* Reading from the library shows a case without collecting it: cases are collected in the field. */
  peekReport(id){ update(d=>{ d.S.modal = {type:'report', id}; sfx(d, 'page'); }); },
  nextStep(){
    const go = ()=>navigate(d=>{
      const n = nextOpenIndex(d.S);
      if(n==null){
        if(d.S.mode==='guided') finishGuided(d);
        d.S.view = 'finished'; sfx(d, 'finish');
        if(d.S.rankUp && !d.S.modal){ d.S.modal = {type:'levelup', rank:d.S.rankUp}; d.S.rankUp = null; }
      }
      else { openStepIn(d, n); sfx(d, 'page'); }
    });
    const S = state.S, readCount = readSteps(S).length;
    if(S.mode==='guided' && readCount===2 && S.steps.length>=3 && fireComplication(0)) return;
    if(S.mode==='guided' && nextOpenIndex(S)==null && fireComplication(1)) return;
    go();
  },
  toFinished(){ navigate(d=>{ d.S.view = 'finished'; }); },
  whatif(k){ update(d=>{ d.S.whatif[k] = !d.S.whatif[k]; sfx(d, 'tap'); }); },
  toExport(){ navigate(d=>{ d.S.view = 'export'; }); },
  includeDesc(v){ update(d=>{ d.S.includeDesc = v; }); },

  /* ---------- complications ---------- */
  complChoose(i){
    update(d=>{
      const M = d.S.modal, ev = ALL_EVENTS.find(e=>e.id===M.id), o = ev.opts[i];
      M.chosen = i; M.phase = 'feedback';
      d.S.compl.answers.push(o.s);
      if(o.flag) (d.S.compl.flags = d.S.compl.flags || []).push(o.flag);
      d.S.walk.stats = applyStats(d.S.walk.stats || d.J.profile.stats, o.d);
      d.J.profile.stats = applyStats(d.J.profile.stats, o.d);
      d.J.profile.complications++; if(o.s===2) d.J.profile.strong++;
      sfx(d, o.s===2 ? 'good' : (o.s===1 ? 'near' : 'bad'));
      gain(d, o.s===2 ? XP.strong : (o.s===1 ? XP.workable : 0), o.s===2 ? 'Strong answer' : 'Workable answer');
      if(ev.report) collect(d, ev.report);
    });
  },
  complContinue(){ update(d=>{ d.S.modal = null; }); actions.nextStep(); },
  closeModal(){ update(d=>{ d.S.modal = null; }); },

  /* ---------- field guide ---------- */
  guideToggle(){ update(d=>{ d.S.gui.open = !d.S.gui.open; if(d.S.gui.open) d.S.gui.tier = 1; sfx(d, 'tap'); }); },
  guideClose(){ update(d=>{ d.S.gui.open = false; }); },
  guideMore(){ update(d=>{ d.S.gui.tier = 2; sfx(d, 'xp'); }); },
  guideLevel(v){ update(d=>{ d.S.guide = v; }); },
  guideStall(){ update(d=>{ const g = d.S.gui; if(g.auto[g.key]) return; g.auto[g.key] = true; g.open = true; }); },

  /* ---------- numbers (your own map) ---------- */
  numSet(k, v){ update(d=>{ const a = ansOf(d.S, d.S.steps[d.S.cur]); (a.nums || (a.nums = {per:'month'}))[k] = v; saveOwn(d); }); },
  numRework(v){ update(d=>{ const a = ansOf(d.S, d.S.steps[d.S.cur]); const n = a.nums || (a.nums = {per:'month'}); n.rework = n.rework===v ? '' : v; saveOwn(d); sfx(d, 'tap'); }); },

  /* ---------- taking it further ---------- */
  exported(kind){
    update(d=>{
      const key = d.S.mode==='own' ? d.S.own.id : 'walk:' + d.S.procId;
      award(d, 'further');
      if(!d.J.profile.exported[key]){ d.J.profile.exported[key] = true; gain(d, XP.export, 'Map taken further'); }
      if(kind==='prompt') toast(d, 'Prompt copied', 'Paste it into LPP.', 'copy');
    });
  },
  copyPrompt(){
    const t = lppPrompt(buildExport(state.S));
    const ok = ()=>actions.exported('prompt');
    if(navigator.clipboard) navigator.clipboard.writeText(t).then(ok, ()=>selectPrompt());
    else selectPrompt();
  },
  dlJSON(){ const x = buildExport(state.S); download(`groundwork-${slug(x.process)}.json`, JSON.stringify(x, null, 2), 'application/json'); actions.exported('json'); },
  dlCSV(){ const x = buildExport(state.S); download(`groundwork-${slug(x.process)}.csv`, csvOf(x), 'text/csv'); actions.exported('csv'); },
  print(){ window.print(); },

  /* ---------- settings ---------- */
  soundToggle(){
    const on = !state.settings.sound;
    setSound(on, state.settings.volume);
    update(d=>{ d.settings.sound = on; if(on) sfx(d, 'xp'); });
  },
  setVolume(v){ setSound(state.settings.sound, v); update(d=>{ d.settings.volume = v; }); },
  dismissToast(id){ update(d=>{ d.toasts = d.toasts.filter(t=>t.id!==id); }); },
  dismissPopup(id){ update(d=>{ d.popups = d.popups.filter(t=>t.id!==id); }); },
  sound(name){ play(name); },
};

/* Draw a complication for the slot, preferring ones written for the player's lens. */
function fireComplication(slotIdx){
  const S = state.S;
  if(S.mode!=='guided' || S.compl.fired.length>slotIdx) return false;
  const role = state.J.profile.role;
  const pool = ALL_EVENTS.filter(e=>SLOTS[slotIdx].includes(e.slot) && !S.compl.fired.includes(e.id));
  if(!pool.length) return false;
  const weights = pool.map(e=> e.roles ? (e.roles.includes(role) ? 3 : 1) : 1.5);
  let r = Math.random() * weights.reduce((a,b)=>a+b, 0), ev = pool[0];
  for(let i=0;i<pool.length;i++){ r -= weights[i]; if(r<=0){ ev = pool[i]; break; } }
  const st = S.steps[S.cur], exp = getExpedition(S.procId);
  update(d=>{
    d.S.compl.fired.push(ev.id);
    d.S.modal = {type:'compl', id:ev.id, phase:'choose', order:shuffle(ev.opts.map((_,i)=>i)), chosen:null,
      vars:{who:whoName(st.who), team:teamOf(st.who), proc:exp.name.toLowerCase()}};
    sfx(d, 'encounter');
  });
  return true;
}

function finishGuided(d){
  const S = d.S;
  if(S.finishedOnce) return; S.finishedOnce = true;
  const exp = getExpedition(S.procId), P = d.J.profile;
  award(d, 'first');
  if(exp.flagship && !d.J.flagships.includes(exp.id)) d.J.flagships.push(exp.id);
  if(d.J.flagships.length>=4) award(d, 'flagships');
  if(!exp.flagship) award(d, 'offpath');
  if(NEW_FN_IDS.includes(exp.fnId)) award(d, 'newground');
  const steps = S.steps;
  if(steps.some(st=>S.ans[st.id].band==='none' && expertBand(st)==='none')) award(d, 'saidno');
  if(steps.every(st=>S.ans[st.id].band===expertBand(st))) award(d, 'inagree');
  if(steps.every(st=>S.ans[st.id].auto===st.autoBest)) award(d, 'steady');
  if(steps.every(st=>S.dug[st.id])) award(d, 'digger');
  if(S.compl.answers.length>=2 && S.compl.answers.every(s=>s===2)) award(d, 'coolhead');
  const w = S.walk;
  if(w.start && w.stats && ['cred','rigor','trust'].every(k=>w.stats[k]>w.start[k])) award(d, 'standing');
  gain(d, XP.walk, 'Walk complete');
  P.walks++;
  const agree = steps.filter(st=>S.ans[st.id].band===expertBand(st)).length;
  d.J.walks.unshift({proc:exp.name, summary:`Matched the field’s LLM call on ${agree} of ${steps.length} steps.`, xp:w.xp, when:Date.now()});
  d.J.walks = d.J.walks.slice(0,8);
}

function selectPrompt(){
  const p = document.getElementById('prompt'); if(!p) return;
  const r = document.createRange(); r.selectNodeContents(p); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  update(d=>{ toast(d, 'Prompt selected', 'Press Ctrl+C or Cmd+C to copy it.', 'copy'); });
}
export function download(name, text, type){
  const blob = new Blob([text], {type}), url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
export {verdictOf};
