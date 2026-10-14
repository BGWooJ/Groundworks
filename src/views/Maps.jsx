/* My maps (v7): every walk and map you have started or finished, with a way back into each. */
import {useState} from 'react';
import {useGame, actions} from '../game/store.js';
import {workItems, ago, progressLabel} from '../game/journal.js';
import {Icon, Meter} from '../components/ui.jsx';

export function openItem(x){
  if(x.kind==='walk') return actions.resumeWalk(x.id);
  if(x.kind==='finished-walk') return actions.openWalk(x.id);
  return actions.openMap(x.id);
}
export function openLabel(x){
  if(x.kind==='draft') return 'Finish setting up';
  if(x.kind==='finished-walk') return 'Open the finished map';
  if(x.done) return 'Open the finished map';
  return x.read ? 'Carry on' : 'Start reading';
}

function Row({x}){
  const [confirm, setConfirm] = useState(false);
  const canDelete = x.kind==='map' || x.kind==='draft' || x.kind==='walk';
  return <li className={'work k-' + x.kind + (x.done ? ' done' : '')}>
    <span className="w-ico"><Icon name={x.kind==='walk' || x.kind==='finished-walk' ? 'map' : 'plot'}/></span>
    <div className="w-main">
      <span className="w-where">{x.where}{x.updated ? <>, {ago(x.updated)}</> : null}</span>
      <b className="w-title">{x.title}</b>
      <span className="w-prog">{progressLabel(x)}</span>
      {x.total>0 && x.kind!=='draft' && x.kind!=='finished-walk' && <Meter value={x.read} max={x.total} label="Steps read" tone={x.done?'good':'brass'}/>}
    </div>
    <div className="w-acts">
      {(x.kind!=='finished-walk' || x.reopenable) && <button className="btn primary small" onClick={()=>openItem(x)}>{openLabel(x)}</button>}
      {(x.kind==='map' || x.kind==='draft') && <button className="btn secondary small" onClick={()=>actions.saveMapFile(x.id)}><Icon name="download"/>Save map file</button>}
      {canDelete && (confirm
        ? <span className="w-confirm" role="alert">Delete for good?
            <button className="btn danger small" onClick={()=>{ setConfirm(false); x.kind==='walk' ? actions.discardWalk(x.id) : actions.deleteMap(x.id); }}>Delete</button>
            <button className="btn ghost small" onClick={()=>setConfirm(false)}>Keep</button></span>
        : <button className="iconbtn" onClick={()=>setConfirm(true)} aria-label={`Delete ${x.title}`}><Icon name="trash"/></button>)}
    </div>
  </li>;
}

export default function Maps(){
  const J = useGame(s=>s.J);
  const items = workItems(J), open = items.filter(x=>!x.done), done = items.filter(x=>x.done);
  return <>
    <button className="linkbtn strong" onClick={actions.back}><Icon name="back"/>Back</button>
    <header className="scene"><p className="kicker">Your work</p><h1>My maps</h1>
      <p className="lede">Every walk and map you have started is saved in this browser as you go. Pick any of them up again here. To carry on in another browser or on another computer, save your progress as a link or a file and open it there.</p></header>
    <div className="row mapsbar">
      <button className="btn brass" onClick={actions.startOwn}><Icon name="plus"/>Map a new process</button>
      <button className="btn secondary" onClick={actions.startGuided}><Icon name="map"/>Explore Meridian</button>
      <button className="btn secondary" onClick={actions.saveOpen}><Icon name="send"/>Save progress</button>
      <button className="btn secondary" onClick={()=>actions.restoreOpen()}><Icon name="download"/>Open saved progress</button>
    </div>
    <section aria-labelledby="ip"><h2 id="ip" className="h3 mt">In progress</h2>
      {open.length ? <ul className="worklist">{open.map(x=><Row key={x.key} x={x}/>)}</ul>
        : <p className="muted">Nothing in progress. Start a walk or map a process, and it will be saved here as you go.</p>}</section>
    <section aria-labelledby="fd"><h2 id="fd" className="h3 mt">Finished</h2>
      {done.length ? <ul className="worklist">{done.map(x=><Row key={x.key} x={x}/>)}</ul>
        : <p className="muted">Finished maps appear here, ready to reopen, export or take to a meeting.</p>}</section>
  </>;
}
