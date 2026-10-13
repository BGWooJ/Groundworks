/* v8: the first two minutes. Three short cards say what Meridian is, what the player will do and what
   they will get, before anything asks them to choose. Shown once to new players; "How it works" on the
   home screen opens it again. */
import {useState} from 'react';
import {m, AnimatePresence, useReducedMotion} from 'motion/react';
import {actions, useGame} from '../game/store.js';
import {FUNCTIONS, MAP_GROUPS} from '../content/meridian.js';
import {PHASES} from '../game/flow.js';
import {Icon, Term} from '../components/ui.jsx';

const CALLS = [
  {icon:'read',   t:'AI that reads and writes can do it'},
  {icon:'assist', t:'AI can help a person, who stays in charge'},
  {icon:'spark',  t:'A different kind of AI fits, such as forecasting'},
  {icon:'none',   t:'Something simpler is better: a rule, a link between systems, or fixing the process'},
];

function World(){
  return <div className="iworld" aria-label="Meridian’s five regions and thirteen divisions">
    {MAP_GROUPS.map(g=><div key={g.id} className="iregion"><b>{g.label}</b>
      <ul>{FUNCTIONS.filter(f=>f.group===g.id).map(f=><li key={f.id}><Icon name={f.icon}/>{f.name}</li>)}</ul></div>)}
  </div>;
}

const CARDS = [
  {k:'world', h:'Meet Meridian, a practice bank',
   body:()=><>
     <p>Meridian Reserve Bank is made up. It has 13 divisions, from the economists who brief the rate-setting committee to the team that keeps the buildings secure, and about 2,400 staff.</p>
     <p>The work is realistic, but nothing here is real data, so explore freely.</p>
     <World/></>},
  {k:'calls', h:'What you will do',
   body:()=><>
     <p>Pick one piece of work, such as answering staff questions about benefits or checking supplier invoices. Look at it one step at a time, and for each step make the call:</p>
     <ul className="icalls">{CALLS.map(c=><li key={c.icon}><span className="ic"><Icon name={c.icon}/></span>{c.t}</li>)}</ul>
     <p className="small">The AI in most of these calls is the kind behind chat tools such as Copilot. <Term id="llm"/></p></>},
  {k:'plan', h:'Compare, then plan',
   body:()=><>
     <p>After each step, you compare your calls with the Guide’s: an experienced surveyor who has walked every process with the people who do the work. Where you differ, notes from the team explain why.</p>
     <p>You finish with a plan for the process: what to fix first, what to try, and what to leave alone.</p>
     <ol className="iphases">{PHASES.map((p,i)=><li key={p.id}><span>{i+1}</span>{p.name}</li>)}</ol>
     <p className="ifacts"><Icon name="flag"/>About 15 minutes for one process. Everything saves in this browser as you go.</p></>},
];

export default function Intro(){
  const [i, setI] = useState(0), reduce = useReducedMotion(), [dir, setDir] = useState(1);
  const role = useGame(s=>s.J.profile.role);
  const go = n=>{ setDir(n>i ? 1 : -1); setI(n); actions.sound('page'); };
  const c = CARDS[i], last = i===CARDS.length-1;
  return <div className="intro narrow">
    <div className="ihead">
      <ol className="idots" aria-label={`Card ${i+1} of ${CARDS.length}`}>{CARDS.map((x,n)=><li key={x.k} className={n===i ? 'on' : (n<i ? 'done' : '')}/>)}</ol>
      {!last && <button className="linkbtn" onClick={()=>actions.introDone(null)}>Skip the introduction</button>}
    </div>
    <AnimatePresence mode="wait" initial={false} custom={dir}>
      <m.section key={c.k} className={'icard ic-' + c.k} aria-labelledby={'ih-'+c.k}
        initial={{opacity:0, x: reduce ? 0 : 24*dir}} animate={{opacity:1, x:0}} exit={{opacity:0, x: reduce ? 0 : -24*dir}}
        transition={{duration: reduce ? 0 : .22, ease:'easeOut'}}>
        <p className="kicker">{i+1} of {CARDS.length}</p>
        <h1 id={'ih-'+c.k}>{c.h}</h1>
        {c.body()}
      </m.section>
    </AnimatePresence>
    <div className="actions iactions">
      {i>0 && <button className="btn ghost" onClick={()=>go(i-1)}><Icon name="back"/>Back</button>}
      {!last && <button className="btn primary" onClick={()=>go(i+1)}>Next<Icon name="chev"/></button>}
      {last && <>
        <button className="btn brass big" onClick={()=>actions.introDone('guided')}><Icon name="map"/>Explore Meridian</button>
        <button className="btn outline big" onClick={()=>actions.introDone('own')}><Icon name="plot"/>Map your own work</button>
      </>}
    </div>
    {last && <div className="muted small inote"><span>{role ? 'Your lens is already set; you can change it from your character.' : 'Next, you choose a lens: the one closest to your job. It changes what you see first, not how hard it is.'}</span>
      <button className="linkbtn" onClick={()=>actions.introDone(null)}>Not now, take me to the start</button></div>}
  </div>;
}
