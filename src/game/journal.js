/* =====================================================================
   JOURNAL VIEWS (v7): everything a player has started or finished, as one
   list, so Home, My maps and the top bar all show the same work.
   ===================================================================== */
import {getExpedition} from '../content/expeditions.js';
import {answered} from './flow.js';

export function workItems(J){
  const items = [];
  Object.values(J.progress || {}).forEach(p=>{
    const e = getExpedition(p.procId); if(!e) return;
    const read = e.steps.filter(st=>p.ans && p.ans[st.id] && p.ans[st.id].revealed).length;
    items.push({kind:'walk', key:'w:'+p.procId, id:p.procId, title:e.name, where:`Meridian: ${e.fn}`, read, total:e.steps.length, updated:p.updated, done:false});
  });
  Object.values(J.maps || {}).forEach(m=>{
    const started = m.started!==undefined ? m.started : true;
    const steps = m.steps || [], read = started ? steps.filter(st=>answered((m.ans||{})[st.id])).length : 0;
    const total = started ? steps.length : steps.filter(st=>st.name && st.name.trim()).length;
    items.push({kind: started ? 'map' : 'draft', key:'m:'+m.id, id:m.id, title:m.process || 'Untitled process', where:m.org || 'Your process',
      read, total, updated:m.updated || 0, done: started && total>0 && read===total});
  });
  (J.walks || []).forEach((w,i)=>{
    items.push({kind:'finished-walk', key:'f:'+i+':'+(w.when||0), id:i, title:w.proc, where:'Meridian walk, finished', summary:w.summary,
      updated:w.when || 0, done:true, reopenable:!!w.ans});
  });
  return items.sort((a,b)=>(b.updated||0)-(a.updated||0));
}
export function inProgress(J){ return workItems(J).filter(x=>!x.done); }

export function ago(t){
  if(!t) return '';
  const d = Math.floor((Date.now() - t) / 86400000);
  if(d<=0) return 'today'; if(d===1) return 'yesterday'; if(d<7) return `${d} days ago`;
  return new Date(t).toLocaleDateString(undefined, {day:'numeric', month:'short'});
}
export function progressLabel(x){
  if(x.kind==='draft') return `Setup not finished, ${x.total} ${x.total===1?'step':'steps'} named`;
  if(x.kind==='finished-walk') return x.summary || 'Finished';
  return x.read===x.total ? `All ${x.total} steps read` : `${x.read} of ${x.total} steps read`;
}
