/* =====================================================================
   THE QUICK READ (v8): one screen per process.
   The facts of each step are given; the player makes three calls per
   step (the kind of work, whether it is an LLM's job, how much it acts on
   its own), then compares the whole process with the Guide at once.
   The full read, every question on every step, is one toggle away.
   ===================================================================== */
import {useEffect, useRef} from 'react';
import {useGame, actions} from '../game/store.js';
import {getExpedition} from '../content/expeditions.js';
import {SHAPES, INPUTS, STAKES, AUTONOMY, CAPS} from '../content/meridian.js';
import {BANDS, BAND_CAPS, WHERE, BUILDERS, SENSITIVITY, VERDICTS, expertBand, fieldVerdict} from '../engine/engine.js';
import {areaOfProcess} from '../content/areas.js';
import {reportById} from '../content/fieldReports.js';
import {quickCalled, scoredQs, markOf, questionOf, optName, teamOf, QUICK_CTX} from '../game/flow.js';
import {Icon, Emblem, Emph, Term} from '../components/ui.jsx';

const nameOf = (list, id)=>(list.find(o=>o.id===id) || {}).name || id;

/* Quick or full: shown on the process map and on this screen. */
export function ReadToggle({S}){
  if(S.mode!=='guided') return null;
  const quick = S.read!=='full';
  return <div className="readtoggle" role="group" aria-label="How to read this process">
    <button className={quick ? 'on' : ''} aria-pressed={quick} onClick={()=>actions.setRead('quick')}><b>Quick read</b><span>Three calls a step, the facts given</span></button>
    <button className={!quick ? 'on' : ''} aria-pressed={!quick} onClick={()=>actions.setRead('full')}><b>Full read</b><span>Every question, one step at a time</span></button>
  </div>;
}

export function Crumbs({exp, here}){
  const area = areaOfProcess(exp.id); if(!area) return null;
  return <nav className="crumbs" aria-label="Where this process sits in Meridian">
    <button className="crumb" onClick={()=>actions.worldAt(0)}><Icon name="map"/>Meridian</button><Icon name="chev" className="crumb-sep"/>
    <button className="crumb" onClick={()=>actions.worldAt(1, area.fnId)}>{exp.fn}</button><Icon name="chev" className="crumb-sep"/>
    <button className="crumb" onClick={()=>actions.worldAt(2, area.fnId, area.id)}>{area.name}</button><Icon name="chev" className="crumb-sep"/>
    {here ? <><button className="crumb" onClick={actions.toMap}>{exp.name}</button><Icon name="chev" className="crumb-sep"/><span className="crumb on" aria-current="location">{here}</span></>
      : <span className="crumb on" aria-current="location">{exp.name}</span>}
  </nav>;
}

function Chips({label, opts, value, onPick, name, small}){
  return <div className={'qchips' + (small ? ' small' : '')} role="radiogroup" aria-label={label}>
    {opts.map(o=><button key={o.id} role="radio" aria-checked={value===o.id} className={'nchip' + (value===o.id ? ' on' : '')} onClick={()=>onPick(o.id)} title={o.d || undefined}>{name ? name(o) : o.name}</button>)}
  </div>;
}

/* About your organisation: no Guide answer; it decides which approved tool fits, not the verdicts. */
function Context({S}){
  const c = Object.assign({}, QUICK_CTX, S.ctx || {});
  return <section className="qctx" aria-labelledby="qctx-h">
    <div className="qctx-head"><h2 id="qctx-h" className="h4">About your organisation</h2>
      <p className="small muted">Set once and kept for the rest of your route. The Guide has no answer here: these change which approved tool fits, not the verdicts.</p></div>
    <div className="qctx-rows">
      <div><span className="qctx-k">Where most of the work happens</span><Chips small label="Where most of the work happens" opts={WHERE} value={c.where} onPick={v=>actions.quickCtx('where', v)}/></div>
      <div><span className="qctx-k">Who would build it</span><Chips small label="Who would build it" opts={BUILDERS} value={c.builder} onPick={v=>actions.quickCtx('builder', v)}/></div>
      <div><span className="qctx-k">How sensitive the data is</span><Chips small label="How sensitive the data is" opts={SENSITIVITY} value={c.sens} onPick={v=>actions.quickCtx('sens', v)}/></div>
    </div>
  </section>;
}

function QuickStep({S, st, i}){
  const a = S.ans[st.id] || {}, done = quickCalled(a);
  const ref = useRef(null), was = useRef(done);
  /* When a step's calls are complete, bring the next step into view. */
  useEffect(()=>{
    if(done && !was.current){ const next = ref.current && ref.current.nextElementSibling;
      if(next){ const r = next.getBoundingClientRect(); if(r.top > window.innerHeight - 160) window.scrollBy({top:r.top - 140, behavior:'smooth'}); } }
    was.current = done;
  }, [done]);
  const capOpts = a.band ? BAND_CAPS[a.band] : [];
  return <li className={'qstep' + (done ? ' done' : '')} ref={ref} aria-labelledby={'qs-'+i}>
    <header className="qs-head">
      <span className="qs-n" aria-hidden="true">{done ? <Icon name="check"/> : i+1}</span>
      <div><h2 id={'qs-'+i} className="h3">{st.name}</h2><p className="small muted">Step {i+1} of {S.steps.length}, done by {teamOf(st.who)}</p></div>
    </header>
    <p className="qs-notes"><Emph text={st.notes}/></p>
    <dl className="qfacts" aria-label="What we know">
      <div><dt>How much</dt><dd><Emph text={st.volume}/></dd></div>
      <div><dt>Inputs</dt><dd>{nameOf(INPUTS, st.expert.input)}</dd></div>
      <div><dt>Stakes</dt><dd>{nameOf(STAKES, st.expert.stakes)}</dd></div>
      <div className="wide"><dt>What it costs today</dt><dd><Emph text={st.pain}/></dd></div>
    </dl>
    <div className="qcalls">
      <fieldset className="qcall"><legend><span>1</span>What kind of work is it?</legend>
        <Chips label="What kind of work is it?" opts={SHAPES} value={a.shape} onPick={v=>actions.quickCall(i, 'shape', v)}/></fieldset>
      <fieldset className="qcall"><legend><span>2</span>Is it an LLM’s kind of work? <Term id="llm"/></legend>
        <Chips label="Is it an LLM’s kind of work?" opts={BANDS} value={a.band} onPick={v=>actions.quickCall(i, 'band', v)}/>
        {a.band && capOpts.length>0 && <p className="qcap"><label htmlFor={'cap-'+i}>Capability</label>
          <select id={'cap-'+i} className="in" value={a.cap || ''} onChange={e=>actions.quickCall(i, 'cap', e.target.value)}>
            {capOpts.map(id=><option key={id} value={id}>{CAPS[id].name}</option>)}</select>
          <span className="small muted">{a._capAuto===false ? 'Your choice' : 'Suggested for this kind of work. Change it if you see it differently.'}</span></p>}
      </fieldset>
      {a.cap!=='fix' && <fieldset className="qcall"><legend><span>3</span>How much should it do on its own?</legend>
        <Chips label="How much should it do on its own?" opts={AUTONOMY} value={a.auto} onPick={v=>actions.quickCall(i, 'auto', v)}/></fieldset>}
    </div>
  </li>;
}

/* ---------- after comparing ---------- */
const MARK = {match:['check','Matches the Guide'], near:['near','Close to the Guide'], miss:['x','Differs from the Guide']};
const LABEL = {shape:'Kind of work', band:'LLM call', cap:'Capability', auto:'On its own'};
function callName(q, a, v){ return q.k==='cap' ? (CAPS[v] || {}).name : optName(q.opts(a), v); }

function ResultRow({S, st, i}){
  const a = S.ans[st.id] || {}, open = !!S.qopen[i], v = VERDICTS[fieldVerdict(st)];
  const qs = scoredQs(a), r = a.report ? reportById(a.report) : null;
  return <li className={'qres' + (open ? ' open' : '')}>
    <button className="qres-head" aria-expanded={open} onClick={()=>actions.quickOpen(i)}>
      <span className="qs-n" aria-hidden="true">{i+1}</span>
      <span className="qres-name"><b>{st.name}</b>
        <span className="qres-calls">{qs.map(q=>{ const m = markOf(S, q, st, a[q.k]);
          return <span key={q.k} className={'qmark m-' + m}><Icon name={MARK[m][0]}/><span className="sr">{MARK[m][1]}: </span>{LABEL[q.k]}</span>; })}</span></span>
      <span className={'qres-v vt-' + v.tone}><Emblem verdict={fieldVerdict(st)} size={26}/><span>{v.name}</span></span>
      <Icon name="chev" className="qres-chev"/>
    </button>
    {open && <div className="qres-body">
      <table className="qcmp"><thead><tr><th scope="col">Call</th><th scope="col">Yours</th><th scope="col">The Guide’s</th></tr></thead>
        <tbody>{qs.map(q=>{ const m = markOf(S, q, st, a[q.k]), g = q.field(st), ga = Object.assign({}, a, {band:expertBand(st)});
          return <tr key={q.k} className={'m-' + m}><th scope="row">{LABEL[q.k]}</th><td><Icon name={MARK[m][0]}/> {callName(q, a, a[q.k])}</td><td>{callName(q, ga, g)}</td></tr>; })}</tbody></table>
      <p className="qguide"><b>The Guide:</b> {st.expertWhy}</p>
      <p className="small muted">{st.autoNote}</p>
      <div className="fnotes">{(S.dug[st.id] ? [0,1] : [0]).map(k=>{ const d = st.discoveries[k];
        return <article key={k} className="fnote"><span className="fni"><Icon name="notes"/></span><div><h4>{d.title}</h4><p>{d.text}</p><p className="eff">{d.effect}</p></div></article>; })}
        {!S.dug[st.id] && <button className="fnote sealed" onClick={()=>actions.dig(i)}><Icon name="interview"/><span><b>Hear more from the team</b><span>One more note from {teamOf(st.who)}. +5 XP</span></span></button>}</div>
      {r && <button className="linkbtn" onClick={()=>actions.seeReport(r.id)}><Icon name="book"/>A landmark case: {r.title}</button>}
    </div>}
  </li>;
}

function Results({S}){
  let agree = 0, near = 0, total = 0;
  S.steps.forEach(st=>{ const a = S.ans[st.id] || {}; scoredQs(a).forEach(q=>{ total++; const m = markOf(S, q, st, a[q.k]); if(m==='match') agree++; else if(m==='near') near++; }); });
  const ratio = total ? agree/total : 0, tier = ratio>=.8 ? 'great' : (ratio>=.6 ? 'good' : (ratio>=.4 ? 'mixed' : 'off'));
  return <section className="qresults" aria-labelledby="qr-h">
    <div className={'qsum agree t-' + tier}><span className="ag">{agree}<small> of {total}</small></span>
      <div><h2 id="qr-h" className="h3">You and the Guide agree on {agree} of {total} calls{near ? `, and come close on ${near}` : ''}.</h2>
        <p className="small">Open any step to see the Guide’s reasons and notes from the team. Where you differ, the reasons are the lesson.</p></div></div>
    <ol className="qresrows">{S.steps.map((st,i)=><ResultRow key={st.id} S={S} st={st} i={i}/>)}</ol>
  </section>;
}

export default function QuickRead(){
  const S = useGame(s=>s.S);
  const exp = getExpedition(S.procId); if(!exp) return null;
  const compared = S.steps.every(st=>(S.ans[st.id] || {}).revealed);
  const called = S.steps.filter(st=>quickCalled(S.ans[st.id])).length, n = S.steps.length;
  return <div className="quick">
    <Crumbs exp={exp} here={compared ? 'Compared' : 'Quick read'}/>
    <header className="scene"><p className="kicker">{exp.name}</p>
      <h1>{compared ? 'How your calls compare' : 'Make the calls'}</h1>
      <p className="lede">{compared ? 'The Guide’s verdict for every step, and where your calls matched.'
        : `${n} steps. The facts are given; for each step, make three calls. When every step has its calls, compare the whole process with the Guide.`}</p>
      {!compared && <ReadToggle S={S}/>}</header>
    {compared ? <Results S={S}/> : <>
      <Context S={S}/>
      <ol className="qsteps">{S.steps.map((st,i)=><QuickStep key={st.id} S={S} st={st} i={i}/>)}</ol>
    </>}
    <div className={'actions sticky qfoot' + (compared || called===n ? ' ready' : '')}>
      {compared ? <><span className="count"><Icon name="check"/>All {n} steps compared</span>
          <button className="btn brass" onClick={actions.nextStep}>Continue to your plan<Icon name="chev"/></button></>
        : <><span className="count"><span className="qbarm"><i style={{width:Math.round(called/n*100)+'%'}}/></span>{called} of {n} steps called</span>
          <button className="btn brass" data-focus="compare" disabled={called<n} onClick={actions.quickCompare}><Icon name="spark"/>Compare with the Guide</button></>}
    </div>
  </div>;
}
