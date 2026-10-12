/* =====================================================================
   SOUND: small synthesised cues, made in the browser with Web Audio.
   No audio files, nothing downloaded. Off by default; the player turns it
   on from the top bar. The audio context is only created after the player
   turns sound on, which is also the user gesture browsers require.
   ===================================================================== */
let ctx = null, master = null, enabled = false, volume = 0.6;

function ensure(){
  if(ctx) return ctx;
  const AC = typeof window!=='undefined' && (window.AudioContext || window.webkitAudioContext);
  if(!AC) return null;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = volume * 0.5; master.connect(ctx.destination);
  return ctx;
}
export function setSound(on, vol){
  enabled = !!on;
  if(vol!=null) volume = vol;
  if(enabled){ const c = ensure(); if(c && c.state==='suspended') c.resume(); }
  if(master) master.gain.value = volume * 0.5;
}
export function soundOn(){ return enabled; }

/* A soft tone with a quick attack and a natural decay. */
function tone(freq, {at=0, dur=0.18, type='sine', gain=0.5, glide=null, attack=0.006}={}){
  const c = ctx, t = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if(glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
/* Filtered noise: paper, stamps, footsteps. */
function noise({at=0, dur=0.12, freq=1800, q=0.8, gain=0.35, type='bandpass', sweep=null}={}){
  const c = ctx, t = c.currentTime + at;
  const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), data = buf.getChannelData(0);
  for(let i=0;i<len;i++) data[i] = (Math.random()*2-1) * (1 - i/len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if(sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}

const N = {C4:261.63, D4:293.66, E4:329.63, G4:392, A4:440, C5:523.25, D5:587.33, E5:659.25, G5:783.99, A5:880, C6:1046.5};

const CUES = {
  tap:    ()=>{ noise({dur:0.04, freq:2400, gain:0.18}); },
  select: ()=>{ tone(N.G5, {dur:0.09, type:'triangle', gain:0.25}); noise({dur:0.03, freq:3000, gain:0.12}); },
  page:   ()=>{ noise({dur:0.28, freq:900, sweep:2600, q:0.6, gain:0.22}); },
  match:  ()=>{ tone(N.E5, {dur:0.16, type:'triangle', gain:0.32}); tone(N.A5, {at:0.08, dur:0.22, type:'triangle', gain:0.3}); },
  near:   ()=>{ tone(N.D5, {dur:0.2, type:'triangle', gain:0.26}); },
  miss:   ()=>{ tone(N.A4/2, {dur:0.22, type:'sine', gain:0.35, glide:N.A4/2.4}); },
  stamp:  ()=>{ noise({dur:0.09, freq:400, q:0.7, gain:0.5, type:'lowpass'}); tone(110, {dur:0.12, gain:0.3}); },
  reveal: ()=>{ [N.C5, N.E5, N.G5, N.C6].forEach((f,i)=>tone(f, {at:i*0.07, dur:0.3, type:'triangle', gain:0.22})); },
  xp:     ()=>{ tone(N.C6, {dur:0.12, type:'sine', gain:0.16}); tone(N.G5*2, {at:0.05, dur:0.16, type:'sine', gain:0.12}); },
  flag:   ()=>{ tone(N.D5, {dur:0.12, type:'triangle', gain:0.25}); tone(N.G5, {at:0.06, dur:0.14, type:'triangle', gain:0.2}); },
  unflag: ()=>{ tone(N.G4, {dur:0.12, type:'triangle', gain:0.2}); },
  mark:   ()=>{ [N.G4, N.C5, N.E5, N.G5].forEach((f,i)=>tone(f, {at:i*0.09, dur:i===3?0.5:0.16, type:'triangle', gain:0.26})); },
  levelup:()=>{ [N.C5, N.E5, N.G5, N.C6].forEach((f,i)=>tone(f, {at:i*0.08, dur:0.18, type:'triangle', gain:0.24}));
                [N.C5, N.E5, N.G5].forEach(f=>tone(f, {at:0.36, dur:0.9, type:'sine', gain:0.18})); },
  encounter:()=>{ tone(N.A4/4, {dur:1.1, type:'sine', gain:0.3}); tone(N.E5, {at:0.15, dur:0.8, type:'sine', gain:0.12}); },
  good:   ()=>{ tone(N.C5, {dur:0.14, type:'triangle', gain:0.26}); tone(N.G5, {at:0.1, dur:0.32, type:'triangle', gain:0.26}); },
  bad:    ()=>{ tone(N.E4, {dur:0.2, type:'triangle', gain:0.24}); tone(N.C4, {at:0.12, dur:0.3, type:'triangle', gain:0.24}); },
  finish: ()=>{ [N.C5, N.D5, N.E5, N.G5, N.C6].forEach((f,i)=>tone(f, {at:i*0.1, dur:0.35, type:'triangle', gain:0.22})); },
};

export function play(name){
  if(!enabled || !CUES[name]) return;
  if(!ensure()) return;
  try{ CUES[name](); }catch(e){ /* sound is never allowed to break the game */ }
}
export const CUE_NAMES = Object.keys(CUES);
