/* v7: questions only where they matter, the plan, and getting back to your work. */
import {describe, it, expect, vi, beforeAll} from 'vitest';
import {getExpedition} from '../src/content/expeditions.js';
import {askedQuestions, answered, pruneAnswers, planFor, buildExport, lppPrompt} from '../src/game/flow.js';
import {workItems, inProgress} from '../src/game/journal.js';

const full = {shape:'extract', input:'text', rep:'high', stakes:'low', band:'core', cap:'extract', auto:'review', where:'office', builder:'team', sens:'internal'};

describe('questions are asked only where the answer can matter', ()=>{
  it('skips autonomy for a process fix, and where-it-happens outside the LLM bands', ()=>{
    expect(askedQuestions({band:'none', cap:'fix'}).map(q=>q.k)).not.toContain('auto');
    expect(askedQuestions({band:'none', cap:'fix'}).map(q=>q.k)).not.toContain('where');
    expect(askedQuestions({band:'other', cap:'predict'}).map(q=>q.k)).not.toContain('where');
    expect(askedQuestions({band:'core', cap:'draft'}).map(q=>q.k)).toEqual(expect.arrayContaining(['auto','where']));
  });
  it('counts a fix step as answered without autonomy or place, and prunes stale answers', ()=>{
    const a = {...full, band:'none', cap:'fix'};
    pruneAnswers(a);
    expect(a.auto).toBeUndefined(); expect(a.where).toBeUndefined();
    expect(answered(a)).toBe(true);
    expect(answered({...full, auto:undefined})).toBe(false);
  });
});

function walked(pid){
  const e = getExpedition(pid), S = {mode:'guided', procId:pid, steps:e.steps, ans:{}, whatif:{}, includeDesc:false};
  e.steps.forEach(st=>{ S.ans[st.id] = {shape:st.expert.shape, input:st.expert.input, rep:st.expert.rep, stakes:st.expert.stakes,
    band:'core', cap:st.expertPick, auto:st.autoBest, where:'system', builder:'unsure', sens:'personal', revealed:true}; });
  return S;
}
describe('the plan', ()=>{
  it('sequences every read step into exactly one phase, by its verdict', ()=>{
    const S = walked('ap'), p = planFor(S);
    const placed = p.phases.flatMap(ph=>ph.steps.map(r=>r.n)).sort();
    expect(placed).toEqual([1,2,3,4]);
    expect(p.phases.find(ph=>ph.id==='ground').steps.map(r=>r.verdict)).toEqual(['prepare']);
    expect(p.phases.find(ph=>ph.id==='build').steps.map(r=>r.verdict)).toEqual(['engineering']);
  });
  it('leads with the best pilot and flags pilots that sit after groundwork', ()=>{
    const p = planFor(walked('ap'));
    expect(p.headline).toMatch(/^Start by piloting step 1.*Step 2 can be built alongside/);
    expect(p.depends).toEqual([{n:4, name:'Catch duplicate and unusual payments', after:[3], phase:'prove'}]);
  });
  it('names what the sponsor must provide, from the answers', ()=>{
    const asks = planFor(walked('ap')).asks.map(a=>a.text).join(' ');
    expect(asks).toMatch(/accountable decision owner/);
    expect(asks).toMatch(/privacy review/);
    expect(asks).toMatch(/Decide who builds/);
  });
  it('travels with the exports', ()=>{
    const d = buildExport(walked('ap'));
    expect(d.version).toBe(5);
    expect(d.plan.phases.length).toBeGreaterThan(1);
    expect(lppPrompt(d)).toMatch(/Proposed sequence:/);
  });
  it('is empty until a step is read', ()=>{
    const S = walked('ap'); S.steps.forEach(st=>{ S.ans[st.id].revealed = false; });
    expect(planFor(S)).toBeNull();
  });
});

describe('your work is listed so it can be found again', ()=>{
  it('lists walks in progress, own maps and drafts, and finished walks', ()=>{
    const J = {progress:{ap:{procId:'ap', ans:{'ap-1':{revealed:true}}, updated:3}},
      maps:{m1:{id:'m1', process:'Onboarding', steps:[{id:'s1', name:'Forms'},{id:'s2', name:'Accounts'}], ans:{s1:full}, started:true, updated:2},
            m2:{id:'m2', process:'Half typed', steps:[{id:'s1', name:'One'},{id:'s2', name:''}], ans:{}, started:false, updated:1}},
      walks:[{proc:'Old walk', summary:'Matched 2 of 3', when:0}]};
    const items = workItems(J);
    expect(items.map(x=>x.kind)).toEqual(['walk','map','draft','finished-walk']);
    expect(items[0]).toMatchObject({read:1, total:4, done:false});
    expect(items[1]).toMatchObject({read:1, total:2});
    expect(items[2]).toMatchObject({total:1});
    expect(items[3].reopenable).toBe(false);
    expect(inProgress(J).length).toBe(3);
  });
  it('treats maps saved before v7 (no started flag) as started', ()=>{
    const items = workItems({maps:{m:{id:'m', process:'Legacy', steps:[{id:'s1', name:'A'}], ans:{s1:full}}}, walks:[], progress:{}});
    expect(items[0]).toMatchObject({kind:'map', done:true});
  });
});

describe('the store saves, resumes and reopens', ()=>{
  let store;
  beforeAll(async ()=>{
    const mem = {};
    vi.stubGlobal('localStorage', {getItem:k=>mem[k]??null, setItem:(k,v)=>{ mem[k] = String(v); }, removeItem:k=>{ delete mem[k]; }});
    store = await import('../src/game/store.js');
  });
  it('saves a walk the moment it starts, and resumes it after going home', ()=>{
    const {actions, getState} = store;
    actions.chooseRole('steward'); actions.startGuided(); actions.pickProc('ap');
    expect(getState().J.progress.ap).toBeTruthy();
    actions.home();
    expect(getState().S.mode).toBe(null);
    expect(inProgress(getState().J).some(x=>x.kind==='walk' && x.id==='ap')).toBe(true);
    actions.resumeWalk('ap');
    expect(getState().S).toMatchObject({mode:'guided', procId:'ap', view:'map', resumed:true});
    actions.restartWalk();
    expect(getState().S.resumed).toBe(false);
  });
  it('keeps a half-typed setup as a draft, and reopens it in setup', ()=>{
    const {actions, getState} = store;
    actions.startOwn();
    const id = getState().S.own.id;
    expect(getState().J.maps[id]).toBeUndefined();          // nothing typed, nothing kept
    actions.ownField('process', 'Expense claims');
    expect(getState().J.maps[id]).toMatchObject({process:'Expense claims', started:false});
    actions.home(); actions.openMap(id);
    expect(getState().S.view).toBe('own-setup');
  });
  it('opens a saved map file, and refuses an export that is not one', ()=>{
    const {actions, getState} = store;
    const map = {id:'mx', process:'Imported', steps:[{id:'s1', name:'A', notes:''},{id:'s2', name:'B', notes:''}], ans:{}, started:true};
    actions.openMapFile(JSON.stringify({source:'Groundwork', kind:'map', version:7, map}));
    expect(getState().J.maps.mx.process).toBe('Imported');
    expect(getState().S).toMatchObject({mode:'own', view:'map'});
    const before = Object.keys(getState().J.maps).length;
    actions.openMapFile(JSON.stringify({source:'Groundwork', version:5, steps:[]}));
    expect(Object.keys(getState().J.maps).length).toBe(before);
  });
  it('queues achievements for the spotlight and keeps them as unseen until looked at', ()=>{
    const {actions, getState} = store;
    actions.exported('json');
    const s = getState();
    expect(s.spot.some(x=>x.kind==='mark' && x.marks.some(m=>m.id==='further'))).toBe(true);
    expect(s.J.profile.unseen.marks).toContain('further');
    actions.markSeen('marks');
    expect(getState().J.profile.unseen.marks).toEqual([]);
  });
});
