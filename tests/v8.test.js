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
