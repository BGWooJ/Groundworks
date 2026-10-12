import {useGame, actions} from '../game/store.js';
import {ROLES} from '../game/rpg.js';
import {Art, Icon} from '../components/ui.jsx';

export default function Role(){
  const cur = useGame(s=>s.J.profile.role), next = useGame(s=>s.S.next);
  return <div className="narrow wide">
    <header className="scene"><p className="kicker">Before you set out</p><h1>Choose your lens</h1>
      <p className="lede">Groundwork is for every level of the organisation. Every lens sees every finding; yours decides what opens first on each step and which complications you are most likely to meet. You can change it any time from your character.</p></header>
    <div className="roles" role="radiogroup" aria-label="Your lens">
      {ROLES.map(r=><button key={r.id} role="radio" aria-checked={cur===r.id} className={'rolecard ' + (cur===r.id?'on':'')} onClick={()=>actions.chooseRole(r.id)}>
        <span className="rc-art"><Art kind="role" id={r.id}/></span>
        <span className="rc-level">{r.level}</span>
        <b className="rc-name">{r.name}</b>
        <span className="rc-d">{r.d}</span>
        <span className="rc-perk"><Icon name="spark"/>{r.perk}</span>
        <span className="rc-go">{cur===r.id ? 'Your lens' : 'Choose this lens'}</span>
      </button>)}
    </div>
    {!next && <div className="actions"><button className="btn ghost" onClick={actions.back}><Icon name="back"/>Back</button></div>}
  </div>;
}
