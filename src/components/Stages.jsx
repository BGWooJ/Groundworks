/* v8: "you are here". A strip under the top bar names every stage of a walk, or of your own map, and
   marks the current one, so a newcomer always knows what they are doing and what comes next. */
import {useGame} from '../game/store.js';
import {Icon} from './ui.jsx';

const GUIDED = ['Explore', 'Choose', 'Make the calls', 'Compare', 'Your plan'];
const OWN = ['Describe it', 'Make the calls', 'Your plan'];

export function stageOf(S){
  const v = S.view;
  if(S.mode==='guided'){
    if(v==='terrain') return S.world && S.world.level>=2 ? 1 : 0;   // a work area's processes are the choice
    if(v==='reveal' || v==='pick') return 1;
    if(v==='map') return 2;
    if(v==='step'){ const st = S.steps[S.cur], a = st && S.ans[st.id]; return a && a.revealed ? 3 : 2; }
    if(v==='finished' || v==='export') return 4;
  }
  if(S.mode==='own'){
    if(v==='own-setup') return 0;
    if(v==='map' || v==='step') return 1;
    if(v==='finished' || v==='export') return 2;
  }
  return -1;
}

export default function Stages(){
  const S = useGame(s=>s.S), at = stageOf(S);
  if(at<0) return null;
  const list = S.mode==='own' ? OWN : GUIDED;
  return <nav className="stages" aria-label="Where you are">
    <span className="st-now">Stage {at+1} of {list.length}</span>
    <ol>{list.map((name, i)=><li key={name} className={i===at ? 'on' : (i<at ? 'done' : '')} aria-current={i===at ? 'step' : undefined}>
      <span className="st-n" aria-hidden="true">{i<at ? <Icon name="check"/> : i+1}</span><span className="st-l">{name}</span></li>)}</ol>
  </nav>;
}
