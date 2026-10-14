import {Component, useEffect, useRef, lazy, Suspense} from 'react';
import {LazyMotion, MotionConfig} from 'motion/react';
import {useGame, actions, getState, activity, touch} from './game/store.js';
import {saveCodeInAddress, clearAddress, unpackJournal, saveError} from './game/storage.js';
import Topbar from './components/Topbar.jsx';
import Stages from './components/Stages.jsx';
import Intro from './views/Intro.jsx';
import {Toasts, Popups, Modal, Spotlight} from './components/Feedback.jsx';
import Maps from './views/Maps.jsx';
import Home from './views/Home.jsx';
import Role from './views/Role.jsx';

const loadMotion = ()=>import('./motionFeatures.js').then(mod=>mod.default);

/* v8: the first screens (the introduction, Home, the lenses, My maps) come in the first download. The rest
   (the world map with its zooming, the reads, the finished map) load just after, while the player reads the
   first screen, so a slow connection shows something useful sooner. Once loaded, a screen renders at once;
   only a player faster than their connection ever sees "Opening". */
function later(load, name='default'){
  let Comp = null, p = null;
  const preload = ()=>p || (p = load().then(m=>{ Comp = m[name]; return m; }));
  const Lazy = lazy(()=>preload().then(m=>({default:m[name]})));
  function Later(props){ return Comp ? <Comp {...props}/> : <Lazy {...props}/>; }
  Later.preload = preload;
  return Later;
}
const survey = ()=>import('./views/Survey.jsx'), finished = ()=>import('./views/Finished.jsx');
const LATER = {
  'own-setup':later(()=>import('./views/OwnSetup.jsx')), terrain:later(()=>import('./views/World.jsx'), 'Terrain'),
  reveal:later(survey, 'Reveal'), pick:later(survey, 'Pick'), map:later(()=>import('./views/MapView.jsx')),
  step:later(()=>import('./views/Step.jsx')), quick:later(()=>import('./views/QuickRead.jsx')),
  finished:later(finished), export:later(finished, 'Export'),
  character:later(()=>import('./views/Character.jsx')), library:later(()=>import('./views/Library.jsx')),
};
const preloadAll = ()=>Object.values(LATER).forEach(v=>v.preload().catch(()=>{}));
function Opening(){ return <p className="opening" role="status">Opening…</p>; }

/* If a screen cannot be fetched (the connection dropped, or the site was updated while this tab was open),
   say so instead of losing the whole page. Browsers remember a failed download until the page reloads,
   so reloading is the way on; progress is saved on every change, so it loses nothing. */
class ScreenError extends Component{
  constructor(props){ super(props); this.state = {failed:false}; }
  static getDerivedStateFromError(){ return {failed:true}; }
  render(){
    if(!this.state.failed) return this.props.children;
    return <div className="opening failed" role="alert"><div>
      <h1 className="h3">This screen did not load</h1>
      <p>The connection may have dropped, or Groundwork was updated while this page was open. Your progress is saved, so reloading loses nothing.</p>
      <div className="actions"><button className="btn primary" onClick={()=>window.location.reload()}>Reload the page</button></div>
    </div></div>;
  }
}

const VIEWS = Object.assign({home:Home, intro:Intro, role:Role, maps:Maps}, LATER);

export default function App(){
  const view = useGame(s=>s.S.view), mode = useGame(s=>s.S.mode), cur = useGame(s=>s.S.cur);
  const key = [mode, view, cur].join('|'), last = useRef('');
  const View = VIEWS[view] || Home;

  /* New screen: back to the top, and focus the heading for screen readers. */
  useEffect(()=>{
    if(last.current===key) return;
    const first = !last.current; last.current = key;
    if(first) return;
    window.scrollTo({top:0});
    if(view==='home') return;
    // a screen still loading has no heading yet: wait for it, but give up if the player moves on
    let tries = 0, raf = 0;
    const focus = ()=>{
      // while a screen loads, React keeps the last one hidden in the page: only a visible heading counts
      const h = [...document.querySelectorAll('main h1')].find(x=>x.getClientRects().length);
      if(!h){ if(++tries < 300) raf = requestAnimationFrame(focus); return; }
      h.setAttribute('tabindex','-1'); h.focus({preventScroll:true});
    };
    focus();
    return ()=>cancelAnimationFrame(raf);
  }, [key, view]);

  /* Load the other screens once the first one is up and the browser is idle. */
  useEffect(()=>{
    const idle = window.requestIdleCallback || (f=>setTimeout(f, 600));
    const id = idle(preloadAll, {timeout:2500});
    return ()=>(window.cancelIdleCallback || clearTimeout)(id);
  }, []);

  /* v8: opened from a save link. The progress travels after "#", so it never reaches a server; it is
     read once, then cleared from the address bar so a reload or a bookmark does not offer it again. */
  useEffect(()=>{
    const take = ()=>{
      const code = saveCodeInAddress(); if(!code) return;
      clearAddress();
      // a link that arrived cut short has lost its code entirely: that is damage, not the wrong kind of link
      unpackJournal(code).then(env=>actions.restoreArrive(env), e=>actions.restoreOpen(saveError(e.message==='no-code' ? new Error('damaged') : e)));
    };
    take();
    // a save link pasted into a tab where the game is already open only changes the part after "#"
    window.addEventListener('hashchange', take);
    return ()=>window.removeEventListener('hashchange', take);
  }, []);

  /* The hint opens on its own if you stall, when you asked it to. */
  useEffect(()=>{
    const t = setInterval(()=>{
      const S = getState().S;
      if(S.view!=='step' || S.gui.open || S.guide!=='stall' || S.q<0 || S.modal) return;
      if(S.gui.auto[S.gui.key]) return;
      if(Date.now()-activity.last > 25000) actions.guideStall();
    }, 1000);
    const evs = ['pointerdown','keydown','wheel','touchstart'];
    evs.forEach(e=>window.addEventListener(e, touch, {passive:true}));
    const esc = e=>{ if(e.key==='Escape' && getState().S.gui.open && !getState().S.modal) actions.guideClose(); };
    document.addEventListener('keydown', esc);
    return ()=>{ clearInterval(t); evs.forEach(e=>window.removeEventListener(e, touch)); document.removeEventListener('keydown', esc); };
  }, []);

  return <MotionConfig reducedMotion="user"><LazyMotion features={loadMotion} strict><div className={'app v-' + view}>
    <a className="skip" href="#main">Skip to content</a>
    <Topbar/>
    <Stages/>
    <main className={view==='home' ? 'main home' : 'main'} id="main"><ScreenError key={view}><Suspense fallback={<Opening/>}><View/></Suspense></ScreenError></main>
    <Toasts/><Popups/><Spotlight/><Modal/>
  </div></LazyMotion></MotionConfig>;
}
