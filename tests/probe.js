/* =====================================================================
   PROBE: runs the decision engine over every Meridian step and a large,
   seeded sample of answer combinations, and returns a compact record of
   what it decided. The same probe runs against the v4 code (to make the
   golden fixture) and against the current modules (in the test), so any
   change to scoring shows up as a diff.
   ===================================================================== */
export function probe(api, pids){
  const {FUNCTIONS, getExpedition, expertBand, fieldVerdict, scoreTools, processHeading,
    verdictOf, valueOf, feasOf, challengesOf, numbersOf, numbersSentence, suggestGuardrails,
    SHAPES, INPUTS, REPS, STAKES, BANDS, BAND_CAPS, AUTONOMY, WHERE, BUILDERS, SENSITIVITY, REWORK} = api;

  const ids = pids || [].concat(...FUNCTIONS.map(f=>f.processes.map(p=>p.id)));
  const toolKey = t=> t ? `${t.winner}/${t.runnerUp||'-'}` : 'null';
  const out = {pids:ids, processes:{}, grid:[], numbers:[]};

  ids.forEach(pid=>{
    const exp = getExpedition(pid);
    const steps = exp.steps.map(st=>{
      const base = {shape:st.expert.shape, input:st.expert.input, rep:st.expert.rep, stakes:st.expert.stakes,
        band:expertBand(st), cap:st.expertPick, auto:st.autoBest};
      const combos = [];
      WHERE.forEach(w=>BUILDERS.forEach(b=>SENSITIVITY.forEach(s=>{
        combos.push(toolKey(scoreTools(Object.assign({}, base, {where:w.id, builder:b.id, sens:s.id}))));
      })));
      return {id:st.id, band:base.band, verdict:fieldVerdict(st), tools:combos.join(' '),
        guard:suggestGuardrails(base, base.cap).join(',')};
    });
    const res = exp.steps.map((st,i)=>({index:i, tool:scoreTools({shape:st.expert.shape, input:st.expert.input, rep:st.expert.rep,
      stakes:st.expert.stakes, band:expertBand(st), cap:st.expertPick, auto:st.autoBest, where:'office', builder:'team', sens:'internal'})}));
    const h = processHeading(res);
    out.processes[pid] = {name:exp.name, n:exp.steps.length, steps, heading:{leaders:h.leaders, rising:h.rising, by:h.by}};
  });

  // Seeded sample of answer combinations through value, feasibility, verdict, tools and challenges.
  let seed = 20261012;
  const rnd = ()=>{ seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const pick = list=>list[Math.floor(rnd()*list.length)];
  const PERS = ['day','week','month','year'];
  for(let i=0;i<4000;i++){
    const band = pick(BANDS).id;
    const a = {shape:pick(SHAPES).id, input:pick(INPUTS).id, rep:pick(REPS).id, stakes:pick(STAKES).id,
      band, cap:pick(BAND_CAPS[band]), auto:pick(AUTONOMY).id, where:pick(WHERE).id, builder:pick(BUILDERS).id, sens:pick(SENSITIVITY).id};
    let n = null;
    if(rnd()<0.6){
      n = {count:String(Math.round(rnd()*900)), per:pick(PERS), minutes:String(pick([2,5,15,30,60,240])), people:rnd()<0.5 ? String(1+Math.floor(rnd()*12)) : ''};
      if(rnd()<0.5){ n.rework = pick(REWORK).id; a.rework = n.rework; }
    }
    const nums = numbersOf(n), value = valueOf(a, nums), feas = feasOf(a);
    const t = scoreTools(a);
    out.grid.push([value, feas, verdictOf(a, value, feas), toolKey(t),
      t ? Object.keys(t.scores).map(k=>t.scores[k]).join(',') : '',
      challengesOf(a, nums).map(c=>c.q).join(','), suggestGuardrails(a, a.cap).join(',')].join('|'));
  }

  [[{count:'300',per:'month',minutes:'5'}],[{count:'12',per:'week',minutes:'60',rework:'quarter',people:'4'}],
   [{count:'2',per:'year',minutes:'240'}],[{count:'40',per:'day',minutes:'15',rework:'half',people:'3'}],[{count:'0',minutes:'5'}]]
    .forEach(([n])=>{ const r = numbersOf(n); out.numbers.push(r ? numbersSentence(r) : 'null'); });

  return out;
}
