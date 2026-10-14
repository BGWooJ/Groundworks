import {useGame, actions, ALL_MARKS} from '../game/store.js';
import {workItems, inProgress, ago, progressLabel} from '../game/journal.js';
import {openItem, openLabel} from './Maps.jsx';
import {rankOf, roleOf, ROLES} from '../game/rpg.js';
import {FIELD_REPORTS} from '../content/fieldReports.js';
import {FUNCTIONS} from '../content/meridian.js';
import {Icon, Art, Meter} from '../components/ui.jsx';
import {KeepProgress} from '../components/SaveDialogs.jsx';
import {isNewPlayer} from '../game/store.js';

export default function Home(){
  const J = useGame(s=>s.J), confirmClear = useGame(s=>s.S.confirmClear);
  const P = J.profile, r = rankOf(P.xp), role = roleOf(P.role);
  const work = workItems(J), resume = inProgress(J).slice(0,2);
  const any = Object.keys(J.marks).length || work.length || P.xp;
  const processes = FUNCTIONS.reduce((n,f)=>n+f.processes.length, 0);
  const collected = Object.keys(P.codex).length;
  return <>
    <div className="hero">
      <svg className="hero-map" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g className="contours" fill="none" stroke="currentColor">
          <path d="M-40,120 C140,70 300,170 520,120 S900,40 1240,120"/><path d="M-40,180 C160,120 330,230 560,180 S930,110 1240,190"/>
          <path d="M-40,250 C180,200 360,300 600,250 S960,180 1240,260"/><path d="M-40,330 C200,290 400,380 640,330 S990,260 1240,340"/>
          <path d="M-40,410 C220,370 430,450 680,410 S1010,350 1240,420"/><path d="M-40,480 C240,450 460,520 700,480 S1030,430 1240,500"/>
          <ellipse cx="930" cy="190" rx="120" ry="58"/><ellipse cx="930" cy="190" rx="74" ry="34"/><ellipse cx="930" cy="190" rx="32" ry="14"/>
        </g>
        <path className="trailpath" d="M640,470 C700,452 730,410 770,380 S830,330 860,290 S900,214 930,190" pathLength="1"/>
        <g className="wpts"><circle cx="640" cy="470" r="7"/><circle cx="770" cy="380" r="7"/><circle cx="860" cy="290" r="7"/><circle cx="930" cy="190" r="10" className="end"/></g>
      </svg>
      <div className="hero-copy">
        <p className="kicker">A practice game about where AI helps at work</p>
        <h1>Groundwork</h1>
        <p className="hero-line">Break a piece of work into its steps and decide, for each one, whether AI can do it, help a person do it, or whether something simpler is better.</p>
        {resume.length>0 && <div className="resume" aria-labelledby="resh">
          <p className="resume-k" id="resh"><Icon name="flag"/>Pick up where you left off</p>
          {resume.map(x=><button key={x.key} className="resume-item" onClick={()=>openItem(x)}>
            <span className="ri-main"><b>{x.title}</b><span>{x.where}. {progressLabel(x)}{x.updated ? `, ${ago(x.updated)}` : ''}</span></span>
            <span className="ri-go">{openLabel(x)}<Icon name="chev"/></span>
          </button>)}
        </div>}
        <div className="startcards">
          <button className={'startcard' + (resume.length ? '' : ' lead')} onClick={actions.startGuided}>
            <span className="sc-i"><Icon name="map"/></span>
            <span className="sc-b"><b>Explore Meridian</b><span>A practice bank with {FUNCTIONS.length} divisions. Pick a process, make the calls, and compare with the Guide.</span></span>
            <span className="sc-t">About 15 min</span></button>
          <button className="startcard" onClick={actions.startOwn}>
            <span className="sc-i"><Icon name="plot"/></span>
            <span className="sc-b"><b>{Object.keys(J.maps).length ? 'Map another process of your own' : 'Map your own work'}</b><span>Describe a process from your own job, step by step, and leave with a plan.</span></span>
            <span className="sc-t">About 20 min</span></button>
        </div>
        {isNewPlayer(J) && <p className="welcomeback"><Icon name="flag"/><span>Played before, on another computer or browser?</span>
          <button className="linkbtn onspruce" onClick={()=>actions.restoreOpen()}>Open your saved progress</button></p>}
        <p className="hero-note"><button className="linkbtn onspruce" onClick={actions.introOpen}><Icon name="compass"/>How it works</button>{' '}
          {processes} processes across {FUNCTIONS.length} divisions of a made-up bank, each with the Guide’s view to compare against, and {FIELD_REPORTS.length} landmark cases from real organisations. Your progress saves in this browser, and a save link takes it anywhere.</p>
      </div>
    </div>

    {!role && <section className="lenscall" aria-labelledby="lch">
      <div><h2 id="lch" className="h3">Choose your lens</h2>
        <p>Pick the one closest to your job. It changes what you see first, not how hard it is. Your lens decides what opens first on every step and which complications you are most likely to meet, and you can change it any time.</p></div>
      <div className="lensrow">{ROLES.map(x=><button key={x.id} className="lensmini" onClick={()=>actions.chooseRole(x.id)}><Art kind="role" id={x.id}/><b>{x.name}</b><span>{x.level}</span></button>)}</div>
    </section>}

    <section className="journal" aria-labelledby="jh">
      <div className="jhead"><h2 id="jh">Logbook</h2>
        {confirmClear
          ? <div className="confirm" role="alert"><p>This removes your marks, walks, saved maps and progress from this browser. It cannot be undone.</p>
              <div className="row"><button className="btn danger small" onClick={actions.clearYes}><Icon name="trash"/>Clear everything</button><button className="btn ghost small" onClick={actions.clearNo}>Keep them</button></div></div>
          : (any ? <button className="linkbtn" onClick={actions.clearAsk}><Icon name="trash"/>Clear my results</button> : null)}
      </div>
      <div className="jgrid">
        <div>
          <button className="careercard" onClick={()=>actions.view('character')}>
            <span className="cc-art"><Art kind="role" id={P.role || 'practitioner'}/></span>
            <span className="cc-body"><span className="muted small">{role ? role.name + ', ' + role.level.toLowerCase() : 'No lens chosen yet'}</span>
              <b>{r.name}</b><Meter value={P.xp - r.floor} max={(r.next||P.xp+1) - r.floor} label="Progress to the next rank"/>
              <span className="muted small">{P.xp} XP{r.next ? `, ${r.next - P.xp} to ${r.nextName}` : ', the highest rank'}. {collected} of {FIELD_REPORTS.length} landmark cases.</span></span>
          </button>
          <h3 className="mt">Your maps and walks</h3>
          {work.length ? <ul className="maplist">{work.slice(0,5).map(x=><li key={x.key}><div><b>{x.title}</b><span>{x.where}. {progressLabel(x)}{x.updated ? `, ${ago(x.updated)}` : ''}</span></div>
              {(x.kind!=='finished-walk' || x.reopenable) && <button className="btn secondary small" onClick={()=>openItem(x)}>{openLabel(x)}</button>}</li>)}</ul>
            : <p className="muted">None yet. Everything you start is saved here as you go.</p>}
          <button className="linkbtn" onClick={()=>actions.view('maps')}><Icon name="map"/>All my maps{work.length>5 ? ` (${work.length})` : ''}</button>
          <KeepProgress card/>
        </div>
        <div><h3>Marks</h3>
          <ul className="marks">{ALL_MARKS.map(m=>{
            const on = !!J.marks[m.id];
            const prog = !on && m.id==='flagships' && J.flagships.length ? ` (${J.flagships.length} of 4)` : (!on && m.id==='library5' && collected ? ` (${collected} of 5)` : '');
            return <li key={m.id} className={'mk ' + (on?'on':'')}><span className="mki"><Icon name={on?m.icon:'lock'}/></span><span><b>{m.name}</b><span>{m.d}{prog}</span></span></li>;
          })}</ul>
        </div>
      </div>
    </section>
  </>;
}
