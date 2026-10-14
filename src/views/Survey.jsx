/* The ranking and the route (v8). The map itself is in World.jsx; these two screens read the route
   you pinned there: how your picks rank across the Bank, and the route to read. */
import {useGame, actions} from '../game/store.js';
import {FUNCTIONS} from '../content/meridian.js';
import {getExpedition} from '../content/expeditions.js';
import {findProcessMeta} from '../game/flow.js';
import {Icon, Art, HeatBar, Term} from '../components/ui.jsx';

export function Reveal(){
  const route = useGame(s=>s.J.route);
  const all = []; FUNCTIONS.forEach(fn=>fn.processes.forEach(p=>all.push({fn, ...p}))); all.sort((a,b)=>b.rating-a.rating);
  const top = all.slice(0,8).map(p=>p.id), hits = route.filter(id=>top.includes(id)).length;
  const lineTxt = !route.length ? 'Pin processes to your route to see where they rank.' : (hits===route.length ? 'Every pick is among the strongest hotspots in the Bank.' : (hits ? `${hits} of your ${route.length} picks are among the eight strongest hotspots.` : 'The strongest hotspots were elsewhere. Your picks are still worth walking.'));
  return <>
    <button className="linkbtn strong" onClick={actions.toWorld}><Icon name="back"/>Back to the map</button>
    <header className="scene"><p className="kicker">Your route</p><h1>How do they rank?</h1><p className="lede">Every process, ranked by how strong a hotspot it is: volume, repetition, a cost you can measure, and data already captured.</p></header>
    <p className="callout"><Icon name="spark"/>{lineTxt}</p>
    <ol className="ladder">{all.map((p,i)=>{ const mine = route.includes(p.id);
      return <li key={p.id} className={mine?'mine':''} style={{'--i':Math.min(i,20)}}><HeatBar r={p.rating}/>
        <div className="lw"><b>{p.name}</b> <span className="lfn">{p.fn.name}</span>{mine && <span className="you"><Icon name="flag"/>Your pick</span>}
          {mine ? <p>{p.why}</p> : <details><summary>Why</summary><p>{p.why}</p></details>}</div></li>; })}</ol>
    <div className="actions"><button className="btn primary" onClick={actions.toPick} disabled={!route.length}>Read my route</button></div>
  </>;
}

export function Pick(){
  const route = useGame(s=>s.J.route), progress = useGame(s=>s.J.progress);
  return <>
    <button className="linkbtn strong" onClick={actions.toWorld}><Icon name="back"/>Back to the map</button>
    <header className="scene"><p className="kicker">Survey</p><h1>Your route</h1><p className="lede">{route.length>1 ? `${route.length} processes, read one after another. Start with any; the next one waits for you when you finish.` : 'One process, every step.'} You will read each step, then see how the Guide reads it.{' '}<Term id="guide"/></p></header>
    {!route.length && <p className="callout"><Icon name="flag"/>Your route is empty. Pin up to three processes on the map.</p>}
    <div className="routes">{route.map(pid=>{ const e = getExpedition(pid); if(!e) return null;
      return <button key={pid} className="routecard" onClick={()=>actions.pickProc(pid)}>
        <span className="rill"><Art kind="dept" id={e.fnId}/></span>
        <span className="rfn"><Icon name={findProcessMeta(pid).fn.icon}/> {e.fn}</span>
        <span className="rn">{e.name}</span>
        <span className="rmeta"><HeatBar r={e.rating}/><span>{e.steps.length} steps</span>{e.flagship && <span className="flagship">Flagship</span>}</span>
        <span className="rd">{e.intro}</span><span className="rgo">{progress[pid] ? 'Carry on' : 'Walk this process'}</span></button>; })}</div>
    {route.length>0 && <div className="actions"><button className="linkbtn" onClick={actions.toReveal}>How do they rank across the Bank?</button></div>}
  </>;
}
