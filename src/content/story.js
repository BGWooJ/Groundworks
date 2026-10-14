/* =====================================================================
   STORY: the light game layer.
   Sponsor, guidance levels, complications (unscored judgment calls with
   feedback), reaction lines, hints, and marks.
   ===================================================================== */
const SPONSOR = {name:'Marion Okafor', role:'First Vice President'};

const GUIDANCE = [
  {id:'ropes', name:'Walk me through it', d:'A pointer opens at every decision.'},
  {id:'stall', name:'Nudge me if I stall', d:'Help opens if you pause, or after a miss.'},
  {id:'ask',   name:'Only when I ask', d:'Hints stay closed until you open them.'},
];

/* Standing effects: what your stats change about the game. */

const EVENT_POOL = [
 {id:'demo', slot:'sponsor', from:'From your sponsor', title:'The demo',
  text:'A senior leader saw a vendor demo last week and now wants \u201ca chatbot for the Bank\u201d live before the leadership meeting. Your sponsor asks you to make it happen.',
  opts:[
   {t:'Start scoping a chatbot this week. Leadership asked for one, and an early win buys room for the rest.', s:0, d:{cred:1, rigor:-2}, flag:'chatbot',
    fb:'A chatbot is a capability, not a use case. Without a process and a step, you will build a front door to nothing in particular. Leadership is pleased, for now.'},
   {t:'Ask which process and which step it should improve, then check whether a chatbot fits that step.', s:2, d:{rigor:1, cred:1},
    fb:'Tools are answers, and you do not have a question yet. Anchor the request to a step in a process, and the right capability may or may not be a chatbot.'},
   {t:'Push back: chatbots have a poor record, and the Bank should not chase a vendor’s demo.', s:0, d:{cred:-2},
    fb:'Some do, in the right place. Dismissing the tool is the same mistake as worshipping it: it skips the work.'}]},
 {id:'brand', slot:'sponsor', from:'In the corridor', title:'The brand name',
  text:'A colleague insists the Bank needs one specific, well-known product. \u201cEvery other institution uses it. Just buy it and move on.\u201d',
  opts:[
   {t:'Buy it. Every peer uses it, so the risk is known, procurement is quick and support is easy to find.', s:0, d:{cred:1, rigor:-2}, flag:'brandFirst',
    fb:'Brands change, get acquired and get outrun. Buying before you know what the step needs makes the tool the requirement.'},
   {t:'Write down what the step must read, decide and produce, then judge that product against it.', s:2, d:{rigor:1, cred:1},
    fb:'The requirement outlives any vendor. It also makes the comparison honest, and it is the thing you can hand to procurement.'},
   {t:'Build in-house instead, so the Bank is never locked into a single supplier’s roadmap.', s:0, d:{cred:-1, rigor:-1},
    fb:'Building is a valid option for some capabilities, but deciding it before you know the requirement is the same error in a different jacket.'}]},
 {id:'peer', slot:'sponsor', from:'From your sponsor', title:'The peer bank',
  text:'Another reserve bank has announced an AI programme with a press release and a target of \u201cforty use cases in a year\u201d. The president\u2019s office asks why the Bank is behind.',
  opts:[
   {t:'Match it with a public target of our own. A number shows ambition and gives the programme a deadline.', s:0, d:{cred:1, rigor:-2}, flag:'forty',
    fb:'A count of use cases is a target for activity. You will find forty, and most will be the easy ones that change nothing.'},
   {t:'Offer a handful of cases from the hotspots you surveyed, each with a baseline and a measure.', s:2, d:{cred:1, rigor:1},
    fb:'Three use cases that move a measured number beat forty that do not. Leadership can defend a result; it cannot defend a count.'},
   {t:'Explain that a count of use cases is the wrong comparison, and carry on with the current plan.', s:1, d:{cred:-1},
    fb:'You may be right, but the question was fair. Answer it with your own plan, or someone else will answer it for you.'}]},

 {id:'paste', slot:'trail', from:'On the floor', title:'The paste',
  text:'One of the {who}, trying to save an afternoon, is about to paste a draft internal document into a public AI tool to tighten the wording.',
  opts:[
   {t:'Let it go this once. It is an early draft, nothing in it is final yet, and the afternoon really matters.', s:0, d:{trust:1, rigor:-2}, flag:'paste',
    fb:'An internal document just left the building. Sensitivity attaches to the information, not to the version.'},
   {t:'Stop it, classify what may leave the Bank, and give the team an approved place for this help.', s:2, d:{rigor:1, trust:1},
    fb:'People route around missing tools. Decide what may leave, what may not, and what may never be seen by a tool at all. Then provide an inside option, or the paste happens again with nobody watching.'},
   {t:'Stop it, and ban outside AI tools for the whole team until a formal policy is written.', s:1, d:{trust:-2},
    fb:'It closes one door and teaches nothing. The need is real; the answer is an approved way to meet it.'}]},
 {id:'workaround', slot:'trail', from:'On the floor', title:'The workaround',
  text:'Digging into a step, you find it exists because two systems do not share a field. One of the {who} has re-keyed the same information every day for six years.',
  opts:[
   {t:'Automate the re-keying with an agent. The team gets relief in weeks, not after a systems project.', s:1, d:{trust:1},
    fb:'It works, and sometimes it is the pragmatic bridge. But you have bought a tool to preserve a defect. Note the real fix and a date to make it.'},
   {t:'Get both system owners in a room to make the field flow through, then see what work is left.', s:2, d:{rigor:1, cred:1, weeks:-1},
    fb:'Remove the cause and the step may vanish. It costs you a week to get the system owners in a room, and it is worth it. Automating a broken process only makes it break faster.'},
   {t:'Add a second person to check the re-keying, since errors here have caused problems before.', s:0, d:{trust:-1, cred:-1},
    fb:'Now two people preserve the defect.'}]},
 {id:'shadow', slot:'trail', from:'On the floor', title:'The shadow tool',
  text:'One of the {who} has built a spreadsheet full of macros that does a good part of this work. It is undocumented, runs on one laptop, and the team loves it.',
  opts:[
   {t:'Shut it down. It is undocumented, runs on one laptop, and the Bank cannot support what it cannot see.', s:0, d:{trust:-2},
    fb:'It is a risk, and it is also the best requirements document you will ever get. Shutting it down tells the team that initiative is punished.'},
   {t:'Study it with its author: it shows what the team needs. Plan a supported replacement together.', s:2, d:{trust:2, rigor:1},
    fb:'Shadow tools are demand made visible. Their authors know the edge cases better than any specification.'},
   {t:'Leave it alone. It works, the team loves it, and there are bigger problems to solve first.', s:1, d:{trust:1, rigor:-1},
    fb:'It works until its author goes on leave. At the very least, write down the dependency.'}]},
 {id:'pilot', slot:'trail', from:'From a vendor', title:'The free pilot',
  text:'A vendor offers a free ninety-day pilot of its platform, on condition that it starts next week and uses the Bank\u2019s real data.',
  opts:[
   {t:'Take it. Ninety days of real use, at no cost, will teach the Bank more than any paper exercise.', s:0, d:{weeks:1, rigor:-2, cred:-1}, flag:'freePilot',
    fb:'Free pilots are paid for in data, staff time and the vendor\u2019s momentum. Real data in an unapproved environment is not free at all.'},
   {t:'Decline for now: write the requirement first, then let vendors pilot against it inside the Bank.', s:2, d:{rigor:1},
    fb:'The requirement makes the pilot comparable and the data safe. The vendor will still be there next quarter.'},
   {t:'Accept, on the condition that it runs on synthetic data and never touches the Bank’s real records.', s:1, d:{weeks:-1},
    fb:'Better. Synthetic data protects the Bank, but a pilot that skips the requirement still tests the vendor\u2019s strengths, not your step\u2019s needs.'}]},
 {id:'sceptic', slot:'trail', from:'On the floor', title:'The sceptic',
  text:'The most experienced of the {who} tells you, in front of the team, that none of this will work here. \u201cWe tried an automation project in 2019. It made everything worse.\u201d',
  opts:[
   {t:'Explain calmly what is different this time: better tools, a narrower scope and proper sponsorship.', s:0, d:{trust:-1},
    fb:'Arguing the future against someone\u2019s lived past rarely works. You will win the exchange and lose the person.'},
   {t:'Ask what went wrong in 2019, and invite them to test the pilot against the cases that broke it.', s:2, d:{trust:2, rigor:1},
    fb:'The sceptic knows where the bodies are buried. Making them the test lead turns your hardest critic into your quality control.'},
   {t:'Escalate to their manager after the meeting so the team hears one consistent message.', s:0, d:{trust:-2},
    fb:'You now have compliance, not support, and the whole team watched how you handle dissent.'}]},

 {id:'archipelago', slot:'data', from:'In the data', title:'The spreadsheet archipelago',
  text:'The data your candidates depend on turns out to live in fourteen personal spreadsheets with different column names. Two belong to someone who retired in March.',
  opts:[
   {t:'Feed all fourteen spreadsheets to a model and let it reconcile the columns. That is what it is for.', s:0, d:{rigor:-2},
    fb:'What comes out will look plausible and be wrong in ways nobody can check. Uncaptured or inconsistent data is a step-zero problem, not something a model fixes.'},
   {t:'Make capture step zero: agree where the data lands and in what shape, then pilot on the clean part.', s:2, d:{rigor:1, cred:1},
    fb:'Most use cases that fail, fail here. Capturing the data properly is unglamorous, and it is the work.'},
   {t:'Drop this use case, and move on to a candidate whose data already sits in one place and one format.', s:1, d:{cred:-1},
    fb:'Sometimes right, but check the size of the prize first. If the value is large, a data-capture project is the first phase, not a reason to stop.'}]},
 {id:'owner', slot:'data', from:'From a data owner', title:'The data owner',
  text:'The owner of the system your strongest candidate depends on will not grant access until a governance review is complete. The next review board meets in six weeks.',
  opts:[
   {t:'Ask a friendly analyst for an extract so the pilot can start now; the review can catch up later.', s:0, d:{trust:-1, rigor:-2}, flag:'extract',
    fb:'You get the data and lose the owner, and the extract will be out of date by the time you use it. Access obtained this way also ends pilots.'},
   {t:'Bring the owner in: ask what the review needs, and prepare the access request now.', s:2, d:{cred:1, rigor:1, weeks:-1},
    fb:'Governance is part of the use case, not an obstacle to it. It costs you a week, and owners who help design the access become sponsors.'},
   {t:'Ask the president’s office to expedite the review. Six weeks is too long for the leadership deadline.', s:1, d:{cred:-1, trust:-1},
    fb:'It may work once. It also tells every data owner how you operate.'}]},

 {id:'meeting', slot:'team', from:'On the floor', title:'The team meeting',
  text:'You present the idea to the {who}, whose work it touches. The room goes quiet. Someone asks whether this means job cuts.',
  opts:[
   {t:'Reassure them that no jobs are at risk and that their day-to-day work will stay the same.', s:0, d:{trust:-2}, flag:'vague',
    fb:'Something will change, or why do it? People can tell. Vague reassurance costs you the trust you need for the pilot.'},
   {t:'Be specific: which tasks change, how they will test it, and how its errors get caught.', s:2, d:{trust:2},
    fb:'Specifics are respect. The people who do the work today are also the only ones who can tell you when the tool is wrong.'},
   {t:'Thank them, and next time brief their manager first so questions like this are handled privately.', s:0, d:{trust:-2, cred:1},
    fb:'The tool will be judged by the people who use it. Cutting them out delays the conversation and makes it worse.'}]},
 {id:'volunteer', slot:'team', from:'On the floor', title:'The volunteer',
  text:'After your session with the {who}, one of them asks to lead the pilot. She is enthusiastic, junior, and has never run a project.',
  opts:[
   {t:'Thank her warmly, and give the pilot to a senior manager who has delivered projects like this before.', s:0, d:{trust:-2},
    fb:'Seniority is not ownership. You have just shown the team who gets to shape the change.'},
   {t:'Make her the day-to-day lead, with an experienced sponsor beside her and the baseline to own.', s:2, d:{trust:2, cred:1},
    fb:'Volunteers who do the work are the most credible voices in the room when the pilot reports back.'},
   {t:'Give her the pilot outright. People who volunteer are the ones who make change stick.', s:1, d:{trust:1, rigor:-1},
    fb:'Enthusiasm without support burns people out. Give her cover and a measure.'}]},

 {id:'metric', slot:'metric', from:'From your sponsor', title:'The metric',
  text:'Your sponsor asks the question that decides whether this becomes a programme or a slide: \u201cHow will we know it worked?\u201d',
  opts:[
   {t:'Track adoption: how many people use the tool each week, and how many features ship this year.', s:0, d:{cred:-1, rigor:-1},
    fb:'Activity, not outcome. Shipping features is easy; changing the step is the point.'},
   {t:'Measure the step now (time, errors, cost per item) and compare the pilot against that baseline.', s:2, d:{cred:2, rigor:1},
    fb:'A baseline measured before the pilot is the difference between a result and an anecdote.'},
   {t:'Run a satisfaction survey three months after launch, so the people using it say whether it works.', s:1, d:{},
    fb:'Useful alongside a baseline, not instead of one. Satisfaction can rise while the work gets worse.'}]},
 {id:'early', slot:'metric', from:'From your sponsor', title:'The date moves',
  text:'The leadership meeting has been moved forward. Your sponsor asks whether you can present a week early.',
  opts:[
   {t:'Yes, and present everything you have, so leadership sees the full range and depth of the work.', s:1, d:{cred:1, weeks:-1},
    fb:'Responsive, and a little exposed. Four half-finished cases are harder to defend than one finished one.'},
   {t:'Yes, with only the headline case and its baseline plan; hold the rest for a second session.', s:2, d:{cred:2, weeks:-1},
    fb:'Fewer, sharper, measured. Leadership remembers one clear case better than four vague ones.'},
   {t:'Ask to keep the original date, so the cases are finished before anyone sees them.', s:0, d:{cred:-1},
    fb:'Sometimes necessary, but it signals the work is not ready. Be ready with less instead.'}]},
];

/* Earlier choices that come back later. where: 'lead:<slot>' | 'canvas' | 'debrief' | 'tools' */

const REACT = {
  arrive:[
    'You spend a morning alongside the {who}.',
    'You sit in with the {who} for a day.',
    'The {who} walk you through how it really runs.',
    'You shadow the {who} through an ordinary shift.',
    'You pull up a chair next to the {who} and watch.',
    'You ask the {who} to show you, not tell you.',
  ],
  profile:{
    great:['Your read matches the Guide almost exactly.','That is how the people who do this work would describe it.','A clean read. The capability choice will be easier for it.','Sharp. You saw past the systems to the work itself.'],
    good:['A solid read, with a dimension worth a second look.','Mostly there. The differences are worth understanding.','Close. Where you differ, the notes from the team say why.'],
    mixed:['Partly there. The work is easy to mistake for the systems around it.','A mixed read. Look at what the person produces at the end of the step.','Some of this lands. Unpick the rest before you pick a tool.'],
    off:['The Guide sees this step differently. Worth knowing why before you match a capability.','A long way from the Guide’s read. Re-read what it costs today: it usually points at the kind of work.','This one got away from you. It happens on unfamiliar ground.'],
  },
  match:{
    best:['That is the capability the Guide reaches for.','Right family, right capability.','A strong fit. The step and the capability agree.','Exactly what this work needs.'],
    ok:['It would work, but it is not the first move.','Workable. There is a sharper fit for this step.','Not wrong, and not the Guide\u2019s pick.'],
    poor:['That capability does not fit the shape of this work.','A mismatch. The tool and the step want different things.','Not this one. The work is asking for something else.'],
  },
  auto:{
    exact:['Autonomy matched to the stakes.','The right amount of human in the loop.'],
    over:['You would let the tool act where a person should decide.','More autonomy than these stakes can bear.'],
    under:['More caution than this step needs. That has a cost too.','A person is checking work that a rule could carry.'],
  },
  waypoint:['Step logged.','Waypoint reached.','Another step mapped.','Notes filed.'],
};

/* Sponsor dispatches at milestones. */

const HINTS = {
  dimAsk:{
    shape:'Set the systems aside. What does the person actually produce at the end of this step?',
    input:'Look at how the work arrives. What is in front of the person when they start?',
    rep:'Look at the volume. How often does this happen, and how alike is each one?',
    stakes:'Picture one error. Who notices it, and what does it cost?',
  },
  dimWhere:{shape:'notes', input:'systems', rep:'volume', stakes:'pain'},
  shape:{
    extract:'The material already exists. The work is getting specific details out of it.',
    route:'Each item is being sent somewhere. The real decision is which bucket, queue or person.',
    lookup:'The answer already exists somewhere. The work is finding it and saying it plainly.',
    draft:'Something new is being written, in a pattern that repeats.',
    summarize:'There is more material than anyone needs. The work is reducing it to what matters.',
    predict:'The output is a number about something that has not happened yet.',
    check:'Something is compared against what it should be, and the differences are flagged.',
    suggest:'Several options exist. The work is ranking them and showing why.',
    allocate:'Limited people, time or space, and many things to fit into them.',
    decide:'Someone makes a call they will be accountable for.',
    coordinate:'Information and requests move between people and systems, and get chased.',
    physical:'Real objects are handled or examined.',
  },
  input:{
    structured:'The work starts from fields and records that already sit in a system.',
    text:'The work starts from words: emails, documents, notes. Even if the facts inside are tidy, the container is text.',
    media:'The work starts from images, scans or recordings.',
    tacit:'The key information is not written down anywhere. It lives in people\u2019s heads, or on calls nobody records.',
  },
  rep:{
    high:'Many times a day or week, and each one looks much like the last.',
    mid:'Regular, but each one needs some thought of its own.',
    low:'Rare enough that a dedicated tool would struggle to pay for itself.',
  },
  stakes:{
    low:'An error here is cheap and quickly caught.',
    mid:'An error costs time, money or trust, but can be put right.',
    high:'An error reaches someone important, is regulated, or is hard to undo.',
  },
  capAsk:'You read this step as \u201c{shape}\u201d. Start in the family built for that kind of work, and ask whether a rule would do it first.',
  capFam:'The Guide looks first in \u201c{fam}\u201d.',
  capRule:'Part of this can be written down as a rule, or fixed upstream.',
  autoAsk:'You rated the stakes {stakes}. Who should own a wrong answer here?',
  auto:{
    assist:'A person should decide every case here.',
    review:'The routine can run on its own; the exceptions need a person.',
    auto:'Errors here are cheap and reversible.',
  },
  terrainAsk:'A hotspot has four ingredients: volume, repetition, a cost you can measure, and inputs that are already captured.',
  terrainWhere:'Look for parts of the Bank with two strong signals. The glow on the map marks measured evidence, not noise.',
  realityAsk:'Rate the ground the idea has to cross, not how good the idea is.',
  realityWhere:'Your notes from the team on each candidate are clues. \u201cFix first\u201d and \u201cData: ready\u201d both say something about feasibility.',
  realityThin:'You did not interview on this step. Read what it costs today again: it tells you the size of the prize.',
  canvasAsk:'Ask how this fails, and who is hurt when it does.',
  canvasWhere:'For {cap} at \u201c{auto}\u201d, start with {g}.',
  missMatch:'Last step the capability missed. Read the shape you chose, then look in that family first.',
  missProfile:'Last step\u2019s read was some way off. Re-read what it costs today before you choose: it usually points at the kind of work.',
};

/* Complications are drawn from these slots: one part way through a walk,
   one before the finished map. Scores (s) label the feedback only. */
/* v4 listed only ['trail'] for the first slot, so the three 'sponsor' complications (the demo, the
   brand name, the peer bank) could never fire. v5 and v6 draw them in the first slot. */
const COMPLICATION_SLOTS = [['trail','sponsor'], ['data','team','metric']];

const MARKS = [
  {id:'first',     icon:'flag',      name:'First map',              d:'Finish walking a process.'},
  {id:'flagships', icon:'map',       name:'The four flagships',     d:'Walk all four flagship processes.'},
  {id:'offpath',   icon:'route',     name:'Off the beaten path',    d:'Walk a process beyond the flagships.'},
  {id:'saidno',    icon:'x',         name:'Knowing when not to',    d:'Call a step \u201cnot an LLM job\u201d when the Guide agrees.'},
  {id:'inagree',   icon:'check',     name:'In step with the Guide', d:'Match the Guide\u2019s LLM call on every step of a process.'},
  {id:'steady',    icon:'review',    name:'Measured autonomy',      d:'Match the Guide\u2019s autonomy on every step of a process.'},
  {id:'digger',    icon:'interview', name:'Every voice heard',      d:'Hear more from the team on every step of a process.'},
  {id:'coolhead',  icon:'trust',     name:'Cool head',              d:'Give the strong answer to every complication in a walk.'},
  {id:'ownmap',    icon:'doc',       name:'Your own ground',        d:'Map a process of your own.'},
  {id:'further',   icon:'spark',     name:'Taken further',          d:'Export a map or copy it for LPP.'},
];

export {SPONSOR, GUIDANCE, EVENT_POOL, REACT, HINTS, COMPLICATION_SLOTS, MARKS};
