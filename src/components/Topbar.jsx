import {useGame, actions} from '../game/store.js';
import {readSteps, stepDone} from '../game/flow.js';
import {getExpedition} from '../content/expeditions.js';
import {rankOf, roleOf} from '../game/rpg.js';
import {inProgress} from '../game/journal.js';
import {Icon} from './ui.jsx';

export const LOGO = <svg className="brandmark" width="26" height="26" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M18.5 9.5 L12.6 12.6 L9.5 18.5 L15.4 15.4 Z" fill="var(--brass-glow)"/></svg>;

export default function Topbar(){
  const S = useGame(s=>s.S), J = useGame(s=>s.J), P = J.profile, sound = useGame(s=>s.settings.sound);
  const open = inProgress(J).length, u = P.unseen || {marks:[], reports:[]};
  const fresh = u.marks.length + (u.rank ? 1 : 0);
  const name = S.mode==='own' ? (S.own && S.own.process) : (S.procId ? getExpedition(S.procId).name : 'Meridian Reserve Bank');
  const showProg = S.steps.length && ['map','step','finished','export'].includes(S.view);
  const n = showProg ? readSteps(S).length : 0;
  const r = rankOf(P.xp), role = roleOf(P.role);
  return <header className="topbar">
    <div className="tb-l">
      <button className="brand" onClick={actions.home} aria-label="Groundwork, back to the start">{LOGO}<span>Groundwork</span></button>
      {name && <><span className="tb-sep"/><span className="tb-name">{name}</span></>}
    </div>
    <div className="tb-r">
      {showProg ? <span className="prog"><span className="segs">{S.steps.map((st,i)=><i key={st.id} className={stepDone(S, st)?'done':(S.view==='step' && i===S.cur?'cur':'')}/>)}</span>
        {n===S.steps.length ? `All ${n} steps read` : `${n} of ${S.steps.length} steps read`}</span> : null}
      {S.view==='step' && <button className="tbtn" onClick={actions.guideToggle} aria-pressed={S.gui.open}><Icon name="compass"/>Field guide</button>}
      <button className="tbtn" onClick={()=>actions.view('maps')} aria-label={`My maps${open ? `, ${open} in progress` : ''}`}><Icon name="map"/><span className="hide-s">My maps</span>{open>0 && <span className="tcount">{open}</span>}</button>
      <button className="tbtn" onClick={()=>actions.view('library')} aria-label={`Field Library${u.reports.length ? `, ${u.reports.length} new` : ''}`}><Icon name="book"/><span className="hide-s">Library</span>{u.reports.length>0 && <span className="tcount new">{u.reports.length}</span>}</button>
      <button className="rankpill" onClick={()=>actions.view('character')} aria-label={`Your character: ${r.name}, ${P.xp} experience${fresh ? `, ${fresh} new` : ''}`}>
        <span className="rp-badge"><Icon name={role ? 'user' : 'compass'}/>{fresh>0 && <span className="tcount new" aria-hidden="true">{fresh}</span>}</span>
        <span className="rp-text"><b>{r.name}</b><span className="rp-bar"><i style={{width:Math.round(r.pct*100)+'%'}}/></span></span>
      </button>
      <button className="tbtn icononly" onClick={actions.soundToggle} aria-pressed={sound} aria-label={sound ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'} title={sound ? 'Sound on' : 'Sound off'}><Icon name={sound?'sound':'mute'}/></button>
    </div>
  </header>;
}
