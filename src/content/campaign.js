/* =====================================================================
   CAMPAIGN (v5): more complications, written for every level of the
   organisation, and the charter questions every map starts from.

   Complications use the v4 shape (see story.js). Two v5 fields:
     roles   which lenses this one is written for; a walk prefers events
             for the player's lens, but anyone can meet any event
     report  a Field Report shown with the feedback, so the lesson has a
             real case behind it
   Effects (d) move the four standing stats: cred (credibility with
   leadership), rigor (rigour in the method), trust (trust of the people
   who do the work) and weeks (time in hand; spending time is sometimes
   the right call).
   ===================================================================== */

export const V5_EVENTS = [
 {id:'leaderboard', slot:'team', roles:['steward','sponsor'], from:'From a team manager', title:'The leaderboard',
  text:'A manager wants people to log their work properly in the new system, and proposes a leaderboard: the most entries logged each month wins a prize. They ask you to build it into the {proc} pilot.',
  opts:[
   {t:'Build it as asked. Competition gets people moving.', s:0, d:{cred:1, rigor:-2, trust:-1}, flag:'countboard',
    fb:'A count rewards activity, not quality. People will log more, shorter and duplicated entries, and the data you needed gets worse.'},
   {t:'Agree on the behaviour and the outcome first: complete, accurate entries that improve the decision downstream. Then score quality, and check the score actually moves that outcome.', s:2, d:{rigor:1, cred:1, trust:1},
    fb:'A hypothesis comes before a mechanic. Score what you want more of, test the link to the outcome, and drop the game if it does not move it.'},
   {t:'Refuse. People should just do their jobs.', s:0, d:{trust:-1, cred:-1},
    fb:'The manager has spotted a real gap in the data. Turning them away loses an ally; redirecting the idea keeps them.'}],
  report:'wellsfargo'},

 {id:'gamifyall', slot:'sponsor', roles:['sponsor'], from:'From the president’s office', title:'Gamify everything',
  text:'The president’s office wants to “gamify AI adoption” across the Bank: points for every use of an AI tool, a monthly league table by department, badges for the top users.',
  opts:[
   {t:'Launch it Bank-wide. Visible energy is what leadership wants.', s:0, d:{cred:1, rigor:-2}, flag:'usagepoints',
    fb:'Points for usage reward using the tool, not using it well. You will see a spike in activity and learn nothing about value.'},
   {t:'Start from one challenge with a clear hypothesis, decide what success looks like and how it is tracked without extra manual work, and only then choose whether a game mechanic helps.', s:2, d:{cred:1, rigor:2},
    fb:'Gamification is a tool for a specific behaviour change, not a coat of paint. Where a checklist or training would do, use those.'},
   {t:'Tell them games are a distraction and decline.', s:1, d:{cred:-1, rigor:1},
    fb:'Often true, and still a missed chance. Offer the narrower version that would work.'}]},

 {id:'jobfear', slot:'trail', roles:['practitioner','steward'], from:'On the floor', title:'The quiet question',
  text:'After a session with the {team}, one of them stays behind and asks quietly: “Is this going to replace my job?”',
  opts:[
   {t:'Reassure them that nothing will change.', s:0, d:{trust:-1},
    fb:'Something will change, and they will remember the reassurance when it does.'},
   {t:'Be honest about what the read shows: which parts of the step a tool would prepare, which judgments stay with them, and that they will help design and test it.', s:2, d:{trust:2, rigor:1},
    fb:'People trust a change they can see the shape of. The person asking is also the best tester you will get.'},
   {t:'Say it is above your pay grade.', s:0, d:{trust:-2},
    fb:'It may be, but the question deserves an answer from someone. Find out who, and come back.'}]},

 {id:'rubberstamp', slot:'team', roles:['steward','practitioner'], from:'In the pilot data', title:'Ninety-nine point eight',
  text:'A month into a pilot, reviewers have approved 99.8% of the tool’s suggestions without a single change, and average review time has fallen to four seconds.',
  opts:[
   {t:'Celebrate. The tool is clearly ready to run unchecked.', s:0, d:{cred:1, rigor:-2}, flag:'unchecked',
    fb:'Four seconds is not a review. You may be measuring how fast people click, not how good the tool is.'},
   {t:'Pull a sample, check it independently, and seed a few known errors to see if reviewers catch them.', s:2, d:{rigor:2},
    fb:'Automation bias is real. A review step only protects you if people are actually reviewing.'},
   {t:'Remove the review step to save the four seconds.', s:0, d:{rigor:-2, weeks:1},
    fb:'That decision needs evidence the tool is right, and you do not have it yet.'}],
  report:'avianca'},

 {id:'baseline', slot:'metric', roles:['steward','sponsor'], from:'From the team lead', title:'Measure later',
  text:'The {team} are keen to switch the tool on this week. “We’ll measure the improvement afterwards,” says the team lead.',
  opts:[
   {t:'Switch it on. Enthusiasm is hard to come by.', s:0, d:{trust:1, rigor:-2, weeks:1},
    fb:'Without a before, there is no after. You will have stories, not evidence.'},
   {t:'Spend two weeks measuring today’s baseline first, while the pilot is set up, then switch on a slice of the volume.', s:2, d:{rigor:2, weeks:-1},
    fb:'Two weeks now buys you a result nobody can argue with later.'},
   {t:'Wait until a full measurement framework is designed.', s:1, d:{rigor:1, weeks:-2, trust:-1},
    fb:'Rigour, but the energy fades. A simple baseline is enough to start.'}]},

 {id:'manualscore', slot:'metric', roles:['steward','builder'], from:'From your own plan', title:'Who keeps score?',
  text:'Your plan for tracking the {proc} pilot needs every manager to rate a sample of their team’s work by hand, every week.',
  opts:[
   {t:'Keep it. Manager attention signals importance.', s:0, d:{trust:-1, weeks:-1},
    fb:'Manual scoring adds work and fades within a month. Then the measure disappears with it.'},
   {t:'Track what the systems already record automatically, and keep a small monthly sample for quality checks.', s:2, d:{rigor:1, trust:1},
    fb:'Check first whether your systems can track it. A measure that costs nothing to collect survives.'},
   {t:'Drop measurement for now.', s:0, d:{rigor:-2},
    fb:'Then you will not know whether it worked.'}]},

 {id:'buildit', slot:'data', roles:['builder'], from:'From the developers', title:'Build our own',
  text:'Two developers propose training a custom model from scratch for this step. “The approved tools aren’t good enough,” they say, though nobody has tried them on it yet.',
  opts:[
   {t:'Back them. In-house is more controllable.', s:0, d:{rigor:-1, weeks:-2}, flag:'custombuild',
    fb:'Building before testing what exists is the most expensive way to find out you did not need to.'},
   {t:'Test the step on the approved tools first, with fifty real examples, and build only for what they demonstrably cannot do.', s:2, d:{rigor:2, cred:1},
    fb:'Evidence first. If the approved tool fails, you will know exactly what to build, and why.'},
   {t:'Tell them to stop.', s:0, d:{trust:-1},
    fb:'Their skills will be needed. Point them at the test.'}]},

 {id:'writeaccess', slot:'data', roles:['builder','steward'], from:'From the system owner', title:'Write access',
  text:'The pilot design asks for the tool to have write access to a core system so it can update records directly.',
  opts:[
   {t:'Grant it. Otherwise the tool cannot save any time.', s:0, d:{rigor:-2, weeks:1},
    fb:'Write access on day one means a mistake becomes a bad record before anyone sees it.'},
   {t:'Start read-only: the tool proposes the change, a person applies it, every action is logged, and write access comes later with a rollback plan.', s:2, d:{rigor:2, trust:1},
    fb:'Propose first, act later. Errors compound across steps, so earn autonomy with evidence.'},
   {t:'Refuse any access at all.', s:0, d:{weeks:-1, cred:-1},
    fb:'Then nothing can be tested. Read access is enough to start.'}],
  report:'knight'},

 {id:'roi', slot:'metric', roles:['sponsor'], from:'From Finance', title:'Show me the return',
  text:'Before approving the pilot, Finance asks for a single return-on-investment figure for the {proc} work.',
  opts:[
   {t:'Give them the vendor’s headline number.', s:0, d:{cred:1, rigor:-2},
    fb:'The vendor’s number was measured somewhere else, on someone else’s work.'},
   {t:'Give the value hypothesis, today’s hours from the map, a range for the saving, and the measure that will confirm it after the pilot.', s:2, d:{cred:2, rigor:1},
    fb:'A range and a test are more credible than a single number, and they are what Finance actually needs.'},
   {t:'Say it cannot be known until afterwards.', s:1, d:{cred:-1},
    fb:'True, and unhelpful. Give them what you do know.'}]},

 {id:'onetraining', slot:'sponsor', roles:['sponsor','steward'], from:'From HR', title:'One course for everyone',
  text:'HR proposes one mandatory AI course for all 2,400 staff, from the president to the newest analyst.',
  opts:[
   {t:'Approve it. Consistency matters.', s:1, d:{cred:1},
    fb:'A shared baseline helps, but one course pitched at everyone motivates almost no one.'},
   {t:'Keep a short shared core, then tailor by role: what a frontline person, a manager, an executive and a builder each need to decide.', s:2, d:{trust:1, rigor:1, cred:1},
    fb:'Different roles are motivated by different challenges. Tailoring is what makes it feel like help, not compliance.'},
   {t:'Skip training. People will learn by doing.', s:0, d:{rigor:-1, trust:-1},
    fb:'Some will. Others will paste confidential data into the wrong tool first.'}]},

 {id:'checklist', slot:'trail', roles:['practitioner','steward','builder'], from:'On the floor', title:'Not every problem',
  text:'The {team} keep getting a step wrong because the procedure changed and nobody updated the guide. Someone suggests an AI assistant to coach them through it.',
  opts:[
   {t:'Pilot the assistant.', s:0, d:{rigor:-1, weeks:-1},
    fb:'An assistant answering from an out-of-date guide will be confidently wrong.'},
   {t:'Update the guide and add a one-page checklist, then see if any problem is left.', s:2, d:{rigor:1, trust:1, weeks:1},
    fb:'A checklist or training does the job here. Save the tool for the problem a checklist cannot solve.'},
   {t:'Add a second person to check every case.', s:0, d:{trust:-1, weeks:-1},
    fb:'That doubles the cost of a problem with a cheap fix.'}]},

 {id:'vendorstat', slot:'trail', roles:['sponsor','builder'], from:'From a vendor', title:'Ninety-five percent accurate',
  text:'A vendor’s model for this kind of step is “95% accurate”, according to their brochure. They offer a contract today.',
  opts:[
   {t:'Sign. The number is excellent.', s:0, d:{rigor:-2, cred:1},
    fb:'Accurate on whose data, measured how, against what definition? Their 95 can be your 33.'},
   {t:'Ask to test it on a sample of the Bank’s own cases, with your definition of a correct answer, before any contract.', s:2, d:{rigor:2},
    fb:'Test on your own data, every time. It is the cheapest insurance there is.'},
   {t:'Reject all vendor claims as marketing.', s:1, d:{rigor:1, cred:-1},
    fb:'Healthy scepticism. A test would settle it either way.'}],
  report:'sepsis'},
];

/* The charter: four questions to answer before any game, tool or pilot.
   They frame your own maps and every export. */
export const CHARTER = [
  {k:'challenge', label:'The challenge', q:'What behaviour should change, and what outcome would that produce?',
   hint:'Write it as a hypothesis: if people do X, then Y improves. For example: if staff log every contact meeting within two days, outreach covers every sector each year.'},
  {k:'success', label:'What success looks like', q:'How will you know it worked?',
   hint:'Two or three measures you could check in a month. Fewer errors, less rework, less waiting.'},
  {k:'tracking', label:'How it will be tracked', q:'Can your systems track it automatically, or would it need new manual work?',
   opts:[{id:'auto', name:'Systems already record it'},{id:'some', name:'Partly; some manual checks'},{id:'manual', name:'Mostly manual'},{id:'unsure', name:'Not sure yet'}]},
  {k:'audience', label:'Who it is for', q:'Who will use it, and who has to change how they work?', multi:true,
   opts:[{id:'practitioner', name:'People who do the work'},{id:'steward', name:'Team leads and managers'},{id:'sponsor', name:'Executives'},{id:'builder', name:'Builders and IT'}]},
];

/* A quiet challenge to a charter that will not hold up. */
export function charterNotes(c){
  const out = [];
  if(!c) return out;
  if(c.challenge && !/\b(then|so that|so|which|to)\b/i.test(c.challenge)) out.push('Say what the behaviour change would produce. A hypothesis has an “if” and a “then”.');
  if(c.tracking==='manual') out.push('Mostly manual tracking tends to fade within a month. Look for what the systems already record.');
  if(c.audience && c.audience.length===1 && c.audience[0]==='sponsor') out.push('A change only executives feel rarely changes the work. Who on the floor has to work differently?');
  return out;
}
