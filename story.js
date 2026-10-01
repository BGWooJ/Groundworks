/* =====================================================================
   STORY
   Everything that makes each run play differently: who you are, what
   happens on the trail, how people react, and how it ends.
   Stats run 0–10:  cred  = Credibility with leadership
                    trust = Trust on the floor (the people who do the work)
                    rigor = Rigor of your method
   ===================================================================== */

const SPONSOR = {name:'Marion Okafor', role:'First Vice President'};
const START_WEEKS = 12;

const STATS = [
  {id:'cred',  name:'Credibility', d:'How much leadership trusts your judgment.', icon:'cred'},
  {id:'trust', name:'Trust',       d:'How much the people who do the work trust you.', icon:'trust'},
  {id:'rigor', name:'Rigor',       d:'How disciplined your method is.', icon:'rigor'},
];

const BACKGROUNDS = [
  {id:'analyst', name:'The analyst', line:'Twelve years in the research division. You trust evidence and distrust anecdotes.',
   stats:{cred:4, trust:3, rigor:6}, perk:'Pattern eye', perkD:'Your first two field interviews cost no time.'},
  {id:'operator', name:'The operator', line:'Nine years running facilities and security operations. You know how the work really gets done.',
   stats:{cred:3, trust:6, rigor:4}, perk:'Floor knowledge', perkD:'You hear a word from the floor at every step, before you profile it.'},
  {id:'strategist', name:'The strategist', line:'Five years in the president\u2019s office. You know how decisions get made, and by whom.',
   stats:{cred:6, trust:4, rigor:3}, perk:'Sponsor\u2019s ear', perkD:'Two extra weeks of runway, and one chance to rethink a decision on the trail.'},
];

const GUIDANCE = [
  {id:'ropes', name:'Walk me through it', d:'A pointer opens at every decision.'},
  {id:'stall', name:'Nudge me if I stall', d:'Help opens if you pause, or after a miss.'},
  {id:'ask',   name:'Only when I ask', d:'The field guide stays closed until you open it.'},
];

/* Standing effects: what your stats change about the game. */
const EFFECTS = {
  trustHigh:'The floor makes time for you: interviews cost no time.',
  trustLow:'The floor is guarded: interviews take two weeks.',
  credHigh:'Your sponsor bought you an extra week.',
  credLow:'Leadership pulled the meeting forward a week.',
  rigorHigh:'Your case will hold up under questioning.',
};

/* ---------------------------------------------------------------------
   Trail events. Each run draws one per slot (two for "trail").
   Options are shown in random order. d = stat and week changes.
   {who} and {proc} are filled from the current expedition.
   --------------------------------------------------------------------- */
const EVENT_SLOTS = {sponsor:1, trail:2, data:1, team:1, metric:1};

const EVENT_POOL = [
 {id:'demo', slot:'sponsor', from:'From your sponsor', title:'The demo',
  text:'A senior leader saw a vendor demo last week and now wants \u201ca chatbot for the Bank\u201d live before the leadership meeting. Your sponsor asks you to make it happen.',
  opts:[
   {t:'Start scoping the chatbot. It is what leadership asked for.', s:0, d:{cred:1, rigor:-2}, flag:'chatbot',
    fb:'A chatbot is a capability, not a use case. Without a process and a step, you will build a front door to nothing in particular. Leadership is pleased, for now.'},
   {t:'Ask which process it would improve and which step, then weigh a conversational assistant against the other capability types for that step.', s:2, d:{rigor:1, cred:1},
    fb:'Tools are answers, and you do not have a question yet. Anchor the request to a step in a process, and the right capability may or may not be a chatbot.'},
   {t:'Push back: chatbots do not work.', s:0, d:{cred:-2},
    fb:'Some do, in the right place. Dismissing the tool is the same mistake as worshipping it: it skips the work.'}]},
 {id:'brand', slot:'sponsor', from:'In the corridor', title:'The brand name',
  text:'A colleague insists the Bank needs one specific, well-known product. \u201cEvery other institution uses it. Just buy it and move on.\u201d',
  opts:[
   {t:'Buy it. A known brand is the safe choice.', s:0, d:{cred:1, rigor:-2}, flag:'brandFirst',
    fb:'Brands change, get acquired and get outrun. Buying before you know what the step needs makes the tool the requirement.'},
   {t:'Write down what the step needs (what it must read, decide or produce, at what accuracy, volume and sensitivity), then evaluate any option against it, including that one.', s:2, d:{rigor:1, cred:1},
    fb:'The requirement outlives any vendor. It also makes the comparison honest, and it is the thing you can hand to procurement.'},
   {t:'Ban vendors and build everything in-house.', s:0, d:{cred:-1, rigor:-1},
    fb:'Building is a valid option for some capabilities, but deciding it before you know the requirement is the same error in a different jacket.'}]},
 {id:'peer', slot:'sponsor', from:'From your sponsor', title:'The peer bank',
  text:'Another reserve bank has announced an AI programme with a press release and a target of \u201cforty use cases in a year\u201d. The president\u2019s office asks why the Bank is behind.',
  opts:[
   {t:'Match it: commit to forty use cases this year.', s:0, d:{cred:1, rigor:-2}, flag:'forty',
    fb:'A count of use cases is a target for activity. You will find forty, and most will be the easy ones that change nothing.'},
   {t:'Offer a smaller number, drawn from the hotspots you just surveyed, each with a baseline and a measure of success.', s:2, d:{cred:1, rigor:1},
    fb:'Three use cases that move a measured number beat forty that do not. Leadership can defend a result; it cannot defend a count.'},
   {t:'Say the comparison is not useful, and carry on.', s:1, d:{cred:-1},
    fb:'You may be right, but the question was fair. Answer it with your own plan, or someone else will answer it for you.'}]},

 {id:'paste', slot:'trail', from:'On the floor', title:'The paste',
  text:'One of the {who}, trying to save an afternoon, is about to paste a draft internal document into a public AI tool to tighten the wording.',
  opts:[
   {t:'Let it go. It is only a draft, and the tool is good.', s:0, d:{trust:1, rigor:-2}, flag:'paste',
    fb:'An internal document just left the building. Sensitivity attaches to the information, not to the version.'},
   {t:'Stop it, and treat it as a signal: classify the information first, and give people an approved environment for exactly this kind of help.', s:2, d:{rigor:1, trust:1},
    fb:'People route around missing tools. Decide what may leave, what may not, and what may never be seen by a tool at all. Then provide an inside option, or the paste happens again with nobody watching.'},
   {t:'Ban AI tools for the team.', s:1, d:{trust:-2},
    fb:'It closes one door and teaches nothing. The need is real; the answer is an approved way to meet it.'}]},
 {id:'workaround', slot:'trail', from:'On the floor', title:'The workaround',
  text:'Digging into a step, you find it exists because two systems do not share a field. One of the {who} has re-keyed the same information every day for six years.',
  opts:[
   {t:'Automate the re-keying with an agent. Fast relief.', s:1, d:{trust:1},
    fb:'It works, and sometimes it is the pragmatic bridge. But you have bought a tool to preserve a defect. Note the real fix and a date to make it.'},
   {t:'Fix the integration or the form so the field flows through, then see what work is left.', s:2, d:{rigor:1, cred:1, weeks:-1},
    fb:'Remove the cause and the step may vanish. It costs you a week to get the system owners in a room, and it is worth it. Automating a broken process only makes it break faster.'},
   {t:'Add a second person to check the re-keying.', s:0, d:{trust:-1, cred:-1},
    fb:'Now two people preserve the defect.'}]},
 {id:'shadow', slot:'trail', from:'On the floor', title:'The shadow tool',
  text:'One of the {who} has built a spreadsheet full of macros that does a good part of this work. It is undocumented, runs on one laptop, and the team loves it.',
  opts:[
   {t:'Shut it down. It is an unmanaged risk.', s:0, d:{trust:-2},
    fb:'It is a risk, and it is also the best requirements document you will ever get. Shutting it down tells the team that initiative is punished.'},
   {t:'Study it: it shows exactly what the team needs. Bring its author into the design and plan to replace it with something supported.', s:2, d:{trust:2, rigor:1},
    fb:'Shadow tools are demand made visible. Their authors know the edge cases better than any specification.'},
   {t:'Leave it alone. It works.', s:1, d:{trust:1, rigor:-1},
    fb:'It works until its author goes on leave. At the very least, write down the dependency.'}]},
 {id:'pilot', slot:'trail', from:'From a vendor', title:'The free pilot',
  text:'A vendor offers a free ninety-day pilot of its platform, on condition that it starts next week and uses the Bank\u2019s real data.',
  opts:[
   {t:'Take it. Free is free.', s:0, d:{weeks:1, rigor:-2, cred:-1}, flag:'freePilot',
    fb:'Free pilots are paid for in data, staff time and the vendor\u2019s momentum. Real data in an unapproved environment is not free at all.'},
   {t:'Decline for now. Write the requirement first, then invite any vendor to pilot against it, inside the approved environment.', s:2, d:{rigor:1},
    fb:'The requirement makes the pilot comparable and the data safe. The vendor will still be there next quarter.'},
   {t:'Accept, but with synthetic data only.', s:1, d:{weeks:-1},
    fb:'Better. Synthetic data protects the Bank, but a pilot that skips the requirement still tests the vendor\u2019s strengths, not your step\u2019s needs.'}]},
 {id:'sceptic', slot:'trail', from:'On the floor', title:'The sceptic',
  text:'The most experienced of the {who} tells you, in front of the team, that none of this will work here. \u201cWe tried an automation project in 2019. It made everything worse.\u201d',
  opts:[
   {t:'Explain why this time is different.', s:0, d:{trust:-1},
    fb:'Arguing the future against someone\u2019s lived past rarely works. You will win the exchange and lose the person.'},
   {t:'Ask what went wrong in 2019, and invite them to test the pilot against the cases that broke it last time.', s:2, d:{trust:2, rigor:1},
    fb:'The sceptic knows where the bodies are buried. Making them the test lead turns your hardest critic into your quality control.'},
   {t:'Escalate to their manager to get them on board.', s:0, d:{trust:-2},
    fb:'You now have compliance, not support, and the whole team watched how you handle dissent.'}]},

 {id:'archipelago', slot:'data', from:'In the data', title:'The spreadsheet archipelago',
  text:'The data your candidates depend on turns out to live in fourteen personal spreadsheets with different column names. Two belong to someone who retired in March.',
  opts:[
   {t:'Feed the spreadsheets to a model and see what comes out.', s:0, d:{rigor:-2},
    fb:'What comes out will look plausible and be wrong in ways nobody can check. Uncaptured or inconsistent data is a step-zero problem, not something a model fixes.'},
   {t:'Treat data capture as step zero: agree where the data lands and in what shape, then pilot on the subset that is already clean.', s:2, d:{rigor:1, cred:1},
    fb:'Most use cases that fail, fail here. Capturing the data properly is unglamorous, and it is the work.'},
   {t:'Drop the use case.', s:1, d:{cred:-1},
    fb:'Sometimes right, but check the size of the prize first. If the value is large, a data-capture project is the first phase, not a reason to stop.'}]},
 {id:'owner', slot:'data', from:'From a data owner', title:'The data owner',
  text:'The owner of the system your strongest candidate depends on will not grant access until a governance review is complete. The next review board meets in six weeks.',
  opts:[
   {t:'Go around them: ask a friendly analyst for an extract.', s:0, d:{trust:-1, rigor:-2}, flag:'extract',
    fb:'You get the data and lose the owner, and the extract will be out of date by the time you use it. Access obtained this way also ends pilots.'},
   {t:'Bring the owner in: ask what the review needs, and prepare the data classification and access request now.', s:2, d:{cred:1, rigor:1, weeks:-1},
    fb:'Governance is part of the use case, not an obstacle to it. It costs you a week, and owners who help design the access become sponsors.'},
   {t:'Escalate to the president\u2019s office to expedite.', s:1, d:{cred:-1, trust:-1},
    fb:'It may work once. It also tells every data owner how you operate.'}]},

 {id:'meeting', slot:'team', from:'On the floor', title:'The team meeting',
  text:'You present the idea to the {who}, whose work it touches. The room goes quiet. Someone asks whether this means job cuts.',
  opts:[
   {t:'Reassure them that nothing will change.', s:0, d:{trust:-2}, flag:'vague',
    fb:'Something will change, or why do it? People can tell. Vague reassurance costs you the trust you need for the pilot.'},
   {t:'Be specific: which tasks change, what they will do with the time, how they will be involved in testing, and how errors will be caught.', s:2, d:{trust:2},
    fb:'Specifics are respect. The people who do the work today are also the only ones who can tell you when the tool is wrong.'},
   {t:'Next time, present it to their manager only.', s:0, d:{trust:-2, cred:1},
    fb:'The tool will be judged by the people who use it. Cutting them out delays the conversation and makes it worse.'}]},
 {id:'volunteer', slot:'team', from:'On the floor', title:'The volunteer',
  text:'After your session with the {who}, one of them asks to lead the pilot. She is enthusiastic, junior, and has never run a project.',
  opts:[
   {t:'Thank her, and give the pilot to a senior manager instead.', s:0, d:{trust:-2},
    fb:'Seniority is not ownership. You have just shown the team who gets to shape the change.'},
   {t:'Make her the pilot\u2019s day-to-day lead, pair her with an experienced sponsor, and give her the baseline to own.', s:2, d:{trust:2, cred:1},
    fb:'Volunteers who do the work are the most credible voices in the room when the pilot reports back.'},
   {t:'Let her run it alone. Enthusiasm is enough.', s:1, d:{trust:1, rigor:-1},
    fb:'Enthusiasm without support burns people out. Give her cover and a measure.'}]},

 {id:'metric', slot:'metric', from:'From your sponsor', title:'The metric',
  text:'Your sponsor asks the question that decides whether this becomes a programme or a slide: \u201cHow will we know it worked?\u201d',
  opts:[
   {t:'Count the AI features we ship this year.', s:0, d:{cred:-1, rigor:-1},
    fb:'Activity, not outcome. Shipping features is easy; changing the step is the point.'},
   {t:'Measure the step now (time, error rate, cost per item, cycle time) and compare the pilot against that baseline.', s:2, d:{cred:2, rigor:1},
    fb:'A baseline measured before the pilot is the difference between a result and an anecdote.'},
   {t:'Run a satisfaction survey after launch.', s:1, d:{},
    fb:'Useful alongside a baseline, not instead of one. Satisfaction can rise while the work gets worse.'}]},
 {id:'early', slot:'metric', from:'From your sponsor', title:'The date moves',
  text:'The leadership meeting has been moved forward. Your sponsor asks whether you can present a week early.',
  opts:[
   {t:'Yes. Present everything you have.', s:1, d:{cred:1, weeks:-1},
    fb:'Responsive, and a little exposed. Four half-finished cases are harder to defend than one finished one.'},
   {t:'Yes, and present only the headline case with its baseline plan, holding the rest for a second session.', s:2, d:{cred:2, weeks:-1},
    fb:'Fewer, sharper, measured. Leadership remembers one clear case better than four vague ones.'},
   {t:'Ask to keep the original date.', s:0, d:{cred:-1},
    fb:'Sometimes necessary, but it signals the work is not ready. Be ready with less instead.'}]},
];

/* Earlier choices that come back later. where: 'lead:<slot>' | 'canvas' | 'debrief' | 'tools' */
const CONSEQUENCES = [
  {flag:'chatbot',   where:'lead:metric', text:'Leadership is still asking about the chatbot from the demo.'},
  {flag:'chatbot',   where:'debrief',     text:'The chatbot from the demo is still on someone\u2019s list. You will need an answer for it.'},
  {flag:'forty',     where:'debrief',     text:'The target of forty use cases is still on the slide, and now it is yours.'},
  {flag:'brandFirst',where:'tools',       text:'Earlier, you agreed to buy a product before the requirement existed. The recommendations below start from the requirement instead.'},
  {flag:'freePilot', where:'lead:data',   text:'The vendor\u2019s free pilot has just asked for a production data extract.'},
  {flag:'paste',     where:'lead:team',   text:'Word has got round that you waved through a paste into a public tool.'},
  {flag:'vague',     where:'debrief',     text:'The team remembers being told that nothing would change.'},
  {flag:'extract',   where:'canvas',      text:'Data access was obtained informally. Expect the data owner to raise it.'},
];

/* Lead-in lines on events, chosen from your current standing. */
const EVENT_LEADS = [
  {test:S=>S.stats.cred>=7,  text:'Your sponsor has started forwarding you things directly.'},
  {test:S=>S.stats.cred<=2,  text:'Your sponsor\u2019s replies have become shorter.'},
  {test:S=>S.stats.trust>=7, text:'People on the floor have started bringing you things unprompted.'},
  {test:S=>S.stats.trust<=2, text:'Conversations stop when you walk onto the floor.'},
  {test:S=>S.weeks<=3,       text:'With the meeting close, everything arrives at once.'},
];

/* ---------------------------------------------------------------------
   Reactions. Picked at random, never the same twice in a row.
   --------------------------------------------------------------------- */
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
    great:['Your read matches the field almost exactly.','That is how the people who do this work would describe it.','A clean read. The capability choice will be easier for it.','Sharp. You saw past the systems to the work itself.'],
    good:['A solid read, with a dimension worth a second look.','Mostly there. The differences are worth understanding.','Close. Where you differ, the field notes say why.'],
    mixed:['Partly there. The work is easy to mistake for the systems around it.','A mixed read. Look at what the person produces at the end of the step.','Some of this lands. Unpick the rest before you pick a tool.'],
    off:['The field sees this step differently. Worth knowing why before you match a capability.','A long way from the field read. Re-read the pain: it usually points at the shape.','This one got away from you. It happens on unfamiliar ground.'],
  },
  match:{
    best:['That is the capability the field reaches for.','Right family, right capability.','A strong fit. The step and the capability agree.','Exactly what this work needs.'],
    ok:['It would work, but it is not the first move.','Workable. There is a sharper fit for this step.','Not wrong, and not the field\u2019s pick.'],
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
const DISPATCH = {
  terrain:{
    high:'Good instincts on the map. The president\u2019s office noticed you went where the volume is.',
    mid:'A reasonable shortlist. Expect questions about why you picked what you did.',
    low:'Your shortlist raised eyebrows upstairs. Make the expedition count.',
  },
  lowWeeks:'Three weeks to the meeting. Choose your interviews carefully.',
  noWeeks:'We are out of runway. Whatever you finish now, you finish late.',
  canvas:{
    high:'I have seen enough to back you. Make the one-pager sharp.',
    mid:'Bring me one case I can defend in the room.',
    low:'I need to be convinced. The one-pager has to do the work.',
  },
};

/* ---------------------------------------------------------------------
   Ranks and endings
   --------------------------------------------------------------------- */
const RANKS = [
  {at:0,   name:'Day tripper',     d:'You saw the terrain. Next time, spend longer at each step before reaching for the toolkit.'},
  {at:.30, name:'Trail scout',     d:'You can find the hotspots and name most of the work. Practise the matching and the reality check.'},
  {at:.50, name:'Surveyor',        d:'You read the work well. Matching autonomy to stakes is where the next points are.'},
  {at:.70, name:'Cartographer',    d:'You dissect processes well and match capabilities sensibly. The reality check is where the last points live.'},
  {at:.85, name:'Expedition lead', d:'You start from the work, match the capability, size the autonomy and check reality. Take a team through it.'},
];

/* Checked in order; the first that passes is the ending. */
const ENDINGS = [
  {id:'overrun', name:'Over the line', test:(S,p)=>S.overrun>0,
   d:'You ran past the leadership meeting. The case went in half-finished, and the president asked you to come back next quarter. The work was good; the timing was not.'},
  {id:'redraw', name:'Back to the map', test:(S,p)=>p<.45 || S.stats.rigor<=2,
   d:'The case does not hold together under questioning. Leadership asks you to go back to the terrain and start again, with a different process.'},
  {id:'greenlit', name:'Green-lit', test:(S,p)=>S.stats.cred>=7 && S.stats.trust>=7 && S.stats.rigor>=5 && p>=.65,
   d:'The president asks you to take the case to the board. Before you leave the room, the team asks when the pilot starts. Both ends of the building want this.'},
  {id:'above', name:'Approved from above', test:(S,p)=>S.stats.cred>=6 && S.stats.trust<=4,
   d:'Leadership approves the pilot. On the floor, the reaction is polite and cool. You have the mandate; you do not yet have the people who will make it work.'},
  {id:'floor', name:'Backed by the floor', test:(S,p)=>S.stats.trust>=6 && S.stats.cred<=4,
   d:'The team is ready to start tomorrow. Leadership is not convinced, and asks for a baseline and a business case. You have the people; now earn the mandate.'},
  {id:'pilot', name:'Pilot with conditions', test:()=>true,
   d:'Leadership approves a small pilot with a review in ninety days. Nobody is excited yet. That is usually how the good ones start.'},
];

/* Marks are kept across runs, in this browser. */
const MARKS = [
  {id:'first',    name:'First light',         d:'Finish an expedition.', icon:'compass'},
  {id:'flagships',name:'Four corners',        d:'Finish all four flagship expeditions.', icon:'map'},
  {id:'offpath',  name:'Off the beaten path', d:'Finish an expedition beyond the flagship four.', icon:'route'},
  {id:'lowroad',  name:'The long way round',  d:'Take a low-rated process all the way to the end.', icon:'flag'},
  {id:'norule',   name:'Not an AI problem',   d:'Spot a step where a rule or a process fix beats AI.', icon:'none'},
  {id:'steady',   name:'Steady hands',        d:'Match the autonomy on every step of an expedition.', icon:'review'},
  {id:'unaided',  name:'Unaided',             d:'Finish without asking the guide to point at the evidence.', icon:'rigor'},
  {id:'digger',   name:'Every stone turned',  d:'Interview on every step of an expedition.', icon:'interview'},
  {id:'allbg',    name:'Three perspectives',  d:'Finish with each background.', icon:'trust'},
  {id:'lead',     name:'Expedition lead',     d:'Reach the top rank.', icon:'mark'},
  {id:'quickwin', name:'Quick to the win',    d:'Pitch a case the field rates a quick win.', icon:'spark'},
  {id:'ontime',   name:'Ahead of schedule',   d:'Finish with three or more weeks to spare.', icon:'weeks'},
];

/* ---------------------------------------------------------------------
   Field guide hints. Tier 1 is a question; tier 2 points at the evidence.
   --------------------------------------------------------------------- */
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
  capFam:'The field looks first in \u201c{fam}\u201d.',
  capRule:'Part of this can be written down as a rule, or fixed upstream.',
  autoAsk:'You rated the stakes {stakes}. Who should own a wrong answer here?',
  auto:{
    assist:'A person should decide every case here.',
    review:'The routine can run on its own; the exceptions need a person.',
    auto:'Errors here are cheap and reversible.',
  },
  terrainAsk:'A hotspot has four ingredients: volume, repetition, a pain you can measure, and inputs that are already captured.',
  terrainWhere:'Look for parts of the Bank with two strong signals. The glow on the map marks measured evidence, not noise.',
  realityAsk:'Rate the ground the idea has to cross, not how good the idea is.',
  realityWhere:'Your field notes on each candidate are clues. \u201cFix first\u201d and \u201cData: ready\u201d both say something about feasibility.',
  realityThin:'You did not interview on this step. Read its pain again: it tells you the size of the prize.',
  canvasAsk:'Ask how this fails, and who is hurt when it does.',
  canvasWhere:'For {cap} at \u201c{auto}\u201d, start with {g}.',
  missMatch:'Last step the capability missed. Read the shape you chose, then look in that family first.',
  missProfile:'Last step\u2019s read was some way off. Re-read the pain before you choose: it usually points at the shape.',
};
