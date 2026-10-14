/* v8 phase 1: who meets the introduction, where it leads, and the "you are here" stages. */
import {describe, it, expect, vi} from 'vitest';

function memoryStorage(seed){
  const mem = Object.assign({}, seed || {});
  vi.stubGlobal('localStorage', {getItem:k=>mem[k]??null, setItem:(k,v)=>{ mem[k] = String(v); }, removeItem:k=>{ delete mem[k]; }});
  return mem;
}
async function freshStore(seed){ vi.resetModules(); const mem = memoryStorage(seed); return {mem, store:await import('../src/game/store.js')}; }

describe('the introduction', ()=>{
  it('opens first for a new player, then hands over to the lens and the survey', async ()=>{
    const {mem, store} = await freshStore();
    const {getState, actions} = store;
    expect(getState().S.view).toBe('intro');
    actions.introDone('guided');
    expect(getState().J.profile.seen.intro).toBe(true);
    expect(JSON.parse(mem.gw_journal_v4).profile.seen.intro).toBe(true);
    expect(getState().S).toMatchObject({view:'role', next:'guided'});
    actions.chooseRole('practitioner');
    expect(getState().S).toMatchObject({view:'terrain', mode:'guided'});
  });
  it('goes home when skipped, and opens again from "How it works"', async ()=>{
    const {store} = await freshStore();
    const {getState, actions} = store;
    actions.introDone(null);
    expect(getState().S.view).toBe('home');
    actions.introOpen();
    expect(getState().S.view).toBe('intro');
    actions.introDone('own');
    expect(getState().S).toMatchObject({view:'role', next:'own'});
  });
  it('does not stand in the way of anyone with progress from before v8', async ()=>{
    const {store} = await freshStore({gw_journal_v4:JSON.stringify({marks:{}, walks:[], maps:{}, progress:{}, profile:{role:'sponsor', xp:120}})});
    expect(store.getState().S.view).toBe('home');
    expect(store.isNewPlayer(store.getState().J)).toBe(false);
  });
});

describe('"you are here"', ()=>{
  it('names the stage of a walk and of your own map', async ()=>{
    memoryStorage();
    const {stageOf} = await import('../src/components/Stages.jsx');
    const step = (revealed)=>({mode:'guided', view:'step', cur:0, steps:[{id:'x'}], ans:{x:{revealed}}});
    expect(stageOf({mode:'guided', view:'terrain'})).toBe(0);
    expect(stageOf({mode:'guided', view:'pick'})).toBe(1);
    expect(stageOf({mode:'guided', view:'map'})).toBe(2);
    expect(stageOf(step(false))).toBe(2);
    expect(stageOf(step(true))).toBe(3);
    expect(stageOf({mode:'guided', view:'finished'})).toBe(4);
    expect(stageOf({mode:'own', view:'own-setup'})).toBe(0);
    expect(stageOf({mode:'own', view:'step', cur:0, steps:[], ans:{}})).toBe(1);
    expect(stageOf({mode:'own', view:'export'})).toBe(2);
    expect(stageOf({mode:null, view:'home'})).toBe(-1);
    expect(stageOf({mode:'guided', view:'library'})).toBe(-1);
  });
});

/* ---------- phase 2: getting back to your work ---------- */
const b64url = s=>Buffer.from(s).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
async function storage(){ memoryStorage(); return import('../src/game/storage.js'); }
function sampleJournal(st){
  const J = st.blankJournal();
  J.profile.role = 'steward'; J.profile.xp = 240; J.marks.first = 1;
  J.maps.m1 = {id:'m1', org:'Claims', process:'Expense claims', started:true, updated:1700000000000,
    steps:[{id:'s1', name:'Check receipts', notes:'Every claim, by hand'}], ans:{s1:{shape:'check'}}, charter:{challenge:'Fewer returns', success:'', tracking:'', audience:[]}};
  J.progress.ap = {procId:'ap', ans:{}, dug:{}, cur:0, updated:1700000100000};
  return J;
}

describe('save links', ()=>{
  it('carry the whole journal, and survive the line breaks an email adds', async ()=>{
    const st = await storage(), J = sampleJournal(st);
    const code = await st.packJournal(J);
    expect(code).toMatch(/^gw1\.d\.[A-Za-z0-9_-]+$/);
    const link = st.saveLinkOf(code, {origin:'https://example.org', pathname:'/Groundworks/'});
    expect(link.startsWith('https://example.org/Groundworks/#save=gw1.d.')).toBe(true);
    const wrapped = link.slice(0, 40) + '\n  ' + link.slice(40, 90) + ' \r\n' + link.slice(90);
    const back = await st.unpackJournal(wrapped);
    expect(back.J).toEqual(st.normalJournal(J));
    expect(typeof back.at).toBe('number');
  });
  it('are small: one map and one walk in progress fit in well under 2,000 characters', async ()=>{
    const st = await storage();
    expect(st.saveLinkOf(await st.packJournal(sampleJournal(st)), {origin:'https://bgwooj.github.io', pathname:'/Groundworks/'}).length).toBeLessThan(2000);
  });
  it('say so when cut short, or when they are not a save link at all', async ()=>{
    const st = await storage(), code = await st.packJournal(sampleJournal(st));
    await expect(st.unpackJournal(code.slice(0, code.length - 20))).rejects.toThrow('damaged');
    await expect(st.unpackJournal('https://example.org/some/page')).rejects.toThrow('no-code');
    expect(st.saveError(new Error('damaged'))).toMatch(/cut off/);
  });
  it('trust nothing inside: keys that could change how objects behave are dropped', async ()=>{
    const st = await storage();
    const evil = '{"v":1,"at":1,"J":{"profile":{"xp":5,"__proto__":{"polluted":true}},"maps":{"x":{"steps":"not a list"}},"constructor":{"prototype":{"polluted":true}}}}';
    const back = await st.unpackJournal('gw1.j.' + b64url(evil));
    expect(({}).polluted).toBeUndefined();
    expect(Object.getPrototypeOf(back.J.profile)).toBe(Object.prototype);
    expect(back.J.profile.xp).toBe(5);
    expect(back.J.maps).toEqual({});           // a damaged map is dropped, not allowed to break a screen
    await expect(st.unpackJournal('gw1.j.' + b64url('{"v":1,"J":{"maps":{}}}'))).rejects.toThrow('not-a-journal');
  });
  it('refuse anything that unpacks to more than a real save could be', async ()=>{
    const st = await storage();
    const huge = new TextEncoder().encode(JSON.stringify({v:1, J:{profile:{}, pad:' '.repeat(5e6)}}));
    const zipped = new Uint8Array(await new Response(new Blob([huge]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    await expect(st.unpackJournal('gw1.d.' + Buffer.from(zipped).toString('base64url'))).rejects.toThrow('too-big');
  });
});

describe('save files', ()=>{
  it('hold the same journal, and tell a progress file from a map file', async ()=>{
    const st = await storage(), J = sampleJournal(st), f = st.progressFile(J);
    expect(f.name).toMatch(/^groundwork-progress-\d{4}-\d{2}-\d{2}\.json$/);
    const back = st.readSaveFile(f.text);
    expect(back.kind).toBe('progress'); expect(back.J).toEqual(st.normalJournal(J));
    expect(st.readSaveFile(JSON.stringify({source:'Groundwork', kind:'map', map:J.maps.m1})).kind).toBe('map');
    expect(()=>st.readSaveFile('{"hello":1}')).toThrow('not-groundwork');
    expect(()=>st.readSaveFile('not json')).toThrow('not-groundwork');
  });
});

describe('opening saved progress', ()=>{
  it('fills an empty browser at once, and goes home', async ()=>{
    const {store} = await freshStore();
    const st = await import('../src/game/storage.js');
    const env = await st.unpackJournal(await st.packJournal(sampleJournal(st)));
    store.actions.restoreArrive(env);
    const S = store.getState();
    expect(S.S.view).toBe('home'); expect(S.S.modal).toBe(null);
    expect(S.J.profile.xp).toBe(240); expect(S.J.maps.m1.process).toBe('Expense claims');
    expect(S.J.profile.seen.intro).toBe(true);
    expect(S.toasts.some(t=>t.title==='Welcome back')).toBe(true);
  });
  it('asks before replacing progress already in the browser', async ()=>{
    const {store} = await freshStore({gw_journal_v4:JSON.stringify({marks:{}, walks:[], maps:{}, progress:{}, profile:{role:'sponsor', xp:50}})});
    const st = await import('../src/game/storage.js');
    const env = await st.unpackJournal(await st.packJournal(sampleJournal(st)));
    store.actions.restoreArrive(env);
    expect(store.getState().S.modal.type).toBe('restore-confirm');
    expect(store.getState().J.profile.xp).toBe(50);              // nothing replaced yet
    store.actions.restoreApply();
    expect(store.getState().J.profile.xp).toBe(240);
  });
  it('opens a v7 map file through the same door, and explains a file it cannot open', async ()=>{
    const {store} = await freshStore();
    const map = {id:'m9', org:'Ops', process:'Night shift handover', started:true, steps:[{id:'s1', name:'Write the log', notes:''}], ans:{}};
    expect(store.actions.openSaveFile(JSON.stringify({source:'Groundwork', kind:'map', version:7, map}))).toBe(null);
    expect(store.getState().J.maps.m9.process).toBe('Night shift handover');
    expect(store.getState().S).toMatchObject({mode:'own', view:'map'});
    expect(store.actions.openSaveFile('{"not":"ours"}')).toMatch(/not a Groundwork save/);
  });
  it('knows when the latest work is not yet in a saved link or file', async ()=>{
    const {store} = await freshStore();
    const {unsaved} = await import('../src/game/journal.js');
    store.actions.chooseRole('steward'); store.actions.startGuided(); store.actions.pickProc('ap');
    expect(unsaved(store.getState().J)).toBe(true);
    store.actions.saveDone('link');
    expect(unsaved(store.getState().J)).toBe(false);
    expect(store.getState().J.profile.lastSaveKind).toBe('link');
  });
});

/* ---------- phase 3: the world ---------- */
describe('the world', ()=>{
  it('places every process in exactly one work area, and every division on the map', async ()=>{
    memoryStorage();
    const {checkAreas, areasOf, areaOfProcess} = await import('../src/content/areas.js');
    const {LANDMARKS} = await import('../src/content/world.js');
    const {FUNCTIONS} = await import('../src/content/meridian.js');
    expect(checkAreas()).toEqual([]);
    FUNCTIONS.forEach(f=>{ expect(LANDMARKS[f.id]).toBeTruthy(); expect(areasOf(f.id).length).toBeGreaterThan(0); });
    expect(areaOfProcess('briefing').id).toBe('econ-brief');
  });
  it('goes in and out a level at a time, and remembers where each level was entered', async ()=>{
    const {store} = await freshStore();
    const {actions, getState} = store;
    actions.chooseRole('builder'); actions.startGuided();
    expect(getState().S).toMatchObject({view:'terrain', world:{level:0, hint:true}});
    actions.worldEnter('econ', {x:.3, y:.4});
    expect(getState().S.world).toMatchObject({level:1, fnId:'econ', dir:1, hint:false});
    actions.worldArea('econ-brief', {x:.6, y:.5});
    expect(getState().S.world).toMatchObject({level:2, areaId:'econ-brief'});
    expect(getState().S.world.origins).toEqual({1:{x:.3, y:.4}, 2:{x:.6, y:.5}});
    actions.worldUp(0);
    expect(getState().S.world).toMatchObject({level:0, fnId:null, areaId:null, dir:-1, from:2});
  });
  it('keeps a route of at most three, which a finished walk leaves', async ()=>{
    const {store} = await freshStore();
    const {actions, getState} = store;
    ['ap','benefitsq','ratevote','helpdesk'].forEach(p=>actions.routeToggle(p));
    expect(getState().J.route).toEqual(['ap','benefitsq','ratevote']);
    actions.routeToggle('benefitsq');
    expect(getState().J.route).toEqual(['ap','ratevote']);
    const st = await import('../src/game/storage.js');
    expect(st.normalJournal({profile:{}, route:['ap', 7, 'x', 'y', 'z']}).route).toEqual(['ap','x','y']);
  });
  it('starts every walk from a clean slate', async ()=>{
    const {store} = await freshStore();
    const {actions, getState} = store;
    actions.chooseRole('builder'); actions.startGuided(); actions.pickProc('ap');
    store.update(d=>{ d.S.compl = {fired:['x'], answers:[1]}; d.S.finishedOnce = true; });
    actions.pickProc('ratevote');
    expect(getState().S).toMatchObject({procId:'ratevote', view:'map', finishedOnce:false, compl:{fired:[], answers:[]}});
  });
});

/* ---------- phase 4: more ground ---------- */
describe('more ground', ()=>{
  it('opens 92 processes in 38 work areas, each area with two or three', async ()=>{
    memoryStorage();
    const {FUNCTIONS} = await import('../src/content/meridian.js');
    const {AREAS, areasOf, checkAreas} = await import('../src/content/areas.js');
    const {validateExpeditions} = await import('../src/content/expeditions.js');
    expect(FUNCTIONS.reduce((n,f)=>n+f.processes.length, 0)).toBe(92);
    expect(Object.values(AREAS).flat().filter(a=>a.processes.length).length).toBe(38);
    FUNCTIONS.forEach(f=>areasOf(f.id).forEach(a=>{ expect(a.processes.length).toBeGreaterThanOrEqual(2); expect(a.processes.length).toBeLessThanOrEqual(3); }));
    expect(checkAreas()).toEqual([]);
    expect(validateExpeditions()).toEqual([]);
  });
  it('gives every process a plan with an honest headline, read the Guide’s way', async ()=>{
    memoryStorage();
    const {FUNCTIONS} = await import('../src/content/meridian.js');
    const {getExpedition} = await import('../src/content/expeditions.js');
    const {planFor, stepEval} = await import('../src/game/flow.js');
    const {expertBand} = await import('../src/engine/engine.js');
    FUNCTIONS.forEach(f=>f.processes.forEach(p=>{
      const e = getExpedition(p.id), S = {mode:'guided', procId:p.id, steps:e.steps, ans:{}, whatif:{}, includeDesc:false};
      e.steps.forEach(st=>{ S.ans[st.id] = {shape:st.expert.shape, input:st.expert.input, rep:st.expert.rep, stakes:st.expert.stakes, band:expertBand(st), cap:st.expertPick, auto:st.autoBest, where:'office', builder:'team', sens:'internal', revealed:true}; });
      const plan = planFor(S), verdicts = e.steps.map(st=>stepEval(S, st).verdict);
      const nothing = verdicts.every(v=>v==='small' || v==='park');
      expect(/^Nothing here/.test(plan.headline), `${p.id}: ${verdicts.join(',')} -> ${plan.headline}`).toBe(nothing);
    }));
  });
});

/* ---------- phase 5: the quick read ---------- */
describe('the quick read', ()=>{
  const call = (actions, getState, pick)=>getState().S.steps.forEach((st, i)=>{
    const p = pick(st); actions.quickCall(i, 'shape', p.shape); actions.quickCall(i, 'band', p.band); if(p.cap) actions.quickCall(i, 'cap', p.cap); if(p.auto) actions.quickCall(i, 'auto', p.auto); });
  it('is the default except for the Builder lens, and old walks resume as full reads', async ()=>{
    let {store} = await freshStore();
    store.actions.chooseRole('steward'); store.actions.startGuided(); store.actions.pickProc('ap');
    expect(store.getState().S.read).toBe('quick');
    ({store} = await freshStore());
    store.actions.chooseRole('builder'); store.actions.startGuided(); store.actions.pickProc('ap');
    expect(store.getState().S.read).toBe('full');
    ({store} = await freshStore({gw_journal_v4:JSON.stringify({marks:{}, walks:[], maps:{}, profile:{role:'steward', xp:10},
      progress:{ap:{procId:'ap', ans:{'ap-1':{shape:'extract'}}, dug:{}, cur:0, updated:1}}})}));
    store.actions.resumeWalk('ap');
    expect(store.getState().S.read).toBe('full');
  });
  it('gives the facts, suggests a capability, and scores only the calls made', async ()=>{
    const {store} = await freshStore();
    const {actions, getState} = store;
    actions.chooseRole('steward'); actions.startGuided(); actions.pickProc('ap');
    const st = getState().S.steps[0];
    actions.quickCall(0, 'shape', 'extract'); actions.quickCall(0, 'band', 'core');
    let a = getState().S.ans[st.id];
    expect(a).toMatchObject({input:st.expert.input, rep:st.expert.rep, stakes:st.expert.stakes, cap:'extract', _capAuto:true, where:'office', builder:'unsure', sens:'internal'});
    actions.quickCall(0, 'band', 'none');
    expect(getState().S.ans[st.id].cap).toBe('rules');            // follows the LLM call until the player picks one
    actions.quickCall(0, 'cap', 'fix');
    a = getState().S.ans[st.id];
    expect(a._capAuto).toBe(false); expect(a.auto).toBeUndefined();  // a process fix has no autonomy call
    const {scoredQs, quickCalled} = await import('../src/game/flow.js');
    expect(quickCalled(a)).toBe(true);
    expect(scoredQs(a).map(q=>q.k)).toEqual(['shape','band','cap']);  // the player chose the capability, so it counts
    actions.quickCall(0, 'band', 'core'); actions.quickCall(0, 'auto', 'review');
    a = getState().S.ans[st.id];
    expect(a._capAuto).toBe(true); expect(a.cap).not.toBe('fix');      // a fix is not an LLM capability, so the suggestion returns
    expect(scoredQs(a).map(q=>q.k)).toEqual(['shape','band','auto']);
    actions.quickCall(0, 'cap', 'summarize');
    expect(scoredQs(getState().S.ans[st.id]).map(q=>q.k)).toEqual(['shape','band','cap','auto']);
  });
  it('compares the whole process at once, then meets one complication before the plan', async ()=>{
    const {store} = await freshStore();
    const {actions, getState} = store;
    actions.chooseRole('steward'); actions.startGuided(); actions.pickProc('ap');
    actions.quickCompare();
    expect(getState().S.steps.some(st=>(getState().S.ans[st.id]||{}).revealed)).toBe(false);   // not until every step has its calls
    call(actions, getState, ()=>({shape:'extract', band:'core', auto:'review'}));
    actions.quickCompare();
    const S = getState().S;
    expect(S.steps.every(st=>S.ans[st.id].revealed)).toBe(true);
    const P = getState().J.profile;
    expect(P.skills.shape.n).toBe(S.steps.length); expect(P.skills.input).toBeUndefined(); expect(P.skills.cap).toBeUndefined();
    actions.nextStep();
    expect(getState().S.modal && getState().S.modal.type).toBe('compl');
    actions.complChoose(0); actions.complContinue();
    expect(getState().S.compl.fired.length).toBe(1);
    expect(getState().S.view).toBe('finished');
    expect(getState().J.walks[0]).toMatchObject({procId:'ap', read:'quick'});
  });
  it('compares a finished route and says where to start', async ()=>{
    const {store} = await freshStore();
    const {actions, getState} = store;
    const {routeSummary} = await import('../src/game/flow.js');
    actions.chooseRole('steward'); actions.routeToggle('ap'); actions.routeToggle('ratevote'); actions.toPick();
    expect(getState().J.routeRun.pids).toEqual(['ap','ratevote']);
    const walk = pid=>{ actions.pickProc(pid); call(actions, getState, st=>({shape:st.expert.shape, band:'core', auto:'review'})); actions.quickCompare(); actions.nextStep();
      if(getState().S.modal){ actions.complChoose(0); actions.complContinue(); } };
    walk('ap');
    expect(routeSummary(getState().J).complete).toBe(false);
    walk('ratevote');
    const sum = routeSummary(getState().J);
    expect(sum.complete).toBe(true);
    expect(sum.rows.map(r=>r.pid)).toEqual(['ap','ratevote']);        // invoices have the stronger case than the rate decision
    expect(sum.first.start.verdict).toBeTruthy();
  });
});
