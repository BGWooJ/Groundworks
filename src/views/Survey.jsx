/* The Meridian survey: read the Bank, shortlist, compare with the full survey, pick one. */
import {useGame, actions} from '../game/store.js';
import {FUNCTIONS, MAP_GROUPS} from '../content/meridian.js';
import {getExpedition} from '../content/expeditions.js';
import {findProcessMeta, heatOf} from '../game/flow.js';
import {NEW_FUNCTIONS} from '../content/districts.js';
import {Icon, Art, Emph, HeatBar} from '../components/ui.jsx';

const NEW_IDS = NEW_FUNCTIONS.map(f=>f.id);

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
        const m = findProcessMeta(pid);
        return <li key={pid} className="slot"><span className="sf"><Icon name="flag"/></span><span><b>{m.proc.name}</b><span>{m.fn.name}</span></span>
          <button className="iconbtn" onClick={()=>actions.toggleShortlist(pid)} aria-label={`Remove ${m.proc.name}`}><Icon name="close"/></button></li>;
      })}</ul></div>
    <div className="survey">{MAP_GROUPS.map(g=><section key={g.id} className={'band g-' + g.id}>
      <h2 className="bh">{g.label}<span>{g.d}</span></h2>
      <div className="stations">{FUNCTIONS.filter(f=>f.group===g.id).map(f=>{
        const on = S.viewFn===f.id, flags = f.processes.filter(p=>S.shortlist.includes(p.id)).length;
        return <button key={f.id} className={`station heat-${heatOf(f)} ${on?'on':''}`} onClick={()=>actions.viewFn(f.id)} aria-pressed={on} aria-expanded={on}>
          <span className="halo" aria-hidden="true"/><span className="sicon"><Icon name={f.icon}/></span>
          <span className="sname">{f.name}</span><span className="scount">{f.processes.length} processes</span>
          {NEW_IDS.includes(f.id) && <span className="snew">New ground</span>}
          {flags>0 && <span className="sflag"><Icon name="flag"/>{flags}</span>}
        </button>;
      })}</div>
    </section>)}</div>
    {fn ? <section className="drawer" aria-live="polite">
      <header className="dhead"><span className="dill"><Art kind="dept" id={fn.id}/></span><div><h2 className="h3">{fn.name}</h2><p><Emph text={fn.brief}/></p></div></header>
      <div className="dgrid">
        <div><h3 className="h4">Signals</h3><ul className="signals">{fn.signals.map((s,i)=><li key={i} className={'sig-'+s.s}><span className="sig"/><span><Emph text={s.t}/></span></li>)}</ul></div>
        <div><h3 className="h4">Processes</h3>{fn.processes.map(p=>{ const on = S.shortlist.includes(p.id);
          return <div key={p.id} className={'proc ' + (on?'on':'')}><div><b>{p.name}</b><span>{p.d}</span></div>
            <button className={`btn ${on?'flagged':'secondary'} small`} onClick={()=>actions.toggleShortlist(p.id)} aria-pressed={on} disabled={!on && full}><Icon name="flag"/>{on?'Shortlisted':'Shortlist'}</button></div>; })}</div>
      </div></section>
    : <div className="drawer empty"><p><Icon name="compass"/> Open any part of the Bank to read its signals. The glow marks where the evidence is strongest.</p></div>}
    <div className="actions sticky"><span className="count">{S.shortlist.length} of 3 shortlisted</span>
      <button className="btn primary" onClick={actions.toReveal} disabled={!S.shortlist.length}>Compare with the full survey</button></div>
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
