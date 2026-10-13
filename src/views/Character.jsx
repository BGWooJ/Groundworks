/* The character sheet: lens, rank, standing, skills, mastery, insignia, and the private progress report. */
import {useEffect, useRef} from 'react';
import {useGame, actions, ALL_MARKS, download} from '../game/store.js';
import {ROLES, roleOf, rankOf, RANKS, STATS, STAT_MAX, SKILLS, skillLevel} from '../game/rpg.js';
import {CAP_FAMILIES} from '../content/meridian.js';
import {FIELD_REPORTS, reportById} from '../content/fieldReports.js';
import {csvCell} from '../game/flow.js';
import {Icon, Art, Meter, Stars} from '../components/ui.jsx';

function progressReport(J){
  const P = J.profile, r = rankOf(P.xp), role = roleOf(P.role);
  const pct = rec=> rec && rec.n ? Math.round(rec.pts/rec.n*100) : null;
  return {source:'Groundwork', kind:'progress', version:5, exported:new Date().toISOString(),
    lens: role ? role.name : null, rank:r.name, xp:P.xp,
    standing:Object.fromEntries(STATS.map(s=>[s.name, P.stats[s.id]])),
    skills:SKILLS.map(s=>({skill:s.name, matchRate:pct(P.skills[s.k]), reads:(P.skills[s.k]||{}).n||0})),
    capabilityFamilies:CAP_FAMILIES.map(f=>({family:f.name, matchRate:pct(P.families[f.id]), reads:(P.families[f.id]||{}).n||0})),
    walksCompleted:P.walks, complications:{met:P.complications, strongAnswers:P.strong},
    marks:ALL_MARKS.filter(m=>J.marks[m.id]).map(m=>m.name),
    fieldReports:Object.keys(P.codex).map(id=>(reportById(id)||{}).title).filter(Boolean),
    ownMaps:Object.keys(J.maps).length,
    recentWalks:J.walks.map(w=>({process:w.proc, summary:w.summary}))};
}
function progressCSV(p){
  const rows = [['measure','value'], ['lens', p.lens||''], ['rank', p.rank], ['xp', p.xp], ['walks completed', p.walksCompleted],
    ['complications met', p.complications.met], ['strong answers', p.complications.strongAnswers], ['own maps', p.ownMaps],
    ['field reports collected', p.fieldReports.length], ['marks earned', p.marks.length]];
  Object.entries(p.standing).forEach(([k,v])=>rows.push(['standing: '+k, v]));
  p.skills.forEach(s=>rows.push(['match rate: '+s.skill, s.matchRate==null?'':s.matchRate+'%']));
  p.capabilityFamilies.forEach(s=>rows.push(['match rate: '+s.family, s.matchRate==null?'':s.matchRate+'%']));
  return rows.map(r=>r.map(csvCell).join(',')).join('\n');
}

export default function Character(){
  const J = useGame(s=>s.J), P = J.profile;
  // what was new when the sheet opened stays highlighted while it is open, then counts as seen
  const fresh = useRef(null);
  if(!fresh.current) fresh.current = {marks:(P.unseen && P.unseen.marks) || [], rank:P.unseen && P.unseen.rank};
  useEffect(()=>{ actions.markSeen('marks'); }, []);
  const r = rankOf(P.xp), role = roleOf(P.role);
  const collected = Object.keys(P.codex).length;
  return <>
    <button className="linkbtn strong" onClick={actions.back}><Icon name="back"/>Back</button>
    <div className="sheet">
      <section className="sh-id">
        <div className="sh-portrait"><Art kind="role" id={P.role || 'practitioner'}/></div>
        <div>
          <p className="kicker">{role ? `${role.name}, ${role.level.toLowerCase()}` : 'No lens chosen yet'}</p>
          <h1>{r.name}{fresh.current.rank && <span className="newtag">New rank</span>}</h1>
          <div className="sh-xp"><Meter value={P.xp - r.floor} max={(r.next||P.xp+1) - r.floor} label="Progress to the next rank" tone="brass"/>
            <span className="muted small">{P.xp} XP{r.next ? `. ${r.next - P.xp} more to ${r.nextName}.` : '. The highest rank.'}</span></div>
          {role && <p className="sh-perk"><Icon name="spark"/>{role.perk}</p>}
          <button className="btn secondary small" onClick={()=>actions.askRole(null)}><Icon name="user"/>{role ? 'Change lens' : 'Choose a lens'}</button>
        </div>
        <ol className="ranks" aria-label="Ranks">{RANKS.map((x,i)=><li key={x.name} className={i<=r.index?'on':''}><span>{x.name}</span><span className="muted small">{x.xp} XP</span></li>)}</ol>
      </section>

      <section className="sh-box"><h2 className="h3">Standing</h2>
        <p className="muted small">Complications move these. Ten is where everyone starts.</p>
        <ul className="statlist">{STATS.map(s=><li key={s.id}><span className="sl-n"><Icon name={s.icon}/>{s.name}</span><Meter value={P.stats[s.id]} max={STAT_MAX} label={s.name} tone={P.stats[s.id]>=10?'good':'warn'}/><b>{P.stats[s.id]}</b><span className="muted small">{s.d}</span></li>)}</ul>
        <p className="muted small">{P.complications} complications met, {P.strong} answered strongly.</p></section>

      <section className="sh-box"><h2 className="h3">Reading skills</h2>
        <p className="muted small">How often your reads of Meridian steps match the field, question by question.</p>
        <ul className="skilllist">{SKILLS.map(s=>{ const L = skillLevel(P.skills[s.k]);
          return <li key={s.k}><span>{s.name}</span><Meter value={L.pct==null?0:Math.round(L.pct*100)} max={100} label={s.name}/><b>{L.pct==null ? '–' : Math.round(L.pct*100)+'%'}</b><Stars n={L.stars}/></li>; })}</ul></section>

      <section className="sh-box"><h2 className="h3">Capability mastery</h2>
        <p className="muted small">Matching the right capability, by family. Weak families are where to practise.</p>
        <ul className="famlist">{CAP_FAMILIES.map(f=>{ const L = skillLevel(P.families[f.id]);
          return <li key={f.id} className={'h-'+f.id}><span className="fam-n">{f.name}</span><Stars n={L.stars}/><span className="muted small">{L.pct==null ? 'Not yet read' : `${Math.round(L.pct*100)}% over ${P.families[f.id].n} ${P.families[f.id].n===1?'step':'steps'}`}</span></li>; })}</ul></section>

      <section className="sh-box"><h2 className="h3">Insignia</h2>
        <ul className="insignia">{ALL_MARKS.map(m=>{ const on = !!J.marks[m.id];
          const isNew = fresh.current.marks.includes(m.id);
          return <li key={m.id} className={(on?'on':'') + (isNew?' fresh':'')} title={m.d}><span className="ins"><Icon name={on?m.icon:'lock'}/></span><b>{m.name}{isNew && <span className="newtag">New</span>}</b><span className="muted small">{m.d}</span></li>; })}</ul></section>

      <section className="sh-box"><h2 className="h3">Field Library</h2>
        <p>{collected} of {FIELD_REPORTS.length} real cases collected.</p><Meter value={collected} max={FIELD_REPORTS.length} label="Field Reports collected"/>
        <button className="btn secondary small mt" onClick={()=>actions.view('library')}><Icon name="book"/>Open the library</button></section>

      <section className="sh-box wide"><h2 className="h3">Your progress report</h2>
        <p>A private summary of your progress: lens, rank, standing, match rates by skill and capability family, marks and cases collected. Nothing is sent anywhere. Download it to share with your manager or to compare across a team.</p>
        <div className="row"><button className="btn primary small" onClick={()=>download('groundwork-progress.json', JSON.stringify(progressReport(J), null, 2), 'application/json')}><Icon name="download"/>Download progress (.json)</button>
          <button className="btn secondary small" onClick={()=>download('groundwork-progress.csv', progressCSV(progressReport(J)), 'text/csv')}><Icon name="download"/>Download progress (.csv)</button></div></section>
    </div>
  </>;
}
