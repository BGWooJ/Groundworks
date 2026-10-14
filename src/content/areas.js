/* =====================================================================
   WORK AREAS (v8): the level between a division and its processes.
   Each division groups its work into the areas its people would name.
   A process belongs to exactly one area; FUNCTIONS[].processes in
   meridian.js and districts.js stays the master list of processes.
   An area with no processes yet is hidden on the map.
   ===================================================================== */
import {FUNCTIONS} from './meridian.js';

export const AREAS = {
  econ:[
    {id:'econ-forecast', name:'Forecasting', icon:'threshold', d:'Models and the forecast round: where the numbers behind each meeting come from.', processes:[]},
    {id:'econ-brief',    name:'Policy meeting briefings', icon:'doc', d:'The memo, the charts and the questions the president will face at each rate-setting meeting.', processes:['briefing','ratevote']},
    {id:'econ-region',   name:'Regional intelligence', icon:'interview', d:'What business contacts across the district are seeing, gathered and summarised before the data shows it.', processes:['beigebook']},
  ],
  research:[
    {id:'res-data',      name:'Data management', icon:'logging', d:'The research data sets: brought in, cleaned, documented and kept current.', processes:['datacleaning']},
    {id:'res-support',   name:'Research support', icon:'book', d:'Finding and checking the published work behind each question.', processes:['litreview']},
    {id:'res-requests',  name:'Requests & surveys', icon:'send', d:'Series, methods and survey answers asked for by people outside the Bank.', processes:['datareq']},
  ],
  facilities:[
    {id:'fac-maint',     name:'Maintenance', icon:'gear', d:'Nine thousand work orders a year across three buildings, from a dripping tap to a failed chiller.', processes:['workorders']},
    {id:'fac-plant',     name:'Energy & plant', icon:'spark', d:'The chillers, boilers and power that keep the vault and the data halls running.', processes:['energy']},
    {id:'fac-space',     name:'Space', icon:'map', d:'Who sits where, what gets renovated, and how the buildings are used.', processes:['spaceplan']},
  ],
  events:[
    {id:'ev-internal',   name:'Internal events', icon:'notes', d:'Meetings, conferences and gatherings booked, staffed and cleared with security.', processes:['eventreq']},
    {id:'ev-public',     name:'Public programmes', icon:'user', d:'Tours, school visits and the visitor centre: the Bank open to the public.', processes:['tours']},
  ],
  police:[
    {id:'pol-access',    name:'Access', icon:'privacy', d:'Every person and package that enters the buildings, identified and cleared.', processes:['screening']},
    {id:'pol-incidents', name:'Incidents', icon:'escalation', d:'What happened, written down, classified and reviewed.', processes:['incidents']},
    {id:'pol-ready',     name:'Readiness', icon:'weeks', d:'One hundred and ninety officers, rostered and trained for every post.', processes:['shifts']},
  ],
  it:[
    {id:'it-desk',       name:'Service desk', icon:'interview', d:'Requests for help, triaged, solved or passed on.', processes:['helpdesk']},
    {id:'it-access',     name:'Access & security', icon:'privacy', d:'Who can use which system, granted, reviewed and removed.', processes:['accessreview']},
    {id:'it-change',     name:'Change & planning', icon:'route', d:'What the Bank builds, buys and retires over the next three years.', processes:['roadmap']},
  ],
  hr:[
    {id:'hr-advice',     name:'Advice', icon:'book', d:'Answers on leave, travel, conduct and pay policy for 2,400 staff.', processes:['policyq']},
    {id:'hr-hiring',     name:'Hiring', icon:'user', d:'Roles posted, applicants screened, people chosen and brought in.', processes:['recruit']},
    {id:'hr-perf',       name:'Performance & learning', icon:'rigor', d:'Goals, feedback, reviews and the training that follows them.', processes:['perf']},
  ],
  benefits:[
    {id:'ben-inquiries', name:'Inquiries & enrolment', icon:'interview', d:'Questions answered, documents checked and elections made.', processes:['benefitsq']},
    {id:'ben-pensions',  name:'Pensions', icon:'shieldup', d:'Retirees’ addresses, beneficiaries and payments, changed correctly.', processes:['retiree']},
    {id:'ben-billing',   name:'Billing & changes', icon:'check', d:'Carrier bills matched to who is actually enrolled.', processes:['vendorrecon']},
  ],
  supervision:[
    {id:'sup-exams',     name:'Examinations', icon:'sampling', d:'Examinations of supervised banks, from scoping to findings.', processes:['examprep']},
    {id:'sup-consumer',  name:'Consumer protection', icon:'trust', d:'Complaints from the public about the banks the Bank supervises.', processes:['complaints']},
    {id:'sup-reports',   name:'Reports & applications', icon:'doc', d:'What banks file each quarter, and what they ask permission to do.', processes:['callreport']},
  ],
  cashops:[
    {id:'cash-payments', name:'Payments', icon:'send', d:'Payments that went wrong, traced across systems and put right.', processes:['payexceptions']},
    {id:'cash-currency', name:'Currency', icon:'check', d:'Notes and coin received, inspected and ordered by the banks.', processes:['currency']},
    {id:'cash-resilience', name:'Resilience', icon:'shieldup', d:'Keeping payments and cash running when something fails.', processes:['continuity']},
  ],
  finance:[
    {id:'fin-payables',  name:'Payables', icon:'doc', d:'Supplier invoices captured, matched and paid, and bad payments stopped.', processes:['ap']},
    {id:'fin-procure',   name:'Procurement', icon:'judge', d:'What the Bank buys, from whom, and on what terms.', processes:['procure']},
    {id:'fin-controls',  name:'Budgets & controls', icon:'sampling', d:'Spending checked against policy and against the plan.', processes:['travel']},
  ],
  outreach:[
    {id:'out-relations', name:'Relationships', icon:'user', d:'The people the Bank talks to, and a record of every conversation.', processes:['crm']},
    {id:'out-media',     name:'Media & public', icon:'interview', d:'Questions from the press and the public, sorted and answered.', processes:['inquiries']},
    {id:'out-pubs',      name:'Publications', icon:'book', d:'Reports, speeches and the website, edited, translated and made accessible.', processes:['publications']},
  ],
  legal:[
    {id:'leg-records',   name:'Records', icon:'logging', d:'Public records requests answered, and records kept for as long as the law says.', processes:['records']},
    {id:'leg-audit',     name:'Audit', icon:'sampling', d:'Controls tested, findings written and followed up.', processes:['audit']},
    {id:'leg-policy',    name:'Policy & ethics', icon:'rigor', d:'The rules staff work by, kept current and attested to each year.', processes:['policylib']},
  ],
};

/* The areas a player can open: those with at least one process. */
export function areasOf(fnId){ return (AREAS[fnId] || []).filter(a=>a.processes.length); }
export function areaById(id){ for(const fn of Object.keys(AREAS)){ const a = AREAS[fn].find(x=>x.id===id); if(a) return Object.assign({fnId:fn}, a); } return null; }
export function areaOfProcess(pid){ for(const fn of Object.keys(AREAS)){ const a = AREAS[fn].find(x=>x.processes.includes(pid)); if(a) return Object.assign({fnId:fn}, a); } return null; }

/* Every process belongs to exactly one area of its own division. Returns the problems found. */
export function checkAreas(){
  const problems = [], seen = {};
  FUNCTIONS.forEach(f=>{
    if(!AREAS[f.id]) problems.push(`${f.id}: no work areas`);
    f.processes.forEach(p=>{
      const owners = (AREAS[f.id] || []).filter(a=>a.processes.includes(p.id));
      if(owners.length!==1) problems.push(`${p.id}: in ${owners.length} areas of ${f.id}, expected 1`);
    });
  });
  Object.entries(AREAS).forEach(([fn, list])=>{
    const f = FUNCTIONS.find(x=>x.id===fn); if(!f){ problems.push(`${fn}: areas for an unknown division`); return; }
    list.forEach(a=>a.processes.forEach(pid=>{
      if(!f.processes.some(p=>p.id===pid)) problems.push(`${a.id}: ${pid} is not a process of ${fn}`);
      if(seen[pid]) problems.push(`${pid}: in more than one area`); seen[pid] = true;
    }));
  });
  return problems;
}
