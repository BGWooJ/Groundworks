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
