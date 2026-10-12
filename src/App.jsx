import {useEffect, useRef} from 'react';
import {useGame, actions, getState, activity, touch} from './game/store.js';
import Topbar from './components/Topbar.jsx';
import {Toasts, Popups, Modal} from './components/Feedback.jsx';
import Home from './views/Home.jsx';
import Role from './views/Role.jsx';
import OwnSetup from './views/OwnSetup.jsx';
import {Terrain, Reveal, Pick} from './views/Survey.jsx';
import MapView from './views/MapView.jsx';
import Step from './views/Step.jsx';
import Finished, {Export} from './views/Finished.jsx';
import Character from './views/Character.jsx';
import Library from './views/Library.jsx';

const VIEWS = {home:Home, role:Role, 'own-setup':OwnSetup, terrain:Terrain, reveal:Reveal, pick:Pick, map:MapView,
  step:Step, finished:Finished, export:Export, character:Character, library:Library};

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
    const h = document.querySelector('main h1');
    if(h && view!=='home'){ h.setAttribute('tabindex','-1'); h.focus({preventScroll:true}); }
  }, [key, view]);

  /* The field guide opens on its own if you stall, when you asked it to. */
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

  return <div className={'app v-' + view}>
    <a className="skip" href="#main">Skip to content</a>
    <Topbar/>
    <main className={view==='home' ? 'main home' : 'main'} id="main"><View/></main>
    <Toasts/><Popups/><Modal/>
  </div>;
}
