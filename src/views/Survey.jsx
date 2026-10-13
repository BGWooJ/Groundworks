/* The Meridian survey: read the Bank, shortlist, compare with the full survey, pick one. */
import {useEffect, useRef} from 'react';
import {m, AnimatePresence, useReducedMotion} from 'motion/react';
import {useGame, actions} from '../game/store.js';
import {FUNCTIONS, MAP_GROUPS} from '../content/meridian.js';
import {getExpedition} from '../content/expeditions.js';
import {findProcessMeta, heatOf} from '../game/flow.js';
import {NEW_FUNCTIONS} from '../content/districts.js';
import {Icon, Art, Emph, HeatBar} from '../components/ui.jsx';

const NEW_IDS = NEW_FUNCTIONS.map(f=>f.id);

/* When a department opens, keep its card in view and show as much of the drawer as fits. */
const FOOTER = 96;   // the sticky "next step" bar at the bottom of the survey
/* When a department opens, show as much as fits while the card you clicked stays on screen: the
   next step if it fits, otherwise all the choices, otherwise the first one. Only if not even that
   fits (a phone) does the card scroll away, leaving the drawer's own heading, which names the
   department, under the top bar. */
function revealDrawer(drawer, reduce){
  const card = document.querySelector('.station.on'); if(!card || !drawer) return;
  const bar = 84, limit = window.innerHeight - FOOTER - 12, c = card.getBoundingClientRect(), cardRoom = c.top - bar;
  const scroll = by=>{ if(by) window.scrollBy({top:by, behavior: reduce ? 'auto' : 'smooth'}); };
  const targets = ['.picknext', '.picks', '.pick'].map(q=>drawer.querySelector(q)).filter(Boolean);
  for(const t of targets){
    const over = t.getBoundingClientRect().bottom - limit;
    if(over<=cardRoom) return scroll(over>0 ? over : Math.min(0, cardRoom));
  }
  const first = targets[targets.length-1] || drawer, over = first.getBoundingClientRect().bottom - limit;
  scroll(Math.min(over, Math.max(drawer.getBoundingClientRect().top - bar, 0)));
}

function Drawer({fn, full, S}){
  const reduce = useReducedMotion(), ref = useRef(null), t = {duration: reduce ? 0 : .22, ease:'easeOut'};
  useEffect(()=>{ const h = setTimeout(()=>revealDrawer(ref.current, reduce), reduce ? 0 : 240); return ()=>clearTimeout(h); }, [fn.id, reduce]);
  const count = S.shortlist.length;
  useEffect(()=>{
    if(!count || !ref.current) return;
    const n = ref.current.querySelector('.picknext'); if(!n) return;
    const r = n.getBoundingClientRect(), over = r.bottom - (window.innerHeight - FOOTER);
    if(over>0) window.scrollBy({top:over, behavior: reduce ? 'auto' : 'smooth'});
  }, [count]);
  return <m.div className="drawer-wrap" ref={ref} initial={{height:0, opacity:0}} animate={{height:'auto', opacity:1}} exit={{height:0, opacity:0}} transition={t}>
    <section className="drawer" id={'dept-'+fn.id} aria-label={`${fn.name}: processes to shortlist, and signals`}>
      <m.div key={fn.id} initial={{opacity:0, y:reduce?0:6}} animate={{opacity:1, y:0}} transition={{duration: reduce ? 0 : .16}}>
        <header className="dhead"><span className="dill"><Art kind="dept" id={fn.id}/></span><div><h2 className="h3">{fn.name}</h2><p><Emph text={fn.brief}/></p></div></header>
        <div className="dgrid picks-first">
          <div className="pickcol">
            <h3 className="h4 pickhead">Choose what to shortlist<span className="pickcount" aria-live="polite">{S.shortlist.length} of 3 chosen</span></h3>
            <ul className="picks">{fn.processes.map(p=>{ const on = S.shortlist.includes(p.id), blocked = !on && full;
              return <li key={p.id}><button className={'pick' + (on?' on':'')} onClick={()=>actions.toggleShortlist(p.id)} aria-pressed={on} disabled={blocked}>
                <span className="pick-box" aria-hidden="true"><Icon name={on?'check':'flag'}/></span>
                <span className="pick-main"><b>{p.name}</b><span>{p.d}</span></span>
                <span className="pick-state">{on ? 'Shortlisted' : (blocked ? 'Shortlist full' : 'Add to shortlist')}</span>
              </button></li>; })}</ul>
            <div className={'picknext' + (S.shortlist.length ? ' ready' : '')}>
              {S.shortlist.length
                ? <><span>{S.shortlist.length} of 3 shortlisted{S.shortlist.length<3 ? '. Add more from any part of the Bank, or move on.' : '.'}</span>
                    <button className="btn brass" onClick={actions.toReveal}>Next: compare with the full survey<Icon name="chev"/></button></>
                : <span>Pick up to three processes worth a closer look. You can choose from more than one part of the Bank.</span>}
            </div>
          </div>
          <aside className="sigcol"><h3 className="h4">Signals</h3><ul className="signals">{fn.signals.map((sg,i)=><li key={i} className={'sig-'+sg.s}><span className="sig"/><span><Emph text={sg.t}/></span></li>)}</ul>
            <p className="muted small">Signals are the evidence: volume, repetition and pain someone has measured. Strong ones are marked in brass.</p></aside>
        </div>
      </m.div>
    </section>
  </m.div>;
}

export function Terrain(){
  const S = useGame(s=>s.S);
  const full = S.shortlist.length>=3;
  const fn = S.viewFn ? FUNCTIONS.find(f=>f.id===S.viewFn) : null;
  return <>
    <header className="scene"><p className="kicker">Survey</p><h1>Where does the pain live?</h1>
      <p className="lede">Open each part of Meridian Reserve Bank and read its signals. Shortlist up to three processes worth a closer look.</p></header>
    <div className="tray"><span className="trayl"><Icon name="flag"/>Your shortlist</span>
      <ul className="slots">{[0,1,2].map(i=>{
        const pid = S.shortlist[i];
        if(!pid) return <li key={i} className="slot empty"><span className="sf"><Icon name="flag"/></span><span>Open slot</span></li>;
        const mt = findProcessMeta(pid);
        return <li key={pid} className="slot"><span className="sf"><Icon name="flag"/></span><span><b>{mt.proc.name}</b><span>{mt.fn.name}</span></span>
          <button className="iconbtn" onClick={()=>actions.toggleShortlist(pid)} aria-label={`Remove ${mt.proc.name}`}><Icon name="close"/></button></li>;
      })}</ul></div>
    {!fn && <p className="survey-hint"><Icon name="compass"/>Tap a part of the Bank and its processes open right beneath it. The glow marks where the evidence is strongest.</p>}
    <div className="survey">{MAP_GROUPS.map(g=><section key={g.id} className={'band g-' + g.id}>
      <h2 className="bh">{g.label}<span>{g.d}</span></h2>
      <div className="stations">{FUNCTIONS.filter(f=>f.group===g.id).map(f=>{
        const on = S.viewFn===f.id, flags = f.processes.filter(p=>S.shortlist.includes(p.id)).length;
        return <button key={f.id} className={`station heat-${heatOf(f)} ${on?'on':''}`} onClick={()=>actions.viewFn(f.id)} aria-pressed={on} aria-expanded={on} aria-controls={'dept-'+f.id}>
          <span className="halo" aria-hidden="true"/><span className="sicon"><Icon name={f.icon}/></span>
          <span className="sname">{f.name}</span>
          <span className="scount">{f.processes.length} processes<Icon name="chev" className="schev"/></span>
          {NEW_IDS.includes(f.id) && <span className="snew">New ground</span>}
          {flags>0 && <span className="sflag"><Icon name="flag"/>{flags}</span>}
        </button>;
      })}</div>
      <AnimatePresence initial={false}>{fn && fn.group===g.id && <Drawer key={'drawer-'+g.id} fn={fn} full={full} S={S}/>}</AnimatePresence>
    </section>)}</div>
    <div className={'actions sticky' + (S.shortlist.length ? ' ready' : '')}><span className="count"><Icon name="flag"/>{S.shortlist.length} of 3 shortlisted</span>
      <button key={S.shortlist.length} className={'btn ' + (S.shortlist.length ? 'brass nudge' : 'primary')} onClick={actions.toReveal} disabled={!S.shortlist.length}>
        {S.shortlist.length ? 'Next: compare with the full survey' : 'Shortlist a process to continue'}</button></div>
  </>;
}

export function Reveal(){
  const S = useGame(s=>s.S);
  const all = []; FUNCTIONS.forEach(fn=>fn.processes.forEach(p=>all.push({fn, ...p}))); all.sort((a,b)=>b.rating-a.rating);
  const top = all.slice(0,8).map(p=>p.id), hits = S.shortlist.filter(id=>top.includes(id)).length;
  const lineTxt = hits===S.shortlist.length ? 'Every pick is among the strongest hotspots in the Bank.' : (hits ? `${hits} of your ${S.shortlist.length} picks are among the eight strongest hotspots.` : 'The strongest hotspots were elsewhere. Your picks are still worth walking.');
  return <>
    <header className="scene"><p className="kicker">Survey</p><h1>The full survey</h1><p className="lede">Every process, ranked by how strong a hotspot it is: volume, repetition, a pain you can measure, and data already captured.</p></header>
    <p className="callout"><Icon name="spark"/>{lineTxt}</p>
    <ol className="ladder">{all.map((p,i)=>{ const mine = S.shortlist.includes(p.id);
      return <li key={p.id} className={mine?'mine':''} style={{'--i':Math.min(i,20)}}><HeatBar r={p.rating}/>
        <div className="lw"><b>{p.name}</b> <span className="lfn">{p.fn.name}</span>{mine && <span className="you"><Icon name="flag"/>Your pick</span>}
          {mine ? <p>{p.why}</p> : <details><summary>Why</summary><p>{p.why}</p></details>}</div></li>; })}</ol>
    <div className="actions"><button className="btn primary" onClick={actions.toPick}>Choose the process to walk</button></div>
  </>;
}

export function Pick(){
  const S = useGame(s=>s.S);
  return <>
    <header className="scene"><p className="kicker">Survey</p><h1>Pick one to walk</h1><p className="lede">One process, every step. You will read each step, then see how the field reads it.</p></header>
    <div className="routes">{S.shortlist.map(pid=>{ const e = getExpedition(pid);
      return <button key={pid} className="routecard" onClick={()=>actions.pickProc(pid)}>
        <span className="rill"><Art kind="dept" id={e.fnId}/></span>
        <span className="rfn"><Icon name={findProcessMeta(pid).fn.icon}/> {e.fn}</span>
        <span className="rn">{e.name}</span>
        <span className="rmeta"><HeatBar r={e.rating}/><span>{e.steps.length} steps</span>{e.flagship && <span className="flagship">Flagship</span>}</span>
        <span className="rd">{e.intro}</span><span className="rgo">Walk this process</span></button>; })}</div>
  </>;
}
