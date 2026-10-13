/* Toasts, experience pop-ups and the dialogs: complications, rank-ups and Field Reports. */
import {useEffect, useRef} from 'react';
import {m, AnimatePresence, useReducedMotion} from 'motion/react';
import {useGame, actions, ALL_EVENTS} from '../game/store.js';
import {fill} from '../game/flow.js';
import {reportById} from '../content/fieldReports.js';
import {roleOf} from '../game/rpg.js';
import {Icon, Art} from './ui.jsx';

export function Toasts(){
  const toasts = useGame(s=>s.toasts);
  return <div className="toasts" role="status" aria-live="polite">
    <AnimatePresence>{toasts.map(t=><Toast key={t.id} t={t}/>)}</AnimatePresence>
  </div>;
}
function Toast({t}){
  useEffect(()=>{ const h = setTimeout(()=>actions.dismissToast(t.id), 4600); return ()=>clearTimeout(h); }, [t.id]);
  const reduce = useReducedMotion(), x = reduce ? 0 : 40;
  return <m.div className="toast" initial={{opacity:0, x}} animate={{opacity:1, x:0}} exit={{opacity:0, x}} transition={{type:'spring', stiffness:420, damping:32}}>
    <span className="ticon"><Icon name={t.icon}/></span><div><b>{t.title}</b>{t.text && <p>{t.text}</p>}</div></m.div>;
}

export function Popups(){
  const pops = useGame(s=>s.popups);
  return <div className="popups" aria-hidden="true">{pops.map(p=><Popup key={p.id} p={p}/>)}</div>;
}
function Popup({p}){
  useEffect(()=>{ const h = setTimeout(()=>actions.dismissPopup(p.id), 1600); return ()=>clearTimeout(h); }, [p.id]);
  return <div className="xppop"><b>+{p.n} XP</b><span>{p.label}</span></div>;
}

export function Modal(){
  const M = useGame(s=>s.S.modal);
  const card = useRef(null);
  useEffect(()=>{
    if(!M || !card.current) return;
    const f = card.current.querySelector('.choice, [data-autofocus]');
    if(f) setTimeout(()=>f.focus({preventScroll:true}), 40);
  }, [M && M.type, M && M.phase, M && M.id]);
  useEffect(()=>{
    if(!M || M.type==='compl' && M.phase==='choose') return;
    const k = e=>{ if(e.key==='Escape') M.type==='compl' ? actions.complContinue() : actions.closeModal(); };
    document.addEventListener('keydown', k); return ()=>document.removeEventListener('keydown', k);
  }, [M]);
  const reduce = useReducedMotion();
  let body = null, cls = '';
  if(M && M.type==='compl') { body = <Complication M={M}/>; cls = 'encounter'; }
  else if(M && M.type==='levelup') { body = <LevelUp M={M}/>; cls = 'encounter levelup'; }
  else if(M && M.type==='report') { body = <ReportCard id={M.id} onClose={actions.closeModal}/>; cls = 'reportmodal'; }
  const dy = reduce ? 0 : 24;
  return <AnimatePresence>{M && <m.div key="modal" className="modal" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration: reduce ? 0 : .18}}>
    <m.div className={'dispatch ' + cls} ref={card} role="dialog" aria-modal="true" aria-labelledby="dlgTitle"
      initial={{opacity:0, y:dy, scale:reduce?1:.96}} animate={{opacity:1, y:0, scale:1}} exit={{opacity:0, y:dy/2, scale:reduce?1:.98}}
      transition={{type:'spring', stiffness:380, damping:30}}>{body}</m.div>
  </m.div>}</AnimatePresence>;
}

function Complication({M}){
  const ev = ALL_EVENTS.find(e=>e.id===M.id), role = useGame(s=>s.J.profile.role);
  const forYou = ev.roles && ev.roles.includes(role);
  if(M.phase==='choose') return <>
    <p className="dfrom"><Icon name="interview"/>{ev.from}. A complication{forYou && <span className="forlens">for your lens: {roleOf(role).name}</span>}</p>
    <h2 id="dlgTitle">{ev.title}</h2>
    <p className="dtext">{fill(ev.text, M.vars)}</p>
    <div className="choices">{M.order.map(i=><button key={i} className="choice" onClick={()=>actions.complChoose(i)}>{fill(ev.opts[i].t, M.vars)}</button>)}</div>
  </>;
  const o = ev.opts[M.chosen], tag = o.s===2 ? ['good','Strong answer'] : (o.s===1 ? ['ok','Workable, but'] : ['bad','Risky']);
  const r = ev.report ? reportById(ev.report) : null;
  return <>
    <p className="dfrom"><Icon name="interview"/>{ev.from}. A complication</p>
    <h2 id="dlgTitle">{ev.title}</h2>
    <p className="dchosen">{fill(o.t, M.vars)}</p>
    <p className={`vtag vt-${tag[0]}`}>{tag[1]}</p>
    <p className="dtext">{o.fb}</p>
    <StatShift d={o.d}/>
    {r && <aside className="dreport"><span className="dr-k"><Icon name="book"/>A real case: {r.org}, {r.year}</span><b>{r.title}</b><p>{r.lesson}</p></aside>}
    <div className="actions"><button className="btn brass" data-autofocus onClick={actions.complContinue}>Continue</button></div>
  </>;
}
const STAT_NAMES = {cred:'Credibility', rigor:'Rigour', trust:'Trust', weeks:'Time in hand'};
export function StatShift({d}){
  const ks = Object.keys(d||{}).filter(k=>d[k]);
  if(!ks.length) return null;
  return <ul className="statshift">{ks.map(k=><li key={k} className={d[k]>0?'up':'down'}><Icon name={k}/>{STAT_NAMES[k]} {d[k]>0?'+':''}{d[k]}</li>)}</ul>;
}

function LevelUp({M}){
  const role = useGame(s=>s.J.profile.role);
  return <div className="lvl">
    <div className="lvl-art"><Art kind="role" id={role || 'practitioner'}/></div>
    <p className="dfrom"><Icon name="shieldup"/>A new rank</p>
    <h2 id="dlgTitle">{M.rank}</h2>
    <p className="dtext">Your reads of the work are getting sharper. Keep comparing with the field, and keep collecting cases from the wider world.</p>
    <div className="actions"><button className="btn brass" data-autofocus onClick={actions.closeModal}>Carry on</button></div>
  </div>;
}

export function ReportCard({id, onClose, inline}){
  const r = reportById(id); if(!r) return null;
  const kind = {success:'It worked', warning:'A warning', mixed:'Mixed results'}[r.kind];
  return <article className={`report k-${r.kind} ${inline?'inline':''}`}>
    <header><span className="rk">{kind}</span><span className="ry">{r.org}, {r.year}</span></header>
    <h2 id={inline?undefined:'dlgTitle'} className="h3">{r.title}</h2>
    <p>{r.what}</p>
    <p><b>What happened.</b> {r.outcome}</p>
    <p className="lesson"><Icon name="spark"/>{r.lesson}</p>
    <p className="src">Source: <a href={r.source.url} target="_blank" rel="noopener noreferrer">{r.source.name}</a></p>
    {onClose && <div className="actions"><button className="btn primary" data-autofocus onClick={onClose}>Close</button></div>}
  </article>;
}
