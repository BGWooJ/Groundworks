/* =====================================================================
   STORAGE (v8): the one place the game saves and loads.
   - this browser: local storage, read and written on every change
   - a save link: the whole journal, compressed into the part of a link
     after "#", which browsers never send to the website
   - a save file: the same journal as a file
   Sign-in storage could be added here later without touching the game.
   ===================================================================== */
import {blankStats} from './rpg.js';

export const KEYS = {journal:'gw_journal_v4', old:['gw_journal_v1'], settings:'gw_settings_v5', guide:'gw_guide'};

export function read(key){ try{ return localStorage.getItem(key); }catch(e){ return null; } }
export function write(key, v){ try{ localStorage.setItem(key, v); }catch(e){ /* private mode: play on without saving */ } }
export function remove(key){ try{ localStorage.removeItem(key); }catch(e){} }

export function blankProfile(){ return {role:null, xp:0, stats:blankStats(), skills:{}, families:{}, codex:{}, exported:{}, walks:0, complications:0, strong:0, seen:{}, unseen:{marks:[], reports:[], rank:null}}; }
export function blankJournal(){ return {marks:{}, flagships:[], walks:[], maps:{}, progress:{}, profile:blankProfile()}; }

const isObj = x=>!!x && typeof x==='object' && !Array.isArray(x);
/* Copy plain data only, dropping keys that could change how objects behave. A save link can come from
   anyone, so nothing in it is trusted. */
function plain(x, depth){
  if(depth>12) return null;
  if(Array.isArray(x)) return x.map(v=>plain(v, depth+1));
  if(isObj(x)){ const out = {}; for(const k of Object.keys(x)){ if(k==='__proto__' || k==='constructor' || k==='prototype') continue; out[k] = plain(x[k], depth+1); } return out; }
  return (typeof x==='string' || typeof x==='number' || typeof x==='boolean' || x===null) ? x : null;
}

/* A journal from this browser, a link or a file, filled out to today's shape. Anything that is not a
   journal at all is refused; damaged entries inside one are dropped rather than allowed to break a screen. */
export function normalJournal(raw){
  const j = plain(raw, 0);
  if(!isObj(j) || !isObj(j.profile)) throw new Error('not-a-journal');
  const out = Object.assign(blankJournal(), j);
  out.profile = Object.assign(blankProfile(), j.profile);
  out.profile.stats = Object.assign(blankStats(), isObj(out.profile.stats) ? out.profile.stats : {});
  out.profile.unseen = Object.assign({marks:[], reports:[], rank:null}, isObj(out.profile.unseen) ? out.profile.unseen : {});
  ['skills','families','codex','exported','seen'].forEach(k=>{ if(!isObj(out.profile[k])) out.profile[k] = {}; });
  if(!isObj(out.marks)) out.marks = {};
  if(!Array.isArray(out.flagships)) out.flagships = [];
  out.walks = Array.isArray(out.walks) ? out.walks.filter(isObj) : [];
  out.maps = isObj(out.maps) ? Object.fromEntries(Object.entries(out.maps).filter(([,m])=>isObj(m) && Array.isArray(m.steps) && m.steps.every(isObj))) : {};
  out.progress = isObj(out.progress) ? Object.fromEntries(Object.entries(out.progress).filter(([,p])=>isObj(p) && typeof p.procId==='string')) : {};
  return out;
}
export function loadJournal(){
  try{ const j = JSON.parse(read(KEYS.journal) || 'null'); return j ? normalJournal(j) : blankJournal(); }
  catch(e){ return blankJournal(); }
}
export function saveJournal(J){ write(KEYS.journal, JSON.stringify(J)); }
export function clearJournal(){ remove(KEYS.journal); KEYS.old.forEach(remove); }

/* ---------- save links ---------- */
const PREFIX = 'gw1';
const MAX_BYTES = 4e6;   // refuse anything that unpacks to more than this

function toB64url(bytes){
  let s = ''; for(let i=0;i<bytes.length;i+=0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i+0x8000));
  return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function fromB64url(t){
  const s = atob(t.replace(/-/g,'+').replace(/_/g,'/') + '==='.slice((t.length+3)%4));
  const out = new Uint8Array(s.length); for(let i=0;i<s.length;i++) out[i] = s.charCodeAt(i); return out;
}
async function through(bytes, stream){
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader(), parts = []; let n = 0;
  for(;;){ const {done, value} = await reader.read(); if(done) break; n += value.length; if(n>MAX_BYTES){ reader.cancel(); throw new Error('too-big'); } parts.push(value); }
  const out = new Uint8Array(n); let at = 0; parts.forEach(p=>{ out.set(p, at); at += p.length; }); return out;
}
const canZip = ()=>typeof CompressionStream!=='undefined' && typeof DecompressionStream!=='undefined';

/* The journal as the text that follows "#save=" in a link. Compressed where the browser can. */
export async function packJournal(J){
  const bytes = new TextEncoder().encode(JSON.stringify({v:1, at:Date.now(), J}));
  if(canZip()) return `${PREFIX}.d.${toB64url(await through(bytes, new CompressionStream('deflate-raw')))}`;
  return `${PREFIX}.j.${toB64url(bytes)}`;
}
/* Find the save inside whatever was pasted: a whole link, the part after "#save=", or the bare code,
   with any spaces or line breaks an email added. */
export function saveCodeOf(text){
  const t = String(text||'').replace(/\s+/g,'');
  const m = /(?:#save=)?(gw1\.[dj]\.[A-Za-z0-9_-]+)/.exec(t);
  return m ? m[1] : null;
}
export async function unpackJournal(text){
  const code = saveCodeOf(text); if(!code) throw new Error('no-code');
  const [, kind, body] = code.split('.');
  let bytes;
  try{ bytes = fromB64url(body); }catch(e){ throw new Error('damaged'); }
  if(kind==='d'){
    if(!canZip()) throw new Error('old-browser');
    try{ bytes = await through(bytes, new DecompressionStream('deflate-raw')); }catch(e){ throw new Error(e.message==='too-big' ? 'too-big' : 'damaged'); }
  }
  if(bytes.length>MAX_BYTES) throw new Error('too-big');
  let env; try{ env = JSON.parse(new TextDecoder().decode(bytes)); }catch(e){ throw new Error('damaged'); }
  if(!isObj(env) || env.v!==1) throw new Error('damaged');
  return {J:normalJournal(env.J), at:typeof env.at==='number' ? env.at : null};
}
export function saveLinkOf(code, loc){
  const l = loc || (typeof location!=='undefined' ? location : {origin:'', pathname:'/'});
  return `${l.origin}${l.pathname}#save=${code}`;
}
/* The save in the address bar when the game opens, if any. */
export function saveCodeInAddress(){
  try{ return /^#save=/.test(location.hash) ? location.hash : null; }catch(e){ return null; }
}
export function clearAddress(){ try{ history.replaceState(null, '', location.pathname + location.search); }catch(e){} }

/* ---------- save files ---------- */
export function progressFile(J){
  const day = new Date().toISOString().slice(0,10);
  return {name:`groundwork-progress-${day}.json`, text:JSON.stringify({source:'Groundwork', kind:'progress', version:8, saved:new Date().toISOString(), journal:J}, null, 1)};
}
/* A file from "Save my progress" or a v7 "Save map file": which kind it is, and its contents. */
export function readSaveFile(text){
  let f; try{ f = JSON.parse(text); }catch(e){ throw new Error('not-groundwork'); }
  if(!isObj(f) || f.source!=='Groundwork') throw new Error('not-groundwork');
  if(f.kind==='progress') return {kind:'progress', J:normalJournal(f.journal), at:Date.parse(f.saved) || null};
  if(f.kind==='map') return {kind:'map', text};
  throw new Error('not-groundwork');
}

/* Why a save could not be opened, in words a player can act on. */
export const SAVE_ERRORS = {
  'no-code':'That is not a save link. A save link ends in “#save=” followed by a long code.',
  'damaged':'This save link is incomplete. It may have been cut off when it was copied or emailed. Copy the whole link again, or use the save file.',
  'too-big':'This save is larger than any real one, so it was not opened.',
  'old-browser':'This browser is too old to open a save link. Open it in an up-to-date browser, or use the save file.',
  'not-a-journal':'This does not hold Groundwork progress.',
  'not-groundwork':'That file is not a Groundwork save. Use a file made with “Save progress” or “Save map file”.',
};
export function saveError(e){ return SAVE_ERRORS[e && e.message] || SAVE_ERRORS.damaged; }
