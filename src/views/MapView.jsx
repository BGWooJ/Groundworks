/* The process map: steps as waypoints on a trail, and the heading toward an approved tool. */
import {useGame, actions} from '../game/store.js';
import {getExpedition} from '../content/expeditions.js';
import {DESTINATIONS, destOf, stepsLabel} from '../engine/tools.js';
import {VERDICTS, numbersOf} from '../engine/engine.js';
import {CHARTER} from '../content/campaign.js';
import {stepDone, stepEval, nextOpenIndex, readSteps, headingFor, splitVolume, startedReading, round, findProcessMeta, optName} from '../game/flow.js';
import {Icon, Art, Chip, Emblem, Emph, Term} from '../components/ui.jsx';

function VolLine({S, st}){
  if(S.mode==='guided'){ const v = splitVolume(st.volume); return <div className="vol">{v.big && <b>{v.big}</b>}<span>{v.big?v.rest:st.volume}</span></div>; }
  const n = numbersOf((S.ans[st.id]||{}).nums);
  return n ? <div className="vol"><b>{Math.round(n.perMonth).toLocaleString()}</b><span>a month, about {round(n.total)} hours</span></div> : <div className="vol"><span className="muted">Numbers not given</span></div>;
}

export function StepCard({S, st, i, final}){
  const done = stepDone(S, st), next = nextOpenIndex(S), isCur = !done && i===next;
  const canOpen = S.mode==='own' || done || isCur;
  const e = done ? stepEval(S, st) : null;
  const cls = done ? 'done' : (isCur ? 'cur' : 'up');
  const prevDone = i>0 && stepDone(S, S.steps[i-1]);
  const body = <>
    {done && <span className="cill"><Art kind="shape" id={e.a.shape}/></span>}
    <h3 className="ct">{st.name}</h3>
    <VolLine S={S} st={st}/>
    {done && <Chip band={e.a.band}/>}
    {done && final && <p className={`cverdict v-${VERDICTS[e.verdict].tone}`}><Emblem verdict={e.verdict} size={22}/>{S.mode==='guided' && <span className="muted">Guide: </span>}{VERDICTS[e.verdict].name}</p>}
    {done && e.tool && <span className="points"><Icon name="arrow"/>Points to <b>{destOf(e.tool.winner).name}</b></span>}
    {isCur && <>{S.mode==='guided' && <p className="cpain"><Emph text={st.pain}/></p>}<span className="cgo">{startedReading(S, st) ? 'Continue reading' : 'Read this step'}</span></>}
    {!done && !isCur && <span className="muted cnr">Not read yet</span>}
  </>;
  return <li className={'mcol ' + cls}>
    <div className="rail" aria-hidden="true">
      <span className={'seg ' + (i===0?'none':(prevDone?'solid':'dash'))}/>
      <span className={'node ' + cls}>{done ? <Emblem verdict={e.verdict} size={30}/> : i+1}</span>
      <span className={'seg ' + (i===S.steps.length-1?'none':(done?'solid':'dash'))}/>
    </div>
    {canOpen
      ? <button className={'mcard ' + cls} onClick={()=>actions.openStep(i)} style={{viewTransitionName:`step-${i}`}}>{body}</button>
      : <div className={'mcard ' + cls} style={{viewTransitionName:`step-${i}`}}>{body}</div>}
  </li>;
}
export function MapRow({S, final}){
  return <ol className="maprow" style={{'--n':S.steps.length}}>{S.steps.map((st,i)=><StepCard key={st.id} S={S} st={st} i={i} final={final}/>)}</ol>;
}

function FitColumn({S, id, h, read, label, also}){
  const d = destOf(id), why = [];
  read.forEach(st=>{ const t = stepEval(S, st).tool; if(t && t.winner===id) (t.reasons[id]||[]).forEach(r=>{ if(!why.includes(r)) why.push(r); }); });
  return <div className={'fit ' + (also?'also':'')}><div className="fh"><span className="fn">{label || d.name}</span><span className="fs">{stepsLabel(h.by[id]||[])}</span></div>
    <span className="fw">{d.what}. {d.about}</span><p>{why.slice(0,3).join(' ') || 'No step points here yet.'}</p></div>;
}
function DestRail({h}){
  return <div className="drail">{DESTINATIONS.map(d=>{
    const lead = (h.leaders||[]).includes(d.id), n = (h.by[d.id]||[]).length;
    return <div key={d.id} className={`dstop ${lead?'lead':''} ${n?'has':''}`}><span className="dn">{d.name}</span><span className="dw">{d.what}</span>{lead && <span className="ds">{stepsLabel(h.by[d.id])}</span>}</div>;
  })}</div>;
}
export function Heading({S, final}){
  const read = readSteps(S);
  if(!read.length) return <section className="heading"><div className="hh"><h2>Where this process is heading</h2><span className="muted">Read a step and the approved tools it points to appear here.</span></div><DestRail h={{leaders:[], by:{}}}/></section>;
  const h = headingFor(S, read), names = h.leaders.map(id=>destOf(id).name);
  const title = names.length>1 ? `Two destinations: ${names[0]} and ${names[1]}` : `Heading toward ${names[0]}`;
  const sub = read.length===S.steps.length ? `All ${S.steps.length} steps read` : `Early read, ${read.length} of ${S.steps.length} steps`;
  return <section className="heading"><div className="hh"><h2><Icon name="compass"/>{title}</h2><span className="muted">{sub}</span></div>
    <DestRail h={h}/>
    <div className="fits">
      {h.leaders.map(id=><FitColumn key={id} S={S} id={id} h={h} read={read} label={final ? '' : (h.leaders.length===1 ? `Why ${destOf(id).name} leads` : '')}/>)}
      {!final && h.rising && <FitColumn S={S} id={h.rising} h={h} read={read} label={`Also in play: ${destOf(h.rising).name}`} also/>}
    </div></section>;
}

/* The charter for this walk: the user's own four answers, or the Guide's case for a Meridian process. */
function Charter({S}){
  if(S.mode==='own'){
    const c = S.own.charter || {};
    if(!(c.challenge || c.success)) return null;
    const opt = (k, id)=> optName(CHARTER.find(x=>x.k===k).opts, id);
    return <aside className="chartercard"><h2 className="h4"><Icon name="notes"/>Your charter</h2><dl>
      {c.challenge && <div><dt>The challenge</dt><dd>{c.challenge}</dd></div>}
      {c.success && <div><dt>Success looks like</dt><dd>{c.success}</dd></div>}
      {c.tracking && <div><dt>Tracking</dt><dd>{opt('tracking', c.tracking)}</dd></div>}
      {c.audience && c.audience.length>0 && <div><dt>For</dt><dd>{c.audience.map(a=>opt('audience', a)).join(', ')}</dd></div>}
    </dl></aside>;
  }
  const meta = findProcessMeta(S.procId);
  const strong = meta.fn.signals.find(s=>s.s==='strong') || meta.fn.signals[0];
  return <aside className="chartercard"><h2 className="h4"><Icon name="notes"/>The case for this walk</h2><dl>
    <div><dt>The challenge</dt><dd><Emph text={strong.t}/></dd></div>
    <div><dt>Success would look like</dt><dd>{S.steps.slice(0,3).map(st=>st.metric).filter(Boolean).join('; ')}.</dd></div>
    <div><dt>Why it is worth a walk</dt><dd>{meta.proc.why}</dd></div>
  </dl></aside>;
}

export default function MapView(){
  const S = useGame(s=>s.S);
  const exp = S.mode==='guided' ? getExpedition(S.procId) : null;
  const n = S.steps.length, next = nextOpenIndex(S);
  const org = S.mode==='guided' ? exp.fn : S.own.org;
  return <>
    <header className="scene withill"><div className="sh"><p className="kicker">{org || 'Your process'}</p><h1>Where would an LLM earn its keep?</h1>
      <p className="lede">{n} steps, in the order the work happens. Read each one, starting with the highlighted step.{' '}<Term id="llm"/></p></div>
      {exp && <div className="hill"><Art kind="dept" id={exp.fnId}/></div>}</header>
    {S.resumed && S.mode==='guided' && <p className="callout back"><Icon name="flag"/><span>Welcome back. Your answers are as you left them.</span>
      <button className="linkbtn" onClick={actions.restartWalk}>Start this walk again</button></p>}
    <Charter S={S}/>
    <MapRow S={S}/>
    <p className="saved-note"><Icon name="check"/>Saved in this browser as you go. Find it again any time under <button className="linkbtn" onClick={()=>actions.view('maps')}>My maps</button>.</p>
    {(next==null || S.mode==='own') && <div className="actions">
      {next==null && <button className="btn primary" onClick={actions.toFinished}>See the finished map</button>}
      {S.mode==='own' && <button className="btn ghost" onClick={actions.ownEdit}>Edit the steps and charter</button>}
      {S.mode==='own' && <button className="btn ghost" onClick={()=>actions.saveMapFile()}><Icon name="download"/>Save map file</button>}
    </div>}
    <Heading S={S}/>
  </>;
}
