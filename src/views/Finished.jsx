/* The finished map, the debrief, and taking the map further. */
import {useGame, actions, ALL_MARKS} from '../game/store.js';
import {getExpedition} from '../content/expeditions.js';
import {VERDICTS} from '../engine/engine.js';
import {destOf, whyTool} from '../engine/tools.js';
import {reportById} from '../content/fieldReports.js';
import {STATS, standingLine, rankOf} from '../game/rpg.js';
import {stepDone, stepEval, startStep, finishedTitle, whatifChanges, guardrailsFor, guardrailName, levelName, round, buildExport, lppPrompt, planFor} from '../game/flow.js';
import {MapRow, Heading} from './MapView.jsx';
import {Icon, Emblem} from '../components/ui.jsx';
import {StatShift} from '../components/Feedback.jsx';
import {KeepProgress} from '../components/SaveDialogs.jsx';

function Matrix({S}){
  const cells = {};
  S.steps.forEach((st,i)=>{ if(!stepDone(S, st)) return; const e = stepEval(S, st); const k = e.value+'|'+e.feas;
    (cells[k] = cells[k]||[]).push(<span key={i} className={'mdot b-'+e.a.band} title={st.name}>{i+1}</span>); });
  const row = v=><>
    <span className="ax">{levelName(v)}</span>
    {['low','mid','high'].map(f=><div key={f} className={'mcell ' + (v==='high'&&f==='high'?'win':'')}>{v==='high'&&f==='high' && <span className="ml2">Start here</span>}{cells[v+'|'+f]}</div>)}
  </>;
  return <><div className="matrix">{row('high')}{row('mid')}{row('low')}<span/><span className="ax c">Low</span><span className="ax c">Medium</span><span className="ax c">High</span></div>
    <div className="maxes"><span>Value runs up the side</span><span>Feasibility runs across</span></div></>;
}

function Debrief({S}){
  const w = S.walk; if(!w || !w.start) return null;
  const delta = {}; STATS.forEach(s=>{ delta[s.id] = (w.stats[s.id]||0) - (w.start[s.id]||0); });
  return <section className="debrief"><h2 className="h3"><Icon name="trust"/>Debrief</h2>
    <p className="sponsor">{standingLine(delta)}</p>
    <div className="dbgrid">
      <div><h3 className="h4">Your standing this walk</h3><StatShift d={delta}/>{!Object.values(delta).some(Boolean) && <p className="muted small">No complications moved your standing.</p>}</div>
      <div><h3 className="h4">Earned</h3><p className="xpbig">+{w.xp} XP</p>
        {((w.marks||[]).length>0 || (w.ranks||[]).length>0) && <ul className="earned">
          {(w.ranks||[]).map(r=><li key={r}><Icon name="shieldup"/>New rank: <b>{r}</b></li>)}
          {(w.marks||[]).map(id=>{ const m = ALL_MARKS.find(x=>x.id===id); return m ? <li key={id}><Icon name={m.icon}/>Mark: <b>{m.name}</b></li> : null; })}
        </ul>}
        {((w.marks||[]).length>0 || (w.ranks||[]).length>0) && <button className="linkbtn" onClick={()=>actions.view('character')}>See them on your character sheet</button>}</div>
      <div><h3 className="h4">Landmark cases met</h3>{w.reports.length ? <ul className="mini">{w.reports.map(id=><li key={id}><button className="linkbtn" onClick={()=>actions.seeReport(id)}><Icon name="book"/>{reportById(id).title}</button></li>)}</ul> : <p className="muted small">None new on this walk.</p>}</div>
    </div></section>;
}


/* v7: the finished map as a strategy, not a list of verdicts. */
function Plan({S}){
  const p = planFor(S); if(!p) return null;
  return <section className="plan" aria-labelledby="planh">
    <header className="plan-head"><p className="kicker">The plan</p><h2 id="planh">{p.headline}</h2>
      {p.charter && p.charter.challenge && <p className="plan-charter"><b>The change you want.</b> {p.charter.challenge}</p>}
      {p.hours && <p className="plan-hours">{Math.round(p.hours.inPlay)===Math.round(p.hours.total)
          ? <>All of about <b>{round(p.hours.total).toLocaleString()}</b> hours a month go on steps the plan acts on</>
          : <><b>{round(p.hours.inPlay).toLocaleString()}</b> of about <b>{round(p.hours.total).toLocaleString()}</b> hours a month go on steps the plan acts on</>}
        {p.hours.steps<p.hours.of ? ` (numbers given for ${p.hours.steps} of ${p.hours.of} steps)` : ''}.</p>}
    </header>
    <ol className="phases">{p.phases.map((ph,i)=><li key={ph.id} className={'phase p-' + ph.id + (ph.steps.length ? '' : ' empty')}>
      <span className="ph-n">{i+1}</span>
      <div className="ph-head"><b>{ph.name}</b><span>{ph.when}</span></div>
      <p className="ph-why">{ph.why}</p>
      {ph.steps.length ? <ul className="ph-steps">{ph.steps.map(r=><li key={r.n}><Emblem verdict={r.verdict} size={22}/>
          <span><b>Step {r.n}. {r.name}</b><span className="muted small">{r.verdictName}{r.tool ? `, ${r.tool}` : ''}</span><span className="ph-first">First move: {r.first}</span></span></li>)}</ul>
        : <p className="muted small">No steps here.</p>}
    </li>)}</ol>
    {p.depends.length>0 && <div className="plan-deps"><Icon name="near"/><div><b>Check the order.</b>{p.depends.map(x=><p key={x.n}>Step {x.n}, {x.name.toLowerCase()}, comes after step{x.after.length>1?'s':''} {x.after.join(' and ')}, which need{x.after.length>1?'':'s'} groundwork first. If it uses what {x.after.length>1?'those steps produce':'that step produces'}, {x.phase==='prove' ? 'its pilot waits for the groundwork' : 'build it after the groundwork, not before'}.</p>)}</div></div>}
    <div className="plan-grid">
      <div><h3 className="h4">What the sponsor needs to decide or provide</h3>
        {p.asks.length ? <ol className="asks">{p.asks.map((a,i)=><li key={i}>{a.text}</li>)}</ol> : <p className="muted small">Nothing beyond the time of the people involved.</p>}</div>
      <div><h3 className="h4">How you will know it worked</h3>
        <ul className="measures">{p.measures.map((m,i)=><li key={i}><span className="muted small">{m.from}</span>{m.text}</li>)}</ul></div>
    </div>
  </section>;
}

export default function Finished(){
  const S = useGame(s=>s.S);
  const t = finishedTitle(S), best = startStep(S);
  let start = null;
  if(best){
    const st = best.st, e = best.e, v = VERDICTS[e.verdict], g = guardrailsFor(e);
    const metric = S.mode==='guided' ? st.metric : (e.nums ? `Hours a month on this step (about ${round(e.nums.total)} today), and how often it is redone.` : 'Time per item, and how often it is redone. Measure both for two weeks first.');
    start = <section className="start"><span className="sl">Where to start</span><h2><Emblem verdict={e.verdict} size={34}/>{st.name}</h2>
      <p className="sv"><b>{v.name}.</b> {v.advice}</p>
      <dl className="moves"><div><dt>First move</dt><dd>{v.first}</dd></div><div><dt>Measure it by</dt><dd>{metric}</dd></div>
        <div><dt>Tool</dt><dd>{e.tool ? destOf(e.tool.winner).name + '. ' + whyTool(e.tool) : ''}</dd></div></dl>
      <div className="gchips">{g.slice(0,4).map(id=><span key={id}>{guardrailName(id)}</span>)}</div></section>;
  }
  const wi = S.mode==='own' ? whatifChanges(S) : null;
  const anyWi = S.mode==='own' && Object.values(S.whatif).some(Boolean);
  return <>
    <header className="scene"><p className="kicker">{S.mode==='guided' ? getExpedition(S.procId).name : S.own.process}, all steps read</p><h1>{t.h1}</h1><p className="lede">{t.lede}</p></header>
    {anyWi && <p className="callout wi-on"><Icon name="spark"/>What-if view. The map shows what would change; switch everything off to see your answers again.</p>}
    {S.reopened && <p className="callout back"><Icon name="map"/><span>A finished walk, reopened. Nothing is scored again; take it further or walk the process afresh.</span></p>}
    <MapRow S={S} final/>
    <Plan S={S}/>
    {S.mode==='guided' && <Debrief S={S}/>}
    <Heading S={S} final/>
    <div className="fgrid">{start}<section className="mbox"><h2 className="h4">Value and feasibility</h2><Matrix S={S}/></section></div>
    {S.mode==='own' && <section className="whatif"><h2 className="h3">What if…</h2><p className="muted small">Flip a switch and see what would change. Your answers stay as they are.</p>
      <div className="wis">{[['double','The volume doubled'],['digital','Everything arrived digitally'],['devs','Developers were available']].map(([k,l])=>
        <button key={k} className={'wi ' + (S.whatif[k]?'on':'')} role="switch" aria-checked={S.whatif[k]} onClick={()=>actions.whatif(k)}><span className="sw"><i/></span>{l}</button>)}</div>
      {wi && (wi.length ? <ul className="wichanges">{wi.map(x=><li key={x.n}><b>Step {x.n}, {x.name}:</b> {x.text}.</li>)}</ul> : <p className="wichanges none">Nothing changes. These steps hold up under this what-if.</p>)}
    </section>}
    {!S.reopened && <KeepProgress/>}
    <div className="actions"><button className="btn primary" onClick={actions.toExport}><Icon name="download"/>Take the map further</button>
      {S.mode==='guided' ? <button className="btn ghost" onClick={actions.startGuided}>Walk another process</button> : <button className="btn ghost" onClick={actions.toMap}>Back to the map</button>}
      <button className="btn ghost" onClick={actions.home}><Icon name="home"/>Home</button></div>
  </>;
}

export function Export(){
  const S = useGame(s=>s.S);
  const d = buildExport(S);
  return <>
    <button className="linkbtn strong" onClick={actions.toFinished}><Icon name="back"/>The finished map</button>
    <header className="scene"><h1>Take this map further</h1><p className="lede">Each option uses the same abstracted results: step profiles, your numbers, verdicts, tool leanings and guardrails{d.charter?', and your charter':''}. Nothing is sent anywhere. You choose where it goes.</p></header>
    <label className="toggle"><input type="checkbox" checked={S.includeDesc} onChange={e=>actions.includeDesc(e.target.checked)}/><span><b>Include step descriptions</b><span className="muted">Off by default. Descriptions can carry internal detail that the abstracted results leave out.</span></span></label>
    <div className="xgrid">
      <section className="xcard"><h2>Analyse in LPP</h2><p>LPP has no connector, so the map comes with a prompt ready to paste. It asks LPP to challenge the verdicts and find the risks you missed.</p>
        <pre className="prompt" id="prompt">{lppPrompt(d)}</pre><button className="btn primary" onClick={actions.copyPrompt}><Icon name="copy"/>Copy prompt</button></section>
      <div className="xcol">
        <section className="xcard"><h2>Hand off to Copilot Studio</h2><p>Download the map file and save it where your agent reads, such as its knowledge folder. The structure is the same from map to map, so an agent can rely on it.</p><button className="btn primary" onClick={actions.dlJSON}><Icon name="download"/>Download map file (.json)</button></section>
        <section className="xcard"><h2>Open in a spreadsheet</h2><p>One row per step with every field, for your own analysis or to combine several maps.</p><button className="btn secondary" onClick={actions.dlCSV}><Icon name="download"/>Download .csv</button></section>
        <section className="xcard"><h2>Bring it to a meeting</h2><p>The finished map and the start-here case, ready to print or save as a PDF.</p><button className="btn secondary" onClick={actions.print}><Icon name="print"/>Print or save as PDF</button></section>
      </div>
    </div>
  </>;
}
