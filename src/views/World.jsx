/* =====================================================================
   THE WORLD (v8): Meridian as a map you move around.
   Level 0  Meridian: five regions, thirteen divisions as landmarks
   Level 1  a division: its work areas
   Level 2  a work area: its processes, to walk now or pin to a route
   Each level grows out of the spot you pressed, and shrinks back into it.
   The same levels are one toggle away as nested lists.
   ===================================================================== */
import {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {m, AnimatePresence, useReducedMotion} from 'motion/react';
import {zoom as d3zoom, zoomIdentity} from 'd3-zoom';
import {select} from 'd3-selection';
import 'd3-transition';
import {useGame, actions} from '../game/store.js';
import {FUNCTIONS, MAP_GROUPS} from '../content/meridian.js';
import {getExpedition} from '../content/expeditions.js';
import {AREAS, areasOf, areaById} from '../content/areas.js';
import {SHEET, REGIONS, LANDMARKS, ISLAND, CONTOURS, ROADS, blobPath, roadPath} from '../content/world.js';
import {heatOf, whoName} from '../game/flow.js';
import {Icon, Art, Emph, iconInner} from '../components/ui.jsx';

const fnById = id=>FUNCTIONS.find(f=>f.id===id);
const nProc = fn=>fn.processes.length;
const plural = (n, one, many)=>`${n} ${n===1 ? one : (many || one + 's')}`;
/* Where a pressed element sits in the stage, as shares of its width and height. */
function originOf(el, stage){
  if(!el || !stage) return {x:.5, y:.5};
  const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
  return {x:Math.min(1, Math.max(0, (r.left + r.width/2 - s.left) / s.width)), y:Math.min(1, Math.max(0, (r.top + r.height/2 - s.top) / s.height))};
}

/* ---------- level 0: the map ---------- */
const PATHS = {island:blobPath(ISLAND), contours:CONTOURS.map(blobPath), roads:ROADS.map(([a,b])=>roadPath(a,b)), regions:Object.fromEntries(REGIONS.map(r=>[r.id, blobPath(r)]))};
let lastView = null;   // the map stays where you left it, for this visit
/* The whole island fits a wide screen. A tall screen (a phone) starts zoomed to its height, centred on the
   mission, and the player drags sideways for the rest. */
function firstView(svg){
  const r = svg.getBoundingClientRect(); if(!r.width || !r.height) return zoomIdentity;
  const fitW = r.width / SHEET.w, fitH = r.height / SHEET.h;
  if(fitH <= fitW * 1.15) return zoomIdentity;
  const k = Math.min(5, fitH / fitW), cx = 800, cy = SHEET.h / 2;
  return zoomIdentity.translate(SHEET.w/2 - cx*k, SHEET.h/2 - cy*k).scale(k);
}

function WorldMap({stage}){
  const svgRef = useRef(null), layerRef = useRef(null), wrapRef = useRef(null), zRef = useRef(null);
  const [card, setCard] = useState(null);
  const hint = useGame(s=>s.S.world.hint), reduce = useReducedMotion();
  const dur = reduce ? 0 : 260;

  /* Pins and labels stay a readable size on screen at any zoom, and on any screen. */
  const fit = t=>{
    const svg = svgRef.current, wrap = wrapRef.current; if(!svg || !wrap) return;
    const base = (svg.getScreenCTM() || {a:1}).a, s = base * t.k;
    wrap.style.setProperty('--ik', (13 / (15 * s)).toFixed(4));
    wrap.style.setProperty('--ib', (Math.min(1.4, 20 * Math.pow(t.k, .25) / (26 * s))).toFixed(4));
    wrap.style.setProperty('--ir', (12 / (16 * s)).toFixed(4));
    wrap.dataset.lod = s >= .95 ? '2' : '1';
  };
  useLayoutEffect(()=>{
    const svg = select(svgRef.current);
    const z = d3zoom().scaleExtent([1, 5]).translateExtent([[-160,-120],[SHEET.w+160, SHEET.h+120]])
      .on('start', ()=>setCard(null))
      .on('zoom', e=>{ layerRef.current.setAttribute('transform', e.transform.toString()); lastView = e.transform; fit(e.transform); });
    zRef.current = z; svg.call(z).on('dblclick.zoom', null);
    svg.call(z.transform, lastView || firstView(svgRef.current));
    const onResize = ()=>fit(lastView || zoomIdentity); window.addEventListener('resize', onResize);
    return ()=>{ svg.on('.zoom', null); window.removeEventListener('resize', onResize); };
  }, []);
  const zoomBy = f=>select(svgRef.current).transition().duration(dur).call(zRef.current.scaleBy, f);
  const showAll = ()=>select(svgRef.current).transition().duration(dur * 1.5).call(zRef.current.transform, firstView(svgRef.current));
  const onKey = e=>{
    if(e.target!==svgRef.current) return;
    const step = 60, k = (lastView || zoomIdentity).k, moves = {ArrowLeft:[step,0], ArrowRight:[-step,0], ArrowUp:[0,step], ArrowDown:[0,-step]};
    if(moves[e.key]){ e.preventDefault(); select(svgRef.current).transition().duration(dur/2).call(zRef.current.translateBy, moves[e.key][0]/k, moves[e.key][1]/k); }
    else if(e.key==='+' || e.key==='='){ e.preventDefault(); zoomBy(1.4); }
    else if(e.key==='-' || e.key==='_'){ e.preventDefault(); zoomBy(1/1.4); }
    else if(e.key==='0'){ e.preventDefault(); showAll(); }
  };
  const show = (id, el)=>{
    const w = wrapRef.current; if(!w || !el) return;
    const r = el.getBoundingClientRect(), b = w.getBoundingClientRect();
    setCard({id, x:r.left + r.width/2 - b.left, y:r.top - b.top, below:r.top - b.top < 190, h:r.height});
  };
  const enter = (id, el)=>{ setCard(null); actions.worldEnter(id, originOf(el, stage.current)); };

  return <div className="wmap" ref={wrapRef} data-lod="1">
    <svg ref={svgRef} viewBox={`0 0 ${SHEET.w} ${SHEET.h}`} preserveAspectRatio="xMidYMid meet" tabIndex={0} onKeyDown={onKey}
      role="group" aria-label="Map of Meridian. Drag or use the arrow keys to move, scroll, pinch or press plus and minus to zoom, and Tab to each division.">
      <defs>
        <radialGradient id="wglow"><stop offset="0" stopColor="#E9BC5E" stopOpacity=".75"/><stop offset="1" stopColor="#E9BC5E" stopOpacity="0"/></radialGradient>
        <pattern id="wgrid" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M100 0H0V100" fill="none" className="w-grid"/></pattern>
      </defs>
      <rect x={-400} y={-300} width={SHEET.w+800} height={SHEET.h+600} className="w-sea"/>
      <g ref={layerRef}>
        <rect x={-400} y={-300} width={SHEET.w+800} height={SHEET.h+600} fill="url(#wgrid)"/>
        <path d={PATHS.island} className="w-land"/>
        {PATHS.contours.map((d,i)=><path key={i} d={d} className="w-contour"/>)}
        {PATHS.roads.map((d,i)=><path key={i} d={d} className="w-road"/>)}
        {REGIONS.map(r=><path key={r.id} d={PATHS.regions[r.id]} className={'w-region t-' + r.tint}/>)}
        {REGIONS.map(r=>{ const g = MAP_GROUPS.find(x=>x.id===r.id);
          return <g key={r.id} transform={`translate(${r.cx},${r.cy - r.ry + 26})`}><g className="w-rl"><text className="w-rlabel" textAnchor="middle">{g.label.toUpperCase()}</text></g></g>; })}
        <g transform="translate(1440,880)" className="w-compass" aria-hidden="true"><circle r="34"/><path d="M0 -44 L8 0 L0 44 L-8 0Z"/><text y="-50" textAnchor="middle">N</text></g>
        {FUNCTIONS.map(f=>{ const L = LANDMARKS[f.id], heat = heatOf(f), areas = areasOf(f.id).length;
          return <g key={f.id} className={'lm heat-' + heat} transform={`translate(${L.x},${L.y})`} role="button" tabIndex={0}
            aria-label={`${L.label}, ${plural(nProc(f), 'process', 'processes')} in ${plural(areas, 'work area')}.${L.label!==f.name ? ` Full name: ${f.name}.` : ''} Go inside.`}
            onClick={e=>enter(f.id, e.currentTarget)} onKeyDown={e=>{ if(e.key==='Enter' || e.key===' '){ e.preventDefault(); enter(f.id, e.currentTarget); } }}
            onMouseEnter={e=>show(f.id, e.currentTarget.querySelector('.lm-ring'))} onMouseLeave={()=>setCard(null)}
            onFocus={e=>show(f.id, e.currentTarget.querySelector('.lm-ring'))} onBlur={()=>setCard(null)}>
            <g className="lm-b">
              <circle className="lm-glow" r={30 + heat*9} fill="url(#wglow)"/>
              <circle className="lm-ring" r={26}/>
              <g className="lm-ico" transform="translate(-13,-13) scale(1.08)" dangerouslySetInnerHTML={{__html:iconInner(f.icon)}}/>
            </g>
            <g className="lm-t"><text className="lm-name" y={52} textAnchor="middle">{L.label}</text>{' '}
              <text className="lm-more" y={72} textAnchor="middle">{plural(nProc(f), 'process', 'processes')}</text></g>
          </g>; })}
      </g>
    </svg>
    <div className="wctl" role="group" aria-label="Map controls">
      <button className="iconbtn" onClick={()=>zoomBy(1.5)} aria-label="Zoom in"><Icon name="plus"/></button>
      <button className="iconbtn" onClick={()=>zoomBy(1/1.5)} aria-label="Zoom out"><span className="minus" aria-hidden="true"/></button>
      <button className="iconbtn" onClick={showAll} aria-label="Show all of Meridian"><Icon name="compass"/></button>
    </div>
    <AnimatePresence>{hint && <m.p className="whint" initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0}} transition={{duration: reduce ? 0 : .25}}>
      <Icon name="compass"/><span>Drag to move around. Scroll or pinch to zoom. Choose a division to go inside.</span>
      <button className="iconbtn" onClick={actions.worldHintDone} aria-label="Hide this tip"><Icon name="close"/></button></m.p>}</AnimatePresence>
    {card && <LandmarkCard {...card}/>}
  </div>;
}

function LandmarkCard({id, x, y, below, h}){
  const f = fnById(id), strong = f.signals.find(s=>s.s==='strong') || f.signals[0], areas = areasOf(id);
  return <div className={'lmcard' + (below ? ' below' : '')} style={{left:x, top: below ? y + h + 10 : y - 10}} role="tooltip">
    <b>{f.name}</b>
    <p><Emph text={f.brief}/></p>
    {strong && <p className={'lc-sig sig-' + strong.s}><span className="sig"/><span><Emph text={strong.t}/></span></p>}
    <span className="lc-meta">{plural(nProc(f), 'process', 'processes')} in {plural(areas.length, 'work area')}. Press to go inside.</span>
  </div>;
}

/* ---------- level 1: a division ---------- */
function DivisionScene({fn, stage}){
  const areas = areasOf(fn.id), route = useGame(s=>s.J.route);
  return <div className="dscene">
    <aside className="dsc-side">
      <span className="dsc-ill"><Art kind="dept" id={fn.id}/></span>
      <p className="dsc-brief"><Emph text={fn.brief}/></p>
      <h2 className="h4">Signals</h2>
      <ul className="signals">{fn.signals.map((sg,i)=><li key={i} className={'sig-'+sg.s}><span className="sig"/><span><Emph text={sg.t}/></span></li>)}</ul>
      <p className="muted small">Signals are the evidence: volume, repetition and time someone has measured. Strong ones are marked in brass.</p>
    </aside>
    <section className="dsc-plan" aria-labelledby="zones-h">
      <h2 id="zones-h" className="h4">Choose a work area<span className="zcount">{plural(areas.length, 'area')}</span></h2>
      <div className={'zones z' + areas.length}>{areas.map(a=>{ const pinned = a.processes.filter(p=>route.includes(p)).length;
        return <button key={a.id} className="zone" onClick={e=>actions.worldArea(a.id, originOf(e.currentTarget, stage.current))}>
          <span className="z-ico"><Icon name={a.icon}/></span>
          <b className="z-name">{a.name}</b>
          <span className="z-d">{a.d}</span>
          <span className="z-meta">{plural(a.processes.length, 'process', 'processes')}{pinned>0 && <span className="z-pin"><Icon name="flag"/>{pinned} on your route</span>}</span>
          <span className="z-go">Go inside<Icon name="chev"/></span>
        </button>; })}</div>
    </section>
  </div>;
}

/* ---------- level 2: a work area ---------- */
function ProcessActions({pid, compact}){
  const route = useGame(s=>s.J.route), progress = useGame(s=>s.J.progress[pid]);
  const pinned = route.includes(pid), full = route.length>=3 && !pinned;
  const walk = e=>{
    // the walk opens out of the button that was pressed
    const r = e.currentTarget.getBoundingClientRect(), html = document.documentElement;
    html.style.setProperty('--vt-x', `${Math.round(r.left + r.width/2)}px`); html.style.setProperty('--vt-y', `${Math.round(r.top + r.height/2)}px`);
    html.dataset.vt = 'zoom'; setTimeout(()=>{ delete html.dataset.vt; }, 900);
    actions.pickProc(pid);
  };
  return <div className={'site-acts' + (compact ? ' compact' : '')}>
    <button className="btn brass small" onClick={walk}><Icon name="map"/>{progress ? 'Carry on' : 'Walk this process'}</button>
    <button className={'btn small pin ' + (pinned ? 'on' : 'secondary')} aria-pressed={pinned} disabled={full} onClick={()=>actions.routeToggle(pid)}>
      <Icon name={pinned ? 'check' : 'flag'}/>{pinned ? 'On your route' : (full ? 'Route full' : 'Pin to route')}</button>
  </div>;
}
function AreaScene({area}){
  const fn = fnById(area.fnId), walks = useGame(s=>s.J.walks);
  return <div className="ascene">
    <ol className="sites">{area.processes.map((pid, i)=>{ const p = fn.processes.find(x=>x.id===pid), e = getExpedition(pid);
      const done = walks.some(w=>w.procId===pid);
      return <li key={pid} className="site">
        <span className="site-n" aria-hidden="true">{i+1}</span>
        <article className="site-card" aria-labelledby={'site-'+pid}>
          <div className="site-top"><b id={'site-'+pid}>{p.name}</b>{e.flagship && <span className="flagship">Flagship</span>}{done && <span className="tag done"><Icon name="check"/>Walked</span>}</div>
          <p>{p.d}</p>
          <p className="site-meta">{plural(e.steps.length, 'step')}, starting with the {whoName(e.steps[0].who)}</p>
          <ProcessActions pid={pid}/>
        </article>
      </li>; })}</ol>
    <p className="muted small">Pin up to three to read one after another, or walk one now. How strong a case each one is comes after you choose: open <b>How do they rank?</b> on your route.</p>
  </div>;
}

/* ---------- the same levels as lists ---------- */
function WorldList(){
  const w = useGame(s=>s.S.world);
  return <div className="wlist">{MAP_GROUPS.map(g=><section key={g.id} className="wl-region" aria-labelledby={'wl-'+g.id}>
    <h2 id={'wl-'+g.id} className="bh">{g.label}<span>{g.d}</span></h2>
    {FUNCTIONS.filter(f=>f.group===g.id).map(f=><details key={f.id} className="wl-div" open={w.fnId===f.id}>
      <summary><span className="wl-ico"><Icon name={f.icon}/></span><b>{f.name}</b><span className="muted small">{plural(nProc(f), 'process', 'processes')}</span><Icon name="chev" className="wl-chev"/></summary>
      <p className="small wl-brief"><Emph text={f.brief}/></p>
      {areasOf(f.id).map(a=><div key={a.id} className="wl-area"><h3 className="h4"><Icon name={a.icon}/>{a.name}</h3>
        <ul>{a.processes.map(pid=>{ const p = f.processes.find(x=>x.id===pid);
          return <li key={pid}><div><b>{p.name}</b><span className="small muted">{p.d}</span></div><ProcessActions pid={pid} compact/></li>; })}</ul></div>)}
    </details>)}
  </section>)}</div>;
}

/* ---------- the route ---------- */
function RouteBar(){
  const route = useGame(s=>s.J.route);
  return <div className={'routebar' + (route.length ? ' ready' : '')} role="region" aria-label="Your route">
    <span className="rb-l"><Icon name="route"/>Your route</span>
    <ol className="rb-slots">{[0,1,2].map(i=>{ const pid = route[i], e = pid && getExpedition(pid);
      return e ? <li key={pid} className="rb-slot on"><span>{e.name}</span><button className="iconbtn" onClick={()=>actions.routeToggle(pid)} aria-label={`Take ${e.name} off your route`}><Icon name="close"/></button></li>
        : <li key={'e'+i} className="rb-slot"><span>Open</span></li>; })}</ol>
    <span className="rb-acts">
      {route.length>0 && <button className="linkbtn" onClick={actions.toReveal}>How do they rank?</button>}
      <button className="btn brass" disabled={!route.length} onClick={actions.toPick}>{route.length ? 'Read my route' : 'Pin a process to start a route'}</button>
    </span>
  </div>;
}

/* ---------- the screen ---------- */
/* With reduced motion the levels only fade: no scale at all, not even an instant one. */
const SCENE = {
  enter: ({dir, o, reduce})=>reduce ? {opacity:0} : {opacity:0, scale: dir>0 ? .3 : 2.2, originX:o.x, originY:o.y},
  center: ({o, t, reduce})=>reduce ? {opacity:1, transition:t} : {opacity:1, scale:1, originX:o.x, originY:o.y, transition:t},
  exit: ({dir, o, t, reduce})=>reduce ? {opacity:0, transition:t} : {opacity:0, scale: dir>0 ? 2.6 : .35, originX:o.x, originY:o.y, transition:t},
};

export function Terrain(){
  const w = useGame(s=>s.S.world), reduce = useReducedMotion(), stage = useRef(null), head = useRef(null);
  const fn = w.fnId ? fnById(w.fnId) : null, area = w.areaId ? areaById(w.areaId) : null;
  /* The spot this change grows out of or shrinks into: where the deeper of the two levels was entered. */
  const deeper = w.dir>0 ? w.level : (w.from || w.level + 1), o = w.origins[deeper] || {x:.5, y:.5};
  const t = reduce ? {duration:.15} : {duration:.55, ease:[.2,.8,.2,1], originX:{duration:0}, originY:{duration:0}};
  const custom = {dir:w.dir, o, t, reduce:!!reduce};
  const key = w.list ? 'list' : (w.level===0 ? 'map' : (w.level===1 ? 'fn:' + w.fnId : 'area:' + w.areaId));
  const first = useRef(true);
  useEffect(()=>{
    if(first.current){ first.current = false; return; }
    const h = head.current; if(!h) return;
    const top = h.getBoundingClientRect().top;
    if(top < 70) window.scrollBy({top: top - 90, behavior: reduce ? 'auto' : 'smooth'});
    h.focus({preventScroll:true});
  }, [key]);
  useEffect(()=>{
    const esc = e=>{ if(e.key!=='Escape' || document.querySelector('.modal') || w.list || w.level===0) return; actions.worldUp(w.level - 1); };
    document.addEventListener('keydown', esc); return ()=>document.removeEventListener('keydown', esc);
  }, [w.level, w.list]);

  const title = w.list ? 'Every division, area and process' : (w.level===0 ? 'Where could AI help most?' : (w.level===1 ? fn.name : area.name));
  const lede = w.list ? 'The same map as lists. Open a division to see its work areas and processes.'
    : (w.level===0 ? 'Look for the work that takes the most time. Some of it will turn out to need no AI at all. Choose a division to go inside, and pin up to three processes to your route.'
    : (w.level===1 ? 'Each work area holds the processes its people run. Choose one to go inside.' : area.d));
  return <div className="world">
    <header className="scene wscene-head">
      <nav className="crumbs" aria-label="Where you are in Meridian">
        <button className={'crumb' + (w.level===0 && !w.list ? ' on' : '')} onClick={()=>{ if(w.list) actions.worldList(false); actions.worldUp(0); }} aria-current={w.level===0 ? 'location' : undefined}><Icon name="map"/>Meridian</button>
        {fn && <><Icon name="chev" className="crumb-sep"/><button className={'crumb' + (w.level===1 ? ' on' : '')} onClick={()=>actions.worldUp(1)} aria-current={w.level===1 ? 'location' : undefined}>{fn.name}</button></>}
        {area && <><Icon name="chev" className="crumb-sep"/><span className="crumb on" aria-current="location">{area.name}</span></>}
      </nav>
      <div className="wh-row">
        <div><p className="kicker">{w.level===0 || w.list ? 'Survey' : (w.level===1 ? 'A division' : `A work area of ${fn.name}`)}</p>
          <h1 ref={head} tabIndex={-1}>{title}</h1><p className="lede">{lede}</p></div>
        <div className="viewtoggle" role="group" aria-label="Show Meridian as">
          <button className={w.list ? '' : 'on'} aria-pressed={!w.list} onClick={()=>actions.worldList(false)}><Icon name="map"/>Map</button>
          <button className={w.list ? 'on' : ''} aria-pressed={w.list} onClick={()=>actions.worldList(true)}><Icon name="notes"/>List</button>
        </div>
      </div>
    </header>
    <div className="wstage" ref={stage}>
      <AnimatePresence mode="popLayout" initial={false} custom={custom}>
        <m.div key={key} className="wscene" custom={custom} variants={SCENE} initial="enter" animate="center" exit="exit">
          {w.list ? <WorldList/> : (w.level===0 ? <WorldMap stage={stage}/> : (w.level===1 ? <DivisionScene fn={fn} stage={stage}/> : <AreaScene area={area}/>))}
        </m.div>
      </AnimatePresence>
    </div>
    {w.level>0 && !w.list && <div className="actions wback"><button className="btn ghost" onClick={()=>actions.worldUp(w.level - 1)}><Icon name="back"/>Back to {w.level===2 ? fn.name : 'Meridian'}</button></div>}
    <RouteBar/>
  </div>;
}

export {AREAS};
