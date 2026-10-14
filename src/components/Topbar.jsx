import {useGame, actions} from '../game/store.js';
import {readSteps, stepDone} from '../game/flow.js';
import {getExpedition} from '../content/expeditions.js';
import {rankOf, roleOf} from '../game/rpg.js';
import {inProgress, unsaved, workItems} from '../game/journal.js';
import {Icon} from './ui.jsx';

export const LOGO = <svg className="brandmark" width="26" height="26" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M18.5 9.5 L12.6 12.6 L9.5 18.5 L15.4 15.4 Z" fill="var(--brass-glow)"/></svg>;

export default function Topbar(){
  const S = useGame(s=>s.S), J = useGame(s=>s.J), P = J.profile, sound = useGame(s=>s.settings.sound);
  const open = inProgress(J).length, u = P.unseen || {marks:[], reports:[]};
  const fresh = u.marks.length + (u.rank ? 1 : 0);
  const any = workItems(J).length>0, due = any && unsaved(J);
  const name = S.mode==='own' ? (S.own && S.own.process) : (S.procId ? getExpedition(S.procId).name : 'Meridian Reserve Bank');
  const showProg = S.steps.length && ['map','step','quick','finished','export'].includes(S.view);
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
      {S.view==='step' && <button className="tbtn" data-tb="hint" onClick={actions.guideToggle} aria-pressed={S.gui.open}><Icon name="compass"/><span className="hide-s">Hint</span></button>}
      <button className="tbtn" data-tb="maps" onClick={()=>actions.view('maps')}><Icon name="map"/><span className="hide-s">My maps</span>{open>0 && <> <span className="tcount">{open}<span className="sr"> in progress</span></span></>}</button>
      {any && <button className="tbtn" data-tb="save" onClick={actions.saveOpen}><Icon name="send"/><span className="hide-s">Save progress</span><span className="sr"> to take to another browser{due ? ', not saved since your latest work' : ''}</span>{due && <span className="tdot" aria-hidden="true"/>}</button>}
      <button className="tbtn" data-tb="library" onClick={()=>actions.view('library')}><Icon name="book"/><span className="hide-s">Library</span><span className="sr"> of landmark cases</span>{u.reports.length>0 && <> <span className="tcount new">{u.reports.length}<span className="sr"> new</span></span></>}</button>
      <button className="rankpill" data-tb="character" onClick={()=>actions.view('character')}>
        <span className="rp-badge" aria-hidden="true"><Icon name={role ? 'user' : 'compass'}/>{fresh>0 && <span className="tcount new">{fresh}</span>}</span>
        <span className="rp-text"><b>{r.name}</b><span className="rp-bar" aria-hidden="true"><i style={{'--p':Math.round(r.pct*100)+'%'}}/></span></span>
        <span className="sr">, your character: {P.xp} experience{fresh ? `, ${fresh} new` : ''}</span>
      </button>
      <button className="tbtn icononly" onClick={actions.soundToggle} aria-pressed={sound} aria-label={sound ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'} title={sound ? 'Sound on' : 'Sound off'}><Icon name={sound?'sound':'mute'}/></button>
    </div>
  </header>;
}
