/* The case library: landmark cases, real and public, collected as you meet them in walks. */
import {useState, useEffect, useRef} from 'react';
import {useGame, actions} from '../game/store.js';
import {FIELD_REPORTS} from '../content/fieldReports.js';
import {CAPS, GUARDRAILS} from '../content/meridian.js';
import {VERDICTS} from '../engine/engine.js';
import {Icon, Emblem} from '../components/ui.jsx';

export default function Library(){
  const codex = useGame(s=>s.J.profile.codex);
  const [filter, setFilter] = useState('all');
  const fresh = useRef(null), unseen = useGame(s=>s.J.profile.unseen);
  if(!fresh.current) fresh.current = (unseen && unseen.reports) || [];
  useEffect(()=>{ actions.markSeen('reports'); }, []);
  const collected = Object.keys(codex).length;
  const list = FIELD_REPORTS.filter(r=>filter==='all' || r.kind===filter);
  return <>
    <button className="linkbtn strong" onClick={actions.back}><Icon name="back"/>Back</button>
    <header className="scene"><p className="kicker">{collected} of {FIELD_REPORTS.length} collected</p><h1>Case library</h1>
      <p className="lede">Landmark cases: real, public cases where organisations got this right or wrong. You collect each one when a step you read, or a complication you face, calls for it. Every figure is from the source named on the card.</p></header>
    <div className="filters" role="group" aria-label="Show">{[['all','All'],['success','It worked'],['warning','Warnings'],['mixed','Mixed']].map(([k,l])=>
      <button key={k} className={'nchip ' + (filter===k?'on':'')} aria-pressed={filter===k} onClick={()=>setFilter(k)}>{l}</button>)}</div>
    <ul className="library">{list.map(r=>{ const have = !!codex[r.id];
      return <li key={r.id} className={`lcard k-${r.kind} ${have?'have':'locked'}`}>
        <button onClick={()=>actions.peekReport(r.id)}>
          <span className="lc-top"><span className="lc-k">{({success:'It worked', warning:'A warning', mixed:'Mixed'})[r.kind]}</span> <span className="lc-y">{r.year}</span></span>
          <b className="lc-t">{r.title}{fresh.current.includes(r.id) && <span className="newtag">New</span>}</b><span className="lc-o">{r.org}</span>
          <span className="lc-tags" aria-hidden="true">{r.caps.slice(0,2).map(c=><span key={c} className="tag">{CAPS[c].name}</span>)}</span>
          <span className="lc-v" aria-hidden="true">{r.verdicts.slice(0,2).map(v=><span key={v} title={VERDICTS[v].name}><Emblem verdict={v} size={20}/></span>)}<span className="muted small">{r.guardrails.map(g=>(GUARDRAILS.find(x=>x.id===g)||{}).name).slice(0,2).join(', ')}</span></span>
          <span className="lc-state">{have ? <><Icon name="check"/>Collected</> : <><Icon name="lock"/>Not yet met. Open to read it anyway</>}</span>
        </button></li>; })}</ul>
  </>;
}
