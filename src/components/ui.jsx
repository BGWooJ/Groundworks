/* Small shared pieces: icons, illustrations, emphasis, chips, emblems, meters. */
import {icon} from '../art/icons.js';
import {ILLUS} from '../art/illustrations.js';
import {bandName, VERDICTS} from '../engine/engine.js';

export function Icon({name, className}){
  return <span className={'icw ' + (className||'')} aria-hidden="true" dangerouslySetInnerHTML={{__html:icon(name)}}/>;
}
/* Illustrations are trusted, static SVG built in illustrations.js. */
export function Art({kind, id, className}){
  const html = (ILLUS[kind] && ILLUS[kind][id]) || '';
  if(!html) return null;
  return <span className={'art ' + (className||'')} aria-hidden="true" dangerouslySetInnerHTML={{__html:html}}/>;
}

/* Bold the numbers in a sentence, so the measured facts stand out. */
export function Emph({text}){
  const t = String(text||''), re = /\$?\d+(?:[.,]\d+)*(?:%| percent)?/g, out = [];
  let last = 0, m, k = 0;
  while((m = re.exec(t))){ out.push(t.slice(last, m.index)); out.push(<b className="num" key={k++}>{m[0]}</b>); last = m.index + m[0].length; }
  out.push(t.slice(last));
  return <>{out}</>;
}

export function Chip({band, small}){
  if(!band) return null;
  return <span className={`chip b-${band} ${small?'sm':''}`}>{bandName(band)}</span>;
}

export function HeatBar({r}){
  return <span className="heatbar" role="img" aria-label={`Hotspot rating ${r} of 5`}>{[1,2,3,4,5].map(i=><i key={i} className={i<=r?'on':''}/>)}</span>;
}

/* Each verdict has its own shape, so it reads without colour. */
const EMBLEM = {
  pilot:       <><path d="M13 33V7" className="e-line"/><path d="M13 8h16l-4.5 6 4.5 6H13z" className="e-fill"/></>,
  prepare:     <><path d="M20 5l13 7.5v15L20 35 7 27.5v-15z" className="e-fill"/><circle cx="20" cy="20" r="4" className="e-dot"/></>,
  assist:      <><path d="M20 5l12 4.5v9.5c0 7.5-5.2 13.2-12 16-6.8-2.8-12-8.5-12-16V9.5z" className="e-fill"/><path d="M14.5 20l4 4 7-8" className="e-mark"/></>,
  engineering: <><path d="M17 5h6l1 4.2 3.6 1.5 3.7-2.3 4.2 4.2-2.3 3.7 1.5 3.6 4.3 1v6l-4.3 1-1.5 3.6 2.3 3.7-4.2 4.2-3.7-2.3-3.6 1.5-1 4.4h-6l-1-4.4-3.6-1.5-3.7 2.3-4.2-4.2 2.3-3.7L6.1 25 1.8 24v-6l4.3-1 1.5-3.6-2.3-3.7 4.2-4.2 3.7 2.3L17 9.2z" transform="translate(1.5 0) scale(.92)" className="e-fill"/><circle cx="20" cy="20" r="5" className="e-hole"/></>,
  fix:         <><path d="M20 4l16 16-16 16L4 20z" className="e-fill"/><path d="M14 20h12M20 14v12" className="e-mark"/></>,
  capture:     <><rect x="9" y="6" width="22" height="28" rx="3" className="e-fill"/><path d="M14 14h12M14 20h12M14 26h7" className="e-mark"/></>,
  small:       <><circle cx="20" cy="20" r="15" className="e-ring"/><circle cx="20" cy="20" r="6" className="e-fill"/></>,
  park:        <><rect x="6" y="6" width="28" height="28" rx="7" className="e-fill"/><path d="M16 13v14M24 13v14" className="e-mark"/></>,
};
export function Emblem({verdict, size}){
  const v = VERDICTS[verdict]; if(!v) return null;
  return <svg className={`emblem tone-${v.tone}`} width={size||40} height={size||40} viewBox="0 0 40 40" role="img" aria-label={v.name}>{EMBLEM[verdict]}</svg>;
}

export function Meter({value, max, label, tone}){
  const p = Math.max(0, Math.min(100, Math.round((value/(max||1))*100)));
  return <span className={`meter ${tone?'t-'+tone:''}`} role="meter" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}><i style={{width:p+'%'}}/></span>;
}

export function Stars({n, of}){
  return <span className="stars" role="img" aria-label={`${n} of ${of||3} stars`}>{Array.from({length:of||3}).map((_,i)=><Icon key={i} name="star" className={i<n?'on':''}/>)}</span>;
}
