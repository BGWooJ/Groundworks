import {useGame, actions} from '../game/store.js';
import {CHARTER, charterNotes} from '../content/campaign.js';
import {Icon} from '../components/ui.jsx';

export default function OwnSetup(){
  const S = useGame(s=>s.S), o = S.own, c = o.charter || {};
  const notes = charterNotes(c);
  return <div className="narrow">
    <header className="scene"><p className="kicker">Your own ground</p><h1>Name the process, then list its steps</h1>
      <p className="lede">One process, the way it actually runs, start to finish. Three to eight steps is normal. You will read each one on the map.</p>
      <p className="saved-note"><Icon name="check"/>Saved in this browser as you type. Looking for a map you started before? <button className="linkbtn" onClick={()=>actions.view('maps')}>Open My maps</button></p></header>
    <div className="form">
      <div className="field"><label htmlFor="org">Organisation or team</label><input className="in" id="org" value={o.org} onChange={e=>actions.ownField('org', e.target.value)} placeholder="For example, Benefits organization"/></div>
      <div className="field"><label htmlFor="proc">The process</label><input className="in" id="proc" value={o.process} onChange={e=>actions.ownField('process', e.target.value)} placeholder="For example, benefits inquiries and enrolment"/><span className="hint">Something that happens many times, not once a year.</span></div>
    </div>

    <section className="charter" aria-labelledby="chh">
      <h2 id="chh" className="h3"><Icon name="notes"/>The charter <span className="muted small">(recommended)</span></h2>
      <p className="muted small">Four questions to answer before any tool, pilot or game. Your answers travel with the map in every export.</p>
      {CHARTER.map(q=><div key={q.k} className="field">
        <label htmlFor={'ch-'+q.k}><b>{q.label}.</b> {q.q}</label>
        {q.opts ? <div className="nchips" role="group" aria-label={q.label}>{q.opts.map(op=>{
            const on = q.multi ? (c[q.k]||[]).includes(op.id) : c[q.k]===op.id;
            return <button key={op.id} className={'nchip ' + (on?'on':'')} aria-pressed={on}
              onClick={()=> q.multi ? actions.charterAudience(op.id) : actions.charterSet(q.k, on ? '' : op.id)}>{op.name}</button>; })}</div>
          : <textarea className="in" id={'ch-'+q.k} rows={2} value={c[q.k]||''} onChange={e=>actions.charterSet(q.k, e.target.value)} placeholder={q.hint}/>}
      </div>)}
      {notes.length>0 && <ul className="chnotes">{notes.map((n,i)=><li key={i}><Icon name="near"/>{n}</li>)}</ul>}
    </section>

    <h2 className="h3 mt">Steps</h2>
    <div className="steprows">{o.steps.map((st,i)=><div key={st.id} className="steprow">
      <span className="num">{i+1}</span>
      <input className="in" value={st.name} onChange={e=>actions.ownStep(i, 'name', e.target.value)} placeholder="Step name, for example, triage the inbox" aria-label={`Step ${i+1} name`}/>
      <input className="in" value={st.notes} onChange={e=>actions.ownStep(i, 'notes', e.target.value)} placeholder="What actually happens, in a sentence" aria-label={`Step ${i+1} description`}/>
      <button className="iconbtn" onClick={()=>actions.ownStepRemove(i)} aria-label={`Remove step ${i+1}`}><Icon name="close"/></button>
    </div>)}</div>
    {S.setupError && <p className="caution" role="alert">Name the process and at least two steps to start mapping.</p>}
    <div className="actions"><button className="btn ghost" onClick={actions.ownStepAdd}><Icon name="plus"/>Add a step</button><button className="btn primary" onClick={actions.ownStart}>Start mapping</button></div>
  </div>;
}
