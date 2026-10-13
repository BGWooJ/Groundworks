/* Reading one step: the situation on the left, your read on the right. */
import {useState, useEffect, useRef} from 'react';
import {useGame, actions} from '../game/store.js';
import {AUTONOMY, SHAPES} from '../content/meridian.js';
import {REACT, HINTS, GUIDANCE} from '../content/story.js';
import {BANDS, BAND_CAPS, VERDICTS, MINUTE_CHIPS, REWORK, numbersOf, numbersSentence, expertBand, bandName, challengesOf, suggestCaps, suggestAutonomy} from '../engine/engine.js';
import {DESTINATIONS, destOf} from '../engine/tools.js';
import {reportFor, reportById} from '../content/fieldReports.js';
import {QUESTIONS, SCORED, asks, askedQuestions, answered, markOf, scoreRead, stepEval, stepDone, nextOpenIndex, pointerFor, optName, capName, fill,
  whoName, teamOf, splitVolume, levelName, guardrailsFor, guardrailName, familyOfCap, LV} from '../game/flow.js';
import {ROLES} from '../game/rpg.js';
import {Icon, Art, Emph, Emblem, Chip, Term} from '../components/ui.jsx';
import {ReportCard} from '../components/Feedback.jsx';

/* One arrival line per step, chosen once. */
const memo = {};
function line(key, list, vars){ if(!memo[key]) memo[key] = list[Math.floor(Math.random()*list.length)]; return fill(memo[key], vars); }

function DotField({n, caption}){
  if(!(n>0)) return null;
  const units = [1,2,5,10,20,25,50,100,200,250,500,1000,2000,5000,10000];
  const unit = units.find(u=>n/u<=40) || 10000, count = Math.max(1, Math.round(n/unit));
  return <><div className="dots" aria-hidden="true">{Array.from({length:count}).map((_,i)=><i key={i} style={{'--d':i}}/>)}</div>
    <span className="cap">Each dot is {unit.toLocaleString()}{caption?` ${caption}`:''}.</span></>;
}

function Ministrip({S}){
  const next = nextOpenIndex(S);
  return <nav className="ministrip" aria-label="Steps">{S.steps.map((st,i)=>{
    const done = stepDone(S, st), cur = i===S.cur, can = S.mode==='own' || done || i===next || cur;
    const inner = <>{done ? <Icon name="check"/> : <span className="mn">{i+1}</span>}<span className="ml">{st.name}</span></>;
    return <span key={st.id} className="mwrap">{i>0 && <span className={'mlink ' + (done?'solid':'')}/>}
      {can ? <button className={`mchip ${done?'done':''} ${cur?'cur':''}`} onClick={()=>actions.openStep(i)} aria-current={cur?'step':undefined}>{inner}</button>
           : <span className="mchip up">{inner}</span>}</span>;
  })}</nav>;
}

/* ---------- hints ---------- */
function guideInfo(S, q, a, st){
  const guided = S.mode==='guided';
  let ask = '', where = '', target = '';
  if(['shape','input','rep','stakes'].includes(q.k)){
    ask = HINTS.dimAsk[q.k];
    if(guided){ where = HINTS[q.k][q.field(st)]; target = HINTS.dimWhere[q.k]; }
  } else if(q.k==='band'){
    ask = 'Ask what the step produces. If it is language read, written or answered, an LLM may fit. If it follows fixed rules or moves data, it does not.';
    if(guided){ const b = BANDS.find(x=>x.id===expertBand(st)); where = `The Guide’s answer is in the description of “${b.name.toLowerCase()}”: ${b.d}`; target = 'notes'; }
  } else if(q.k==='cap'){
    ask = fill(HINTS.capAsk, {shape:optName(SHAPES,a.shape).toLowerCase()});
    if(guided) where = `The Guide picks from ${bandName(expertBand(st)).toLowerCase()}: look closely at “${capName(st.expertPick)}”.`;
  } else if(q.k==='auto'){
    ask = fill(HINTS.autoAsk, {stakes:levelName(a.stakes).toLowerCase()||'unknown'});
    if(guided){ where = HINTS.auto[st.autoBest]; target = 'pain'; }
  } else ask = 'The Guide has no answer here. This is about your organisation, and it decides which approved tool fits.';
  return {ask, where, target};
}
function GuideCard({S, q, a, st}){
  const g = guideInfo(S, q, a, st);
  return <aside className="guide-card" aria-label="Hint">
    <header><span><Icon name="compass"/>Hint</span><button className="iconbtn" onClick={actions.guideClose} aria-label="Close the hint"><Icon name="close"/></button></header>
    <p className="g-ask">{g.ask}</p>
    {g.where && (S.gui.tier>=2 ? <p className="g-where"><Icon name="spark"/>{g.where}</p>
      : <button className="g-btn" onClick={actions.guideMore}><Icon name="spark"/>Point me to the evidence</button>)}
    <footer><span>Guidance</span><div className="g-levels">{GUIDANCE.map(x=><button key={x.id} className={S.guide===x.id?'on':''} aria-pressed={S.guide===x.id} title={x.d} onClick={()=>actions.guideLevel(x.id)}>{x.name}</button>)}</div></footer>
  </aside>;
}

/* ---------- the situation ---------- */
function SituationGuided({S, st, i, glow}){
  const v = splitVolume(st.volume), big = parseFloat(String(v.big).replace(/,/g,''));
  const g = k=> glow===k ? ' ev-glow' : '';
  return <>
    <div className="sit-head"><span className="muted">Step {i+1} of {S.steps.length}, done by {whoName(st.who)}</span>
      <h1 style={{viewTransitionName:`step-${i}`}} tabIndex={-1}>{st.name}</h1>
      <p className="arrive">{line('arrive:'+st.id, REACT.arrive, {who:whoName(st.who)})}</p></div>
    <div className={'sblock' + g('volume')}><h2 className="h4">How much of it there is</h2>
      <div className="bigvol">{v.pre && <span className="pre">{v.pre}</span>}{v.big && <b>{v.big}</b>}<span>{v.big?v.rest:st.volume}</span></div>
      {big>=10 && <DotField n={big}/>}</div>
    <div className={'sblock' + g('systems')}><h2 className="h4">How it runs today</h2>
      <div className="pills">{st.systems.split(',').map((s,k)=>{ s = s.trim(); return <span key={k} className="pill">{s.charAt(0).toUpperCase()+s.slice(1)}</span>; })}</div>
      <p className={'notes' + g('notes')}><Emph text={st.notes}/></p></div>
    <figure className={'pain' + g('pain')}><figcaption>What it costs today</figcaption><blockquote><Emph text={st.pain}/></blockquote></figure>
  </>;
}
function SituationOwn({S, st, i, a}){
  const n = a.nums || {}, r = numbersOf(n);
  const custom = n.minutes && !MINUTE_CHIPS.some(c=>String(c.v)===String(n.minutes));
  return <>
    <div className="sit-head"><span className="muted">Step {i+1} of {S.steps.length}</span>
      <h1 style={{viewTransitionName:`step-${i}`}} tabIndex={-1}>{st.name}</h1>{st.notes && <p className="arrive">{st.notes}</p>}</div>
    <div className="sblock numbers">
      <h2 className="h4">The numbers <span className="muted">(optional, rough is fine)</span></h2>
      <div className="nq"><label htmlFor="ncount">How often does it happen?</label>
        <div className="nrow"><input className="in short" id="ncount" type="number" min="0" inputMode="decimal" value={n.count||''} onChange={e=>actions.numSet('count', e.target.value)} placeholder="e.g. 300"/>
          <select className="in short" aria-label="per" value={n.per||'month'} onChange={e=>actions.numSet('per', e.target.value)}>{['day','week','month','year'].map(p=><option key={p} value={p}>a {p}</option>)}</select></div></div>
      <div className="nq"><span className="nl" id="minl">Roughly how long does each one take?</span>
        <div className="nchips" role="group" aria-labelledby="minl">{MINUTE_CHIPS.map(c=><button key={c.v} className={'nchip ' + (String(n.minutes)===String(c.v)?'on':'')} aria-pressed={String(n.minutes)===String(c.v)} onClick={()=>actions.numSet('minutes', String(c.v))}>{c.l}</button>)}
          <span className="nother"><input className="in tiny" type="number" min="0" value={custom ? n.minutes : ''} onChange={e=>actions.numSet('minutes', e.target.value)} placeholder="other" aria-label="Other, in minutes"/> min</span></div></div>
      <div className="nq"><span className="nl" id="rwl">How often is it redone or corrected?</span>
        <div className="nchips" role="group" aria-labelledby="rwl">{REWORK.map(c=><button key={c.id} className={'nchip ' + (n.rework===c.id?'on':'')} aria-pressed={n.rework===c.id} onClick={()=>actions.numRework(c.id)}>{c.l}</button>)}</div></div>
      <div className="nq"><label htmlFor="npeople">How many people do this work?</label><input className="in short" id="npeople" type="number" min="0" value={n.people||''} onChange={e=>actions.numSet('people', e.target.value)} placeholder="e.g. 4"/></div>
      <p className="nsum" aria-live="polite">{r ? numbersSentence(r) : 'Add how often and how long, and the hours appear here.'}</p>
      {r && <><DotField n={r.perMonth} caption="a month"/>
        {r.share!=null && <div className="share"><span className="sbar"><i style={{width:Math.min(100, Math.round(r.share*100))+'%'}}/></span><span className="cap">{Math.min(100, Math.round(r.share*100))}% of the team&rsquo;s time</span></div>}</>}
    </div>
  </>;
}

/* ---------- a question, as tangible tokens ---------- */
function hueOf(k, id){
  if(k==='cap'){ const f = familyOfCap(id); return f ? 'h-'+f : ''; }
  if(k==='band') return 'h-band-' + id;
  if(k==='stakes' || k==='rep') return 'h-lv-' + id;
  return '';
}
/* v7: in your own maps, the answers you have already given point at the answers that usually follow:
   capabilities that fit the kind of work, the bands that hold them, the autonomy the stakes call for.
   Guided walks stay unhinted, because there the read is the test. */
function adviceFor(S, q, a){
  if(S.mode!=='own') return null;
  const tag = {}, why = {};
  if(q.k==='cap' && a.shape){
    const r = suggestCaps(a);
    r.caps.forEach(c=>{ tag[c.id] = c.tier==='best' ? 'Fits this work' : 'Could work'; why[c.id] = c.why; });
    return {tag, why, notes:r.cautions, first:true};
  }
  if(q.k==='band' && a.shape){
    const r = suggestCaps(a), best = r.caps.filter(c=>c.tier==='best').map(c=>c.id);
    Object.keys(BAND_CAPS).forEach(b=>{ if(BAND_CAPS[b].some(c=>best.includes(c))) tag[b] = 'Holds a usual fit'; });
    return {tag, why, notes:r.cautions};
  }
  if(q.k==='auto' && a.stakes){ tag[suggestAutonomy(a)] = 'Usual for these stakes'; return {tag, why, notes:[]}; }
  return null;
}
function Question({S, q, a, st}){
  const advice = adviceFor(S, q, a);
  let opts = q.opts(a);
  if(advice && advice.first) opts = opts.slice().sort((x,y)=>(advice.tag[y.id]==='Fits this work'?2:(advice.tag[y.id]?1:0)) - (advice.tag[x.id]==='Fits this work'?2:(advice.tag[x.id]?1:0)));
  const sel = a[q.k];
  const [hover, setHover] = useState(null);
  const shown = hover || sel, shownO = opts.find(o=>o.id===shown);
  const many = opts.length>6, isAuto = q.k==='auto', isShape = q.k==='shape';
  const def = shownO ? ((advice && advice.why[shown]) || shownO.d) : 'Point at an option to see what it means.';
  return <div className="question" data-q={q.k}>
    <h3>{q.q}</h3>
    {q.k==='band' && <p className="qterm"><Term id="llm"/></p>}
    {advice && advice.notes.length>0 && <ul className="qnotes">{advice.notes.map((n,i)=><li key={i}><Icon name="near"/>{n}</li>)}</ul>}
    <div className={`opts ${many?'many':''} ${isAuto?'trio':''}`} role="radiogroup" aria-label={q.label} onMouseLeave={()=>setHover(null)}>
      {opts.map(o=>{ const t = advice && advice.tag[o.id];
        return <button key={o.id} className={`token ${hueOf(q.k, o.id)} ${sel===o.id?'on':''} ${t?'fits':''}`} role="radio" aria-checked={sel===o.id}
          aria-description={t || undefined}
          onClick={()=>actions.answer(q.k, o.id)} onMouseEnter={()=>setHover(o.id)} onFocus={()=>setHover(o.id)} onBlur={()=>setHover(null)}>
          {isAuto && <span className="oill"><Art kind="auto" id={o.id}/></span>}
          <b>{o.name}</b>{!many && o.d && <span>{o.d}</span>}
          {t && <em className="ttag"><Icon name="spark"/>{t}</em>}
          <span className="tstamp" aria-hidden="true"><Icon name="check"/></span>
        </button>; })}
    </div>
    {isShape ? <div className="qrow"><div className="qill">{shown && <Art kind="shape" id={shown}/>}</div><p className="def" aria-live="polite">{def}</p></div>
      : (many || advice ? <p className="def" aria-live="polite">{def}</p> : null)}
    {S.gui.open && <GuideCard S={S} q={q} a={a} st={st}/>}
  </div>;
}

/* ---------- lenses: every role sees every lens; yours opens first ---------- */
function Lenses({S, st, a, e}){
  const role = useGame(s=>s.J.profile.role);
  const mine = (ROLES.find(r=>r.id===role) || ROLES[1]).lens;
  const [open, setOpen] = useState(mine);
  const guided = S.mode==='guided', v = VERDICTS[e.verdict];
  const lenses = ROLES.map(r=>({id:r.lens, name:r.lensName, role:r.name}));
  let body;
  if(open==='floor'){
    const autoD = (AUTONOMY.find(x=>x.id===e.a.auto)||{}).d;
    body = <><p><b>What changes for {guided ? whoName(st.who) : 'the person doing it'}.</b> {autoD} {guided ? st.autoNote : ''}</p>
      {guided ? <ul className="lnotes">{st.discoveries.map((d,i)=><li key={i}><b>{d.title}.</b> {d.text} <span className="eff">{d.effect}</span></li>)}</ul>
              : <p className="muted">Ask the people who do this step what would make it worse, not just better. Their answer is your first guardrail.</p>}</>;
  } else if(open==='team'){
    const metric = guided ? st.metric : (e.nums ? `Hours a month on this step (about ${Math.round(e.nums.total)} today), and how often it is redone.` : 'Time per item, and how often it is redone. Measure both for two weeks first.');
    body = <dl className="moves"><div><dt>First move</dt><dd>{v.first}</dd></div><div><dt>Involve</dt><dd>{v.who}</dd></div><div><dt>Measure it by</dt><dd>{metric}</dd></div></dl>;
  } else if(open==='portfolio'){
    const hyp = guided ? st.valueHyp : (e.nums ? `Return part of about ${Math.round(e.nums.total)} hours a month on this step.` : 'Add the numbers on the left to size the prize.');
    body = <div className="pf"><MiniMatrix value={e.value} feas={e.feas}/>
      <div><p><b>{levelName(e.value)} value, {levelName(e.feas).toLowerCase()} feasibility.</b> {guided ? st.realityNote : ''}</p><p><b>Value hypothesis.</b> {hyp}</p></div></div>;
  } else {
    const max = e.tool ? Math.max(1, ...Object.values(e.tool.scores)) : 1;
    body = <><ul className="scorebars">{e.tool && DESTINATIONS.map(d=>{ const sc = Math.max(0, e.tool.scores[d.id]);
        return <li key={d.id} className={e.tool.winner===d.id?'win':''}><span>{d.name}</span><span className="sb"><i style={{width:Math.round(sc/max*100)+'%'}}/></span><b>{sc}</b></li>; })}</ul>
      <p><b>Guardrails.</b> {guardrailsFor(e).slice(0,4).map(guardrailName).join(', ')}.</p>
      {guided && <p><b>Data needed.</b> {st.dataNeeded}</p>}</>;
  }
  return <section className="lenses" aria-label="Lenses">
    <div className="ltabs" role="tablist">{lenses.map(l=><button key={l.id} role="tab" aria-selected={open===l.id} className={(open===l.id?'on ':'') + (l.id===mine?'mine':'')} onClick={()=>{ setOpen(l.id); actions.sound('tap'); }}>
      {l.name}{l.id===mine && <span className="yours">your lens</span>}</button>)}</div>
    <div className="lbody" role="tabpanel">{body}</div>
  </section>;
}
function MiniMatrix({value, feas}){
  return <div className="minimx" role="img" aria-label={`${levelName(value)} value, ${levelName(feas)} feasibility`}>
    {['high','mid','low'].map(vv=>['low','mid','high'].map(ff=><span key={vv+ff} className={(vv===value && ff===feas) ? 'here' : (vv==='high'&&ff==='high'?'win':'')}/>))}
    <em className="ax-v">Value</em><em className="ax-f">Feasibility</em></div>;
}

function Pointer({S, st}){
  const p = pointerFor(S, st); if(!p) return null;
  return <div className="pointer"><Icon name="arrow"/><p><b>Points to {p.winner}.</b> {p.why}{p.runner ? ` ${p.runner} is close behind.` : ''} {p.shift}</p></div>;
}
function NextButton({S}){
  const nxt = nextOpenIndex(S);
  return <button className="btn primary" onClick={actions.nextStep}>{nxt==null ? 'See the finished map' : `Next: ${S.steps[nxt].name}`}</button>;
}
function FieldReport({id, fresh}){
  const [open, setOpen] = useState(false);
  const r = reportById(id); if(!r) return null;
  return <section className={'fr ' + (open?'open':'')}>
    <button className="fr-head" onClick={()=>{ setOpen(!open); actions.sound('page'); }} aria-expanded={open}>
      <span className="fr-k"><Icon name="book"/>A landmark case{fresh && <span className="newtag">New</span>}</span>
      <b>{r.title}</b><span className="muted small">{r.org}, {r.year}</span></button>
    {open && <ReportCard id={id} inline/>}
  </section>;
}

function RevealGuided({S, st, a}){
  const R = scoreRead(S, st), v = VERDICTS[(stepEval(S, st)).verdict], e = stepEval(S, st);
  const bandOk = a.band===expertBand(st);
  const walkReports = useGame(s=>s.S.walk.reports);
  const played = useRef(null);
  useEffect(()=>{
    if(played.current===st.id) return; played.current = st.id;
    R.marks.forEach((m,i)=>setTimeout(()=>actions.sound(m==='match'?'match':(m==='near'?'near':'miss')), 520 + i*170));
    setTimeout(()=>actions.sound('stamp'), 520 + R.marks.length*170 + 200);
  }, [st.id]);
  return <div className="reveal-seq">
    <div className={`agree t-${R.tier}`}><span className="ag">{Math.round(R.score*10)/10}<small> of {R.of}</small></span><p>{line('rv:'+st.id, REACT.profile[R.tier])}</p></div>
    <div className={'fieldread ' + (bandOk?'ok':'differs')}>
      <h3>{bandOk ? 'The Guide agrees on the LLM call' : `The Guide reads it as: ${bandName(expertBand(st))}`}</h3>
      <p>{st.expertWhy}</p><p className="small">{st.autoNote}</p></div>
    <div className={`verdict vt-${v.tone}`} tabIndex={-1}><Emblem verdict={e.verdict} size={52}/><div><span className="vl">The verdict for this step</span><h3>{v.name}</h3><p>{v.advice}</p></div></div>
    <Lenses S={S} st={st} a={a} e={e}/>
    <div className="fnotes">{(S.dug[st.id] ? [0,1] : [0]).map(k=>{ const d = st.discoveries[k];
      return <article key={k} className={'fnote ' + (k?'fresh':'')}><span className="fni"><Icon name="notes"/></span><div><h4>{d.title}</h4><p>{d.text}</p><p className="eff">{d.effect}</p></div></article>; })}
      {!S.dug[st.id] && <button className="fnote sealed" onClick={actions.dig}><Icon name="interview"/><span><b>Hear more from the team</b><span>One more note from {teamOf(st.who)}. +5 XP</span></span></button>}</div>
    {a.report && <FieldReport id={a.report} fresh={walkReports.includes(a.report)}/>}
    <Pointer S={S} st={st}/>
    <div className="actions"><NextButton S={S}/></div>
  </div>;
}
function ResultOwn({S, st, a}){
  const e = stepEval(S, st), v = VERDICTS[e.verdict], ch = challengesOf(e.a, e.nums);
  const codex = useGame(s=>s.J.profile.codex);
  const r = reportFor({cap:e.a.cap, verdict:e.verdict, shape:e.a.shape}, codex);
  return <>
    {ch.length>0 && <div className="challenges">{ch.map((c,i)=><div key={i} className="challenge"><span className="ci"><Icon name="near"/></span><p>{c.text}</p><button className="linkbtn" onClick={()=>actions.reopen(c.q)}>Change my answer</button></div>)}</div>}
    <div className={`verdict vt-${v.tone}`} tabIndex={-1}><Emblem verdict={e.verdict} size={52}/><div><span className="vl">The verdict for this step</span><h3>{v.name}</h3><p>{v.advice}</p>
      <p className="small muted">{levelName(e.value)} value, {levelName(e.feas).toLowerCase()} feasibility{e.nums?`, from about ${Math.round(e.nums.total)} hours a month`:''}.</p></div></div>
    <Lenses S={S} st={st} a={a} e={e}/>
    {r && <section className="fr"><button className="fr-head" onClick={()=>actions.seeReport(r.id)}>
      <span className="fr-k"><Icon name="book"/>A landmark case like this{!codex[r.id] && <span className="newtag">New</span>}</span><b>{r.title}</b><span className="muted small">{r.org}, {r.year}</span></button></section>}
    <Pointer S={S} st={st}/>
    <div className="actions"><NextButton S={S}/></div>
  </>;
}

function ReadPanel({S, st, a}){
  const guided = S.mode==='guided', revealed = guided && a.revealed, done = answered(a);
  let qi = S.q; if(revealed || (done && qi<0)) qi = -1;
  const asked = askedQuestions(a), count = asked.filter(q=>a[q.k]).length;
  return <>
    <div className="rhead"><h2 id="readh">Your read</h2>{!revealed && !done && <span className="muted small">Each question folds into a row once answered. Tap a row to change it.</span>}</div>
    <div className={'arows ' + (revealed?'revealed':'')}>{QUESTIONS.map((q,i)=>{
      const val = a[q.k];
      if(i===qi && !revealed) return <Question key={q.k} S={S} q={q} a={a} st={st}/>;
      if(!val) return null;
      const name = optName(q.opts(a), val) || capName(val);
      const mk = revealed ? markOf(S, q, st, val) : null;
      const fieldTxt = mk && mk!=='match' ? (optName(q.opts(Object.assign({}, a, {band:expertBand(st)})), q.field(st)) || capName(q.field(st))) : '';
      const carried = a._carried && a._carried[q.k];
      const si = SCORED.indexOf(q);
      const inner = <><span className="rk">{q.label}</span><span className="rv">
        {mk && <span className={'rm m-'+mk} aria-label={mk==='match'?'Matches the Guide':(mk==='near'?'Close to the Guide':'Differs from the Guide')}><Icon name={mk==='match'?'check':(mk==='near'?'near':'x')}/></span>}
        <span>{name}{carried && <span className="muted"> (from the last step)</span>}</span>
        {fieldTxt && <span className="rf">Guide: {fieldTxt}</span>}</span></>;
      return revealed ? <div key={q.k} className={'arow ' + (mk?'m-'+mk:'')} style={{'--si':si<0?0:si}}>{inner}</div>
        : <button key={q.k} className="arow" onClick={()=>actions.reopen(q.k)} aria-label={`Change: ${q.label}, ${name}`}>{inner}<span className="rc"><Icon name="chev"/></span></button>;
    })}</div>
    {!done && <p className="muted small qcount"><span className="qbar"><i style={{width:Math.round(count/asked.length*100)+'%'}}/></span>{count} of {asked.length} answered</p>}
    {done && guided && !revealed && <div className="actions"><button className="btn brass big" data-focus="reveal" onClick={actions.reveal}><Icon name="spark"/>Compare with the Guide</button></div>}
    {done && (guided ? (revealed && <RevealGuided S={S} st={st} a={a}/>) : <ResultOwn S={S} st={st} a={a}/>)}
  </>;
}

export default function Step(){
  const S = useGame(s=>s.S);
  const st = S.steps[S.cur]; if(!st) return null;
  const a = S.ans[st.id] || {};
  const q = S.q>=0 ? QUESTIONS[S.q] : null;
  const glow = S.gui.open && S.gui.tier>=2 && q && S.mode==='guided' ? guideInfo(S, q, a, st).target : '';
  return <>
    <div className="stepbar"><button className="linkbtn strong" onClick={actions.toMap}><Icon name="back"/>The map</button><Ministrip S={S}/></div>
    <div className="steplayout">
      <section className="situation">{S.mode==='guided' ? <SituationGuided S={S} st={st} i={S.cur} glow={glow}/> : <SituationOwn S={S} st={st} i={S.cur} a={a}/>}</section>
      <section className="read" aria-labelledby="readh"><ReadPanel S={S} st={st} a={a}/></section>
    </div>
  </>;
}
