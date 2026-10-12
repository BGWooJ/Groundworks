/* =====================================================================
   RPG LAYER: roles (lenses), ranks, experience, standing and mastery.
   Every element here either changes what you see when you decide or
   explains a decision you made. Nothing decorates.
   ===================================================================== */

/* Roles change the lens, not the difficulty. Every lens is open to every
   role; your role decides which one opens first and which complications
   you are most likely to meet. */
export const ROLES = [
  {id:'practitioner', name:'Practitioner', level:'People who do the work',
   d:'You know where the work really hurts, and what would change for the person at the desk.',
   lens:'floor', lensName:'From the floor', perk:'Both field notes open on every step, and you see what changes for the person doing the work.'},
  {id:'steward', name:'Steward', level:'Team leads and managers',
   d:'You own a team’s results. You need the first move, who to involve and how to measure it.',
   lens:'team', lensName:'Team view', perk:'Every verdict comes with the first move, who to involve and the measure, up front.'},
  {id:'sponsor', name:'Sponsor', level:'Executives',
   d:'You decide where the Bank invests. You need value, feasibility and the case for it.',
   lens:'portfolio', lensName:'Portfolio view', perk:'Every step lands on the value and feasibility grid, with its value hypothesis.'},
  {id:'builder', name:'Builder', level:'Builders and IT',
   d:'You make it real. You need the tool, the data and the guardrails.',
   lens:'build', lensName:'Build view', perk:'Every step shows how each approved tool scored, the data needed and the guardrails.'},
];
export function roleOf(id){ return ROLES.find(r=>r.id===id) || null; }

/* Ranks, by experience. A cartographer's career. */
export const RANKS = [
  {xp:0,    name:'Apprentice Surveyor'},
  {xp:150,  name:'Surveyor'},
  {xp:400,  name:'Pathfinder'},
  {xp:800,  name:'Cartographer'},
  {xp:1400, name:'Wayfinder'},
  {xp:2200, name:'Master Cartographer'},
];
export function rankOf(xp){
  let i = 0; RANKS.forEach((r,k)=>{ if(xp>=r.xp) i = k; });
  const cur = RANKS[i], next = RANKS[i+1] || null;
  return {index:i, name:cur.name, xp, floor:cur.xp, next:next ? next.xp : null, nextName:next ? next.name : null,
    pct: next ? (xp-cur.xp)/(next.xp-cur.xp) : 1};
}

/* Experience is earned for reading well and judging well, not for clicking. */
export const XP = {
  match:10, near:5,          // per scored answer on a Meridian step, after comparing with the field
  dig:5,                     // hearing from the floor
  strong:25, workable:10,    // complication answers
  walk:50,                   // finishing a Meridian walk
  ownStep:15, ownMap:50,     // reading a step of your own process, finishing your own map
  report:10,                 // meeting a Field Report for the first time
  export:20,                 // taking a map further, once per map
};

/* Standing: four stats moved by complications. 10 is neutral. */
export const STATS = [
  {id:'cred',  name:'Credibility', d:'How leadership rates your judgment.', icon:'cred'},
  {id:'rigor', name:'Rigour',      d:'How sound your method is.',           icon:'rigor'},
  {id:'trust', name:'Trust',       d:'How the people doing the work see you.', icon:'trust'},
  {id:'weeks', name:'Time in hand', d:'Weeks of slack in your plan. Spending it is sometimes right.', icon:'weeks'},
];
export const STAT_BASE = 10, STAT_MAX = 20;
export function blankStats(){ return {cred:STAT_BASE, rigor:STAT_BASE, trust:STAT_BASE, weeks:STAT_BASE}; }
export function applyStats(stats, d){
  const out = Object.assign({}, stats);
  Object.keys(d||{}).forEach(k=>{ if(k in out) out[k] = Math.max(0, Math.min(STAT_MAX, out[k] + d[k])); });
  return out;
}

/* What the sponsor says at the end of a walk, from how the walk's standing moved. */
export function standingLine(delta){
  const d = delta || {}, sum = (d.cred||0)+(d.rigor||0)+(d.trust||0);
  if(sum>=4) return 'Your sponsor is impressed: you kept the method intact under pressure, and people on the floor are with you.';
  if((d.rigor||0)<=-2) return 'Your sponsor is uneasy. Some of the calls you made under pressure will be hard to defend when the results come in.';
  if((d.trust||0)<=-2) return 'The work holds up, but the people who do it are wary of you. That will matter at rollout.';
  if((d.cred||0)<=-2) return 'Sound method, but leadership is losing patience. Find a smaller, sooner result to show.';
  return 'A steady walk. Nothing you did under pressure will come back to bite you.';
}

/* Mastery: how often your reads match the field, by question and by capability family. */
export const SKILLS = [
  {k:'shape', name:'Reading the work'}, {k:'input', name:'Reading the inputs'}, {k:'rep', name:'Sizing the volume'},
  {k:'stakes', name:'Weighing the stakes'}, {k:'band', name:'Calling LLM fit'}, {k:'cap', name:'Matching capability'}, {k:'auto', name:'Setting autonomy'},
];
export function skillLevel(rec){
  if(!rec || !rec.n) return {pct:null, stars:0};
  const pct = rec.pts / rec.n;
  return {pct, stars: rec.n<3 ? 0 : (pct>=0.85 ? 3 : (pct>=0.65 ? 2 : (pct>=0.4 ? 1 : 0)))};
}
