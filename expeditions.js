/* =====================================================================
   EXPEDITIONS
   Every process on the terrain map is playable. The four flagship
   processes (A–D in data.js) are fully authored. Every other process is
   written here in a compact form and expanded into the same shape.

   Compact step fields
     n     step name               who   who does it
     vol   volume                  sys   systems touched (comma separated)
     notes what happens            pain  the measured pain
     p     expert profile: "shape input rep stakes"
     alt   acceptable alternatives: "shape:check stakes:mid"
     best  strong-fit capabilities (space separated)
     ok    workable capabilities
     auto  best autonomy           autoOk acceptable autonomy
     why   the field's reasoning (also used as the strong-fit note)
     disc  two field notes: [title, text, effect]
     fv    "feasibility value" (low | mid | high)
     reality, metric, g (guardrails), hyp (value hypothesis), data
   ===================================================================== */

const FLAGSHIP = {briefing:'A', workorders:'B', benefitsq:'C', screening:'D'};

const COMPACT = {
 beigebook:{intro:'Before each rate-setting cycle, economists phone around the district to hear what businesses are seeing. The calls are rich; the notes are not. Walk the cycle.', steps:[
  {n:'Interview business contacts', who:'Regional economists', vol:'About 120 interviews per cycle', sys:'Phone, video calls, notebooks',
   notes:'Before each cycle, economists call about 120 business contacts: manufacturers, retailers, lenders, farmers. Notes are taken by hand during the call and typed up afterwards, sometimes days later.',
   pain:'Detail is lost between the call and the write-up. Two contacts complained last year that they had been quoted wrongly.',
   p:'summarize tacit mid mid', alt:'input:media shape:extract', best:'speech', ok:'summarize extract', auto:'review', autoOk:'assist',
   why:'Record with consent, transcribe, and give the economist a structured summary to correct while the call is still fresh.',
   disc:[['Consent is the gate','Several contacts speak only on condition that nothing is recorded.','Offer recording, never require it. Keep a notes-only path.'],['Calls already on a platform','Most calls now run over the Bank\u2019s video platform, which can transcribe inside the boundary.','Feasibility: a setting, not a project.']],
   fv:'high mid', reality:'Feasible now on the existing platform, for contacts who agree. Medium value: better notes, faster write-ups.',
   metric:'Days from call to filed note, and corrections requested by contacts', g:'privacy sampling logging', hyp:'File every interview note within a day, in the contact\u2019s own words.', data:'Consent wording, the call platform\u2019s transcription, a note template.'},
  {n:'Summarise and tag the interviews', who:'Regional economists', vol:'120 notes per cycle', sys:'Shared drive, tracking spreadsheet',
   notes:'Each typed note is read, summarised into two or three lines and tagged by sector, region and theme (hiring, prices, demand) in a tracking spreadsheet. Tags are chosen freely, so the same theme appears under several names.',
   pain:'A day and a half per economist per cycle, and themes cannot be counted reliably from one cycle to the next.',
   p:'summarize text high low', alt:'shape:route stakes:mid', best:'summarize classify', ok:'extract rules', auto:'review', autoOk:'auto',
   why:'Summarise each note and tag it against a fixed list of sectors and themes, with the economist confirming. The fixed list is what makes themes countable.',
   disc:[['Tags without a list','Forty-one theme tags were used last year for what are really nine themes.','Fix first: agree the theme list, then classify against it.'],['Ten years of notes','Notes going back a decade sit on the shared drive.','Data: a rich set for testing summaries and tags.']],
   fv:'high mid', reality:'A quick win once the theme list exists. Medium value alone, and the base for the district report.',
   metric:'Hours per cycle on summarising, and share of notes tagged from the agreed list', g:'sampling threshold logging', hyp:'Halve summarising time and make every theme countable across cycles.', data:'Typed notes, an agreed theme list, past summaries.'},
  {n:'Write the district report', who:'Senior economist', vol:'8 reports a year, about 12 pages each', sys:'Word processor, tracker, past reports',
   notes:'The senior economist reads the summaries, finds the patterns and writes the district\u2019s contribution to the national report: what contacts are seeing, with representative comments. Every quote must be anonymised.',
   pain:'Four days of reading summaries before writing starts. Patterns that cross sectors are easy to miss.',
   p:'draft text mid high', alt:'shape:summarize stakes:mid', best:'draft summarize', ok:'retrieve classify', auto:'assist',
   why:'A drafted pattern summary with supporting comments, anonymised, for the senior economist to rewrite. The judgment about what matters stays with the author.',
   disc:[['Published and scrutinised','The report is public and read closely by markets.','Risk: every claim traced to a note; nothing invented.'],['Anonymity','Comments become identifiable when sector and town are combined.','Check anonymisation before drafting, not after.']],
   fv:'mid high', reality:'High value on the critical path, medium feasibility because the output is public. A strategic bet.',
   metric:'Days from last interview to draft, and claims traced to a note', g:'logging sampling privacy', hyp:'Cut four days of reading to one and surface patterns across sectors.', data:'Tagged summaries, past reports, the anonymisation rules.'},
 ]},

 ratevote:{intro:'The president\u2019s view on the interest rate, formed eight times a year. The most consequential judgment in the building. Walk it, and see what you find.', steps:[
  {n:'Weigh the evidence', who:'The president', vol:'8 decisions a year', sys:'Briefing book, staff memos',
   notes:'In the final days before the meeting, the president reads the briefing book, meets the section chiefs and forms a view on the rate. It happens eight times a year.',
   pain:'There is no shortage of analysis. The president\u2019s constraint is time to think.',
   p:'decide text low high', alt:'input:structured', best:'fix', ok:'summarize retrieve', auto:'assist',
   why:'This judgment is not a target. Protect the president\u2019s thinking time by fixing the cycle upstream, which is where the briefing expedition goes.',
   disc:[['Eight a year','The volume is eight. No tool pays back on eight.','The value is upstream, in the briefing cycle.'],['Accountability','The decision is personal, public and accountable.','Nothing here should be delegated to a tool.']],
   fv:'low low', reality:'Avoid. Not because a tool cannot read a memo, but because this decision should not be shaped by one.',
   metric:'Hours the president spends reading versus deliberating', g:'escalation logging bias', hyp:'More time to think, by fixing the cycle that feeds the decision.', data:'None for a tool. The calendar is the data.'},
  {n:'Rehearse the arguments', who:'The president and senior advisers', vol:'2 sessions per cycle', sys:'Meeting rooms, briefing book',
   notes:'Twice a cycle, advisers argue the alternatives: hold, raise, cut. The president tests the reasoning and asks what would change the view.',
   pain:'Advisers sometimes converge too early, and dissenting views are under-argued.',
   p:'decide tacit low high', alt:'shape:suggest', best:'fix', ok:'retrieve summarize', auto:'assist',
   why:'A process fix: assign a formal dissent role in each session. A tool could surface past arguments, but the problem is the room, not the information.',
   disc:[['The dissent role','Other central banks rotate a designated dissenter.','Fix: a rule for the meeting, not a tool.'],['Sparse records','Notes from past sessions are informal and thin.','Not captured, and not worth capturing for a tool.']],
   fv:'high low', reality:'A fill-in at best, and the useful part is a meeting rule. Do it; do not call it AI.',
   metric:'Alternatives formally argued per session', g:'escalation logging', hyp:'Every alternative argued properly before the decision.', data:'The session format.'},
  {n:'Draft the policy statement', who:'Communications staff and the president', vol:'8 statements a year', sys:'Word processor, past statements',
   notes:'After the decision, a short statement is drafted word by word, because markets read every phrase. A change to a single adjective is debated.',
   pain:'Late nights before every release, but the care is the point.',
   p:'draft text low high', best:'retrieve', ok:'draft summarize', auto:'assist',
   why:'Retrieval can show exactly how each phrase was used before and how markets read it. The words stay entirely human.',
   disc:[['Every word moves markets','A changed phrase has moved bond yields within minutes.','Risk: nothing generated goes near the text.'],['Phrase history','Past statements and the market reaction to them are archived.','A narrow, safe use: look up precedent.']],
   fv:'high low', reality:'A small, safe assist: phrase precedent. Low value, because the people doing this are already very good at it.',
   metric:'Time to final text, and wording changed after precedent review', g:'logging escalation sampling', hyp:'Every precedent for a phrase on screen in seconds.', data:'Past statements and notes on the market reaction.'},
 ]},

 datacleaning:{intro:'Sixty research data sets, refreshed from sixty sources, kept alive by a handful of research assistants and their personal notes. Forty percent of researcher time goes here. Walk the pipeline.', steps:[
  {n:'Ingest new source files', who:'Research assistants', vol:'About 300 files a month from 60 sources', sys:'Download scripts, shared drive, statistical software',
   notes:'Assistants download files from statistical agencies, surveys and vendors, convert them to the Bank\u2019s formats and load them. Every source has its own quirks, recorded in personal notes.',
   pain:'When an assistant leaves, their sources break. Three data sets went stale for a quarter last year.',
   p:'coordinate structured high mid', alt:'shape:extract input:text stakes:low', best:'rules', ok:'agent extract fix', auto:'auto', autoOk:'review',
   why:'Scripted, documented ingestion for every source: plain engineering. AI helps only with the few sources that still publish PDFs.',
   disc:[['Knowledge in notebooks','Source quirks live in personal notes, not in code.','Capture the quirks in the pipeline itself.'],['Half are scripted','About half the sources already have scripts, written by different people in different styles.','Standardise the scripts before adding anything new.']],
   fv:'high mid', reality:'A quick win, and not an AI project. The value is reliability.',
   metric:'Data sets refreshed on schedule, and hours per month on ingestion', g:'logging rollback sampling', hyp:'Every source refreshed on schedule, whoever is on leave.', data:'Source list, existing scripts, assistants\u2019 notes.'},
  {n:'Clean and validate the data', who:'Research assistants and economists', vol:'60 data sets, refreshed monthly', sys:'Statistical software, validation scripts',
   notes:'After loading, the data is checked for missing values, breaks in series, outliers and units that changed. Some checks are scripted; most are done by eye in charts. Researchers say this is where the forty percent goes.',
   pain:'Errors found during analysis send researchers back to the start. Checking by eye does not scale.',
   p:'check structured high mid', best:'anomaly rules', ok:'predict extract', auto:'review', autoOk:'auto',
   why:'Rule checks for the known problems, anomaly detection for the unknown ones, and a researcher reviewing a ranked list instead of every chart.',
   disc:[['The known problems','Most errors fall into eight known types: unit changes, rebasings, missing months.','Rules for the eight; anomaly detection for the rest.'],['Alert fatigue','An earlier script flagged so much that people switched it off.','Tune thresholds with the researchers, and count the useful flags.']],
   fv:'high high', reality:'Quick win: structured data, clear errors, and the forty percent is measurable.',
   metric:'Researcher hours on validation, and errors found after analysis starts', g:'threshold sampling logging', hyp:'Return a large share of the forty percent to research.', data:'Data sets with their histories and past corrections.'},
  {n:'Document the data sets', who:'Research assistants', vol:'60 data sets, documentation rarely current', sys:'Wiki, statistical software',
   notes:'Each data set should have a page describing sources, definitions, transformations and changes. In practice the pages are written once and rarely updated.',
   pain:'Users ask the same definition questions every quarter. New researchers lose weeks learning what a variable means.',
   p:'draft structured mid low', alt:'shape:lookup input:text', best:'draft', ok:'retrieve rules fix', auto:'review', autoOk:'assist',
   why:'Draft documentation from the code and the data itself, and regenerate the change log on every refresh. The assistant reviews; the pages stay current.',
   disc:[['Code is the truth','The transformation code is accurate even when the wiki is not.','Generate from the code, not from memory.'],['Questions repeat','The same twenty definition questions come up every quarter.','Value: current pages answer them.']],
   fv:'high mid', reality:'Quick win with a medium prize. Pairs naturally with ingestion.',
   metric:'Data sets with current documentation, and definition questions per quarter', g:'sampling logging', hyp:'Every data set documented and current after each refresh.', data:'Transformation code, the wiki, past questions.'},
 ]},

 litreview:{intro:'Every research project starts with the literature: what is already known, by whom, and how well. Walk a project from first search to submission.', steps:[
  {n:'Search for relevant work', who:'Researchers', vol:'A few searches a week per researcher', sys:'Journal databases, working-paper archives',
   notes:'At the start of a project, a researcher searches journals and working-paper series for related work. Search terms are refined by hand, and relevant papers go into a personal reference manager.',
   pain:'Two to three days per project, and other central banks\u2019 working papers are often missed.',
   p:'lookup text mid low', best:'retrieve', ok:'recommend summarize', auto:'assist', autoOk:'review',
   why:'Semantic search across the archives, including other central banks\u2019 series, returning ranked papers with the passage that matched.',
   disc:[['Licences','Some journal licences forbid bulk processing.','Feasibility: start with the open archives.'],['Private libraries','Every researcher keeps a private reference library. Nobody can see what colleagues have found.','Fix: a shared library is half the value.']],
   fv:'mid mid', reality:'Sensible and bounded. Medium on both axes; the shared library is the quick part.',
   metric:'Days to an initial reading list, and relevant papers found late', g:'sampling logging', hyp:'A strong reading list in hours, not days.', data:'Archive access, licence terms, researchers\u2019 libraries.'},
  {n:'Read and digest the papers', who:'Researchers', vol:'20 to 60 papers per project', sys:'PDF reader, notes',
   notes:'The researcher reads each paper and notes its method, data, findings and limitations, building a picture of what is known.',
   pain:'The reading is the job. The note-taking around it is not, and every researcher redoes it.',
   p:'summarize text mid mid', best:'summarize extract', ok:'retrieve', auto:'assist',
   why:'A structured summary for each paper (question, method, data, finding, limitation) that the researcher checks against the paper. The reading stays human.',
   disc:[['Summaries can mislead','In a test, one summary in ten reversed a paper\u2019s main finding.','Risk: summaries are an index, never a substitute.'],['Five fields already','Researchers already note the same five fields by hand.','Extraction into those fields fits the habit.']],
   fv:'mid mid', reality:'Useful as an index, risky as a substitute. Build toward it with accuracy sampling.',
   metric:'Hours of note-taking per project, and summary errors found on audit', g:'sampling logging threshold', hyp:'Halve note-taking without cutting the reading.', data:'Papers, and researchers\u2019 existing notes for testing.'},
  {n:'Check citations before submission', who:'Research assistants', vol:'About 40 papers a year', sys:'Reference manager, source PDFs',
   notes:'Before a working paper goes out, an assistant checks every citation: author, year and title, and that the cited paper actually says what it is cited for.',
   pain:'Two days per paper, and the second check (does it really say that?) is often skipped.',
   p:'check text mid mid', best:'retrieve rules', ok:'anomaly extract', auto:'review', autoOk:'assist',
   why:'Rules for the formatting, retrieval to find the cited passage, and the assistant judging whether it supports the claim.',
   disc:[['Two checks, not one','Formatting errors are rules. Misattributed claims need the source passage.','Split the step: automate one half, assist the other.'],['Referees notice','Referees flagged citation problems on a quarter of submissions.','Value: a measurable reputational cost.']],
   fv:'high mid', reality:'A quick win for formatting; the claim check is a useful assist.',
   metric:'Hours per paper on checks, and citation issues raised by referees', g:'sampling logging', hyp:'Every citation checked both ways in an afternoon.', data:'Reference libraries, source PDFs, past referee comments.'},
 ]},

 datareq:{intro:'Students, journalists, analysts and other agencies send the Bank 1,100 data requests a year. Most are answerable from the website. Walk the desk.', steps:[
  {n:'Receive and sort requests', who:'Data desk', vol:'1,100 requests a year', sys:'Email, contact form',
   notes:'Requests arrive by email and a contact form. The desk reads each one and decides whether it is for a published series, a methods question, or something that needs a researcher.',
   pain:'Requests wait three days for a first look, and most are for published data.',
   p:'route text high low', best:'classify', ok:'rules fix converse', auto:'review', autoOk:'auto',
   why:'Classify each request by type, answer the published-data ones with a link, and route the rest.',
   disc:[['Seventy percent published','Seven in ten requests are for data already on the website.','Fix: make the data easier to find.'],['A labelled log','The desk logs every request with its type and outcome.','Data: training examples already exist.']],
   fv:'high mid', reality:'Quick win, with a process fix underneath it.',
   metric:'Days to first response, and requests answered without a researcher', g:'threshold escalation sampling', hyp:'A first response within a day for every request.', data:'The request log with outcomes.'},
  {n:'Answer from published data', who:'Data desk', vol:'About 800 a year', sys:'Website, series database, email templates',
   notes:'For published series, the desk finds the right table, checks the vintage and replies with a link and a short explanation of the definitions.',
   pain:'Twenty minutes each, and definitions are explained differently every time.',
   p:'lookup structured high low', alt:'input:text', best:'retrieve converse', ok:'draft fix', auto:'review', autoOk:'auto',
   why:'A grounded assistant over the published series and their documentation, as a self-service front door, with the desk handling what it cannot answer.',
   disc:[['Thin documentation','Documentation is thin for older series.','Link this to the data-set documentation work in research.'],['A public front door','An assistant on the public website speaks for the Bank.','Risk: answers cite the series, and say when they do not know.']],
   fv:'mid mid', reality:'Sensible, medium on both axes. The public-facing risk sets the pace.',
   metric:'Requests self-served, and answers corrected on audit', g:'escalation sampling logging', hyp:'Most published-data requests answered instantly and consistently.', data:'Series database, documentation, past answers.'},
  {n:'Handle research-level requests', who:'Researchers', vol:'About 300 a year', sys:'Email, statistical software',
   notes:'Some requests need a researcher: custom cuts of data, methods questions, unpublished detail. The desk assigns them, usually to whoever answered last time.',
   pain:'The same few researchers carry the load, about a week each per quarter.',
   p:'decide text mid mid', alt:'shape:lookup', best:'retrieve', ok:'draft recommend fix', auto:'assist', autoOk:'review',
   why:'Retrieval over past answers so researchers start from precedent, plus a fairer assignment rule.',
   disc:[['Answered before','A third of research-level questions were answered before, in someone\u2019s sent mail.','Capture answers centrally.'],['Assignment by habit','Assigning to whoever answered last concentrates the load.','Fix: a rota.']],
   fv:'high low', reality:'A fill-in. A rota and a shared answer library do most of it; a tool adds a little.',
   metric:'Researcher hours on requests, and load spread across the team', g:'sampling logging', hyp:'Spread the load and halve time per answer.', data:'Past answers from sent mail, the request log.'},
 ]},

 energy:{intro:'Chillers, boilers and power for three buildings and two data halls, run through a vendor\u2019s control system. Energy costs sit nine percent above similar buildings. Walk the plant.', steps:[
  {n:'Monitor and tune the plant', who:'Plant operators', vol:'Continuous, across three buildings', sys:'Vendor building automation system',
   notes:'Operators watch the chillers, boilers and power systems through the vendor\u2019s control system and adjust setpoints by experience as weather and occupancy change.',
   pain:'Setpoints are conservative, so the plant runs harder than it needs to. Energy cost is 9% above peer buildings.',
   p:'allocate structured high mid', alt:'shape:check stakes:high', best:'optimize', ok:'predict anomaly', auto:'review', autoOk:'assist',
   why:'Optimised setpoints from weather and occupancy forecasts, proposed to operators, inside the vendor system where possible.',
   disc:[['The vendor owns the controls','Changes to the control logic need the vendor, under contract.','Feasibility: a contract conversation comes first.'],['A real benchmark','The 9% gap is measured against similar buildings.','Value: real, and bounded.']],
   fv:'low mid', reality:'Medium value, low feasibility while the vendor controls the logic. Park it until the contract renews.',
   metric:'Energy cost per square foot, weather-adjusted', g:'rollback logging escalation', hyp:'Close half the gap to peer buildings.', data:'Plant data, weather, occupancy, the vendor contract.'},
  {n:'Forecast energy demand', who:'Energy manager', vol:'A monthly budget and daily purchasing', sys:'Spreadsheet, utility bills',
   notes:'The energy manager forecasts demand for the budget and for buying power in advance, using last year\u2019s bills and a spreadsheet.',
   pain:'Forecasts miss by 12%, and power bought at short notice costs more.',
   p:'predict structured mid low', alt:'stakes:mid', best:'predict', ok:'rules anomaly', auto:'review', autoOk:'auto',
   why:'A demand forecast built from history, weather and the events calendar. A mature technique for a modest effort.',
   disc:[['Five years of bills','Utility bills and meter data go back five years.','Data: ready.'],['Events drive the peaks','Large events in the conference centre drive the demand peaks.','Use the events calendar as an input.']],
   fv:'high mid', reality:'Quick win: the data is ready, the technique is mature, the savings are measurable.',
   metric:'Forecast error, and cost of short-notice power purchases', g:'sampling logging', hyp:'Halve forecast error and short-notice purchases.', data:'Meter data, bills, weather, the events calendar.'},
  {n:'Report on sustainability', who:'Facilities analyst', vol:'Quarterly and annual reports', sys:'Spreadsheets, utility portals, invoices',
   notes:'Each quarter, an analyst collects energy, water and waste figures from utility portals and invoices, converts them to emissions and writes the sustainability report.',
   pain:'Two weeks a quarter, most of it collection.',
   p:'coordinate text mid mid', alt:'shape:extract input:structured', best:'rules extract', ok:'draft agent', auto:'review', autoOk:'auto',
   why:'Automate collection from the portals that offer data, extract the rest from invoices, and calculate by rule. The analyst writes the commentary.',
   disc:[['Exports nobody uses','Four of six utility portals offer data exports nobody uses.','Fix: use the exports.'],['Audited figures','The annual figures are published and audited.','Keep a full trail from source to figure.']],
   fv:'high low', reality:'Easy and cheap, with a small prize. A fill-in.',
   metric:'Analyst days per quarter', g:'logging sampling', hyp:'Cut two weeks a quarter to three days.', data:'Portal access, invoices, emission factors.'},
 ]},

 spaceplan:{intro:'Who sits where, which floors get renovated, and how space is measured. A few large decisions a year. Walk it.', steps:[
  {n:'Measure how space is used', who:'Workplace team', vol:'Two walk-round surveys a year', sys:'Badge data, room booking system, clipboards',
   notes:'Twice a year, the team walks the floors counting occupied desks and rooms. Badge and booking data exist but have never been combined.',
   pain:'A snapshot twice a year, used for decisions worth millions.',
   p:'check structured low mid', alt:'shape:predict', best:'fix rules', ok:'predict vision', auto:'auto', autoOk:'review',
   why:'Combine badge and booking data into a continuous occupancy view. That is reporting, not AI.',
   disc:[['The data already exists','Badge and booking systems hold three years of data.','Feasibility: a report, not a model.'],['Individuals in the data','Badge data shows where individual people are.','Aggregate before anyone sees it.']],
   fv:'high mid', reality:'A quick win, and not an AI project.',
   metric:'Occupancy measured weekly instead of twice a year', g:'privacy logging', hyp:'Replace two snapshots a year with a weekly view.', data:'Badge and booking data, aggregated.'},
  {n:'Handle workplace requests', who:'Workplace coordinators', vol:'About 60 requests a week', sys:'Email, room booking system',
   notes:'Requests for desk moves, room setups and furniture arrive by email and are handled one by one, each with a manager approval.',
   pain:'A routine desk move takes a week because each one needs an email thread.',
   p:'coordinate text mid low', best:'fix rules', ok:'classify agent', auto:'auto', autoOk:'review',
   why:'A request form with standard options and approval by rule. Most moves become self-service.',
   disc:[['Five request types','Five request types make up most of the volume.','Fix: a form for the five.'],['Approvals always given','Managers have never refused a standard move.','Remove the approval for standard moves.']],
   fv:'high low', reality:'A fill-in and a process fix.',
   metric:'Days to complete a standard move', g:'logging rollback', hyp:'Standard moves done within a day.', data:'Request history, the booking system.'},
  {n:'Decide the next renovation', who:'Workplace committee', vol:'One or two decisions a year', sys:'Committee papers',
   notes:'A committee decides which floors to renovate and how, weighing occupancy, condition and requests from departments. The decisions are large and debated.',
   pain:'Departments lobby, and the evidence is thin.',
   p:'decide tacit low high', alt:'input:structured', best:'fix', ok:'recommend predict', auto:'assist',
   why:'Better evidence from the occupancy view, presented plainly, against published criteria. The committee decides; there is no volume to automate.',
   disc:[['Two decisions a year','There is no volume here.','The value is in the evidence, not a tool.'],['Loudest voice wins','Requests are weighed by who asks loudest.','Fix: publish the criteria.']],
   fv:'high low', reality:'A fill-in: publish the criteria and use the occupancy data. No tool needed.',
   metric:'Decisions made against published criteria', g:'bias logging', hyp:'Renovation decisions made on evidence and criteria.', data:'The occupancy view, condition surveys.'},
 ]},

 eventreq:{intro:'About 1,900 meetings and events a year, from board meetings to conferences. Every one needs a room, AV, catering and security clearance, in four systems. Walk an event.', steps:[
  {n:'Take the request', who:'Event coordinators', vol:'About 1,900 events a year', sys:'Email, phone, web form',
   notes:'Hosts request events by email or phone with partial details: a date, a rough headcount, \u201cthe usual setup\u201d. Coordinators go back and forth to fill the gaps.',
   pain:'Three emails on average before a request is complete.',
   p:'extract text high low', alt:'shape:coordinate', best:'fix extract', ok:'converse agent', auto:'auto', autoOk:'review',
   why:'A guided request form as the default, and extraction for the emails that still arrive, asking the host for whatever is missing.',
   disc:[['\u201cThe usual\u201d','\u201cThe usual setup\u201d always means one of eight standard layouts.','Put the eight layouts in the form.'],['Repeat hosts','Forty hosts book most of the events.','Remember their preferences.']],
   fv:'high mid', reality:'Quick win: a form fix and modest extraction.',
   metric:'Emails per request, and days to a complete request', g:'threshold escalation', hyp:'Complete requests on first contact.', data:'Past requests, the eight standard layouts.'},
  {n:'Coordinate room, AV, catering and security', who:'Event coordinators', vol:'About 1,900 events, four systems each', sys:'Room booking, AV ticketing, catering portal, security clearance',
   notes:'For each event, the coordinator books the room, raises an AV ticket, orders catering and submits the attendee list for clearance, in four separate systems, then chases each one.',
   pain:'Forty minutes of re-keying per event, and one in twenty has a missing piece found on the day.',
   p:'coordinate structured high mid', best:'agent rules', ok:'fix', auto:'review', autoOk:'assist',
   why:'An agent that takes one complete request, raises the four bookings, tracks them and flags anything unconfirmed two days out. Coordinators approve.',
   disc:[['No integrations','None of the four systems talk to each other.','An agent bridges; integration fixes. Plan both.'],['Clearance by a person','Security clearance must be submitted by a person under policy.','The agent prepares; a coordinator submits.']],
   fv:'mid high', reality:'High value with real coordination pain. Medium feasibility across four systems: a strategic bet.',
   metric:'Minutes per event on coordination, and events with a missing piece', g:'logging escalation rollback', hyp:'Cut coordination time by two thirds and end the day-of surprises.', data:'Access to the four systems, past events.'},
  {n:'Clear attendees with security', who:'Coordinators and desk officers', vol:'About 40,000 attendees a year', sys:'Spreadsheets, visitor management system',
   notes:'Attendee lists arrive in whatever format the host sends: spreadsheets, emails, scanned sign-up sheets. Coordinators reformat them for security, who load them into the visitor system.',
   pain:'Lists arrive late and messy, and officers end up re-keying them at the desk.',
   p:'extract text high mid', alt:'input:media', best:'extract', ok:'fix rules', auto:'review',
   why:'Extract attendee lists into the visitor system\u2019s format, with uncertain entries flagged for the coordinator.',
   disc:[['Same problem, different door','This is visitor pre-registration in another form.','Solve it once for both.'],['Personal data','Attendee lists include personal details.','Handle them under the visitor-data policy.']],
   fv:'high mid', reality:'Quick win, shared with visitor screening.',
   metric:'Lists re-keyed by hand, and attendees held at the desk', g:'privacy threshold logging', hyp:'No attendee list re-keyed by hand.', data:'Past lists, the visitor system format.'},
 ]},

 tours:{intro:'Schools and public groups visit the Bank\u2019s exhibition about 250 times a year, half of them in spring. Walk a visit.', steps:[
  {n:'Book tours', who:'Events team', vol:'About 250 tours a year', sys:'Email, calendar',
   notes:'Schools and groups email to ask for a tour. The team checks the calendar, offers dates and confirms by email.',
   pain:'Five emails per booking in the spring peak.',
   p:'coordinate text mid low', best:'fix rules', ok:'converse', auto:'auto',
   why:'An online booking form showing the available slots. A rule, not AI.',
   disc:[['Seasonal','Half the bookings arrive in March and April.','Size the solution for the peak, not the year.'],['A tool you own','The Bank already licenses a booking tool for its training rooms.','Reuse it.']],
   fv:'high low', reality:'A fill-in: reuse the booking tool.',
   metric:'Emails per booking', g:'logging', hyp:'Bookings confirmed without an email thread.', data:'The tour calendar, the existing booking tool.'},
  {n:'Answer visitor questions', who:'Events team', vol:'About 1,000 questions a year', sys:'Email, website',
   notes:'Groups ask about access, parking, age limits and what to bring. The answers are on the website, if you can find them.',
   pain:'Repeat questions take a day a week in spring.',
   p:'lookup text mid low', best:'fix', ok:'retrieve converse', auto:'auto', autoOk:'review',
   why:'Rewrite the visitor page around the ten questions people actually ask. An assistant would only answer the same ten.',
   disc:[['Ten questions','Ten questions cover most of the volume.','Fix the page first.'],['A pack for parents','Schools need a printable pack for parents.','A document, not a chatbot.']],
   fv:'high low', reality:'A fill-in: a better web page.',
   metric:'Repeat questions per week in spring', g:'sampling', hyp:'Halve the repeat questions.', data:'The question log, the visitor page.'},
  {n:'Run the tour', who:'Tour guides', vol:'About 250 tours a year', sys:'Tour scripts, the exhibition',
   notes:'Guides lead groups through the exhibition and the money museum, adapting the script to the audience as they go.',
   pain:'Guides are stretched in spring, but the guided tour is the experience.',
   p:'physical tacit mid low', best:'fix', ok:'speech converse', auto:'assist',
   why:'The human tour is the point. If capacity is the issue, a self-guided audio route for some groups is a product decision, not an AI use case.',
   disc:[['The highlight','Visitor surveys rate the guides as the highlight of the visit.','Do not automate the highlight.'],['An audio route','A self-guided route already exists for the museum.','Extend it if capacity is the constraint.']],
   fv:'mid low', reality:'Avoid: the human part is the value.',
   metric:'Tours delivered against demand', g:'escalation', hyp:'Meet spring demand without losing the guided experience.', data:'Tour demand by month.'},
 ]},

 incidents:{intro:'Thirty-five incident reports a day across three buildings: a dispute at the desk, a door alarm, a medical assist. Reports can become evidence. Walk an incident from scene to review.', steps:[
  {n:'Capture the incident at the scene', who:'Officers', vol:'About 35 incidents a day', sys:'Notebooks, body-worn recorders',
   notes:'Officers note what happened in a notebook or on a recorder at the scene: who, where, when, what was said. How much detail depends on how busy the shift is.',
   pain:'Notes are thinnest when it matters most: busy shifts and several incidents at once.',
   p:'summarize media high mid', alt:'shape:extract input:tacit stakes:high', best:'speech', ok:'summarize extract', auto:'review', autoOk:'assist',
   why:'Dictation at the scene, transcribed into the report fields, so the record is made while memory is fresh.',
   disc:[['Recorders exist','Officers already carry recorders, and consent and retention rules are in place.','Data: ready.'],['Noise','Lobbies and loading docks are loud.','Pilot in the real environment.']],
   fv:'high mid', reality:'Quick win on equipment the officers already carry.',
   metric:'Report completeness on review', g:'privacy logging sampling', hyp:'A complete record of every incident.', data:'Recorder audio, the report fields.'},
  {n:'Write the report', who:'Officers', vol:'About 35 a day', sys:'Report system',
   notes:'After the shift, officers type the report into a fixed format from their notes. Reports may later be used in proceedings, so the wording matters.',
   pain:'Forty minutes per report at the end of a long shift.',
   p:'draft text high high', alt:'input:media stakes:mid', best:'draft', ok:'summarize speech', auto:'assist',
   why:'A drafted report in the required format from the officer\u2019s dictation, for the officer to correct and sign. The officer owns every word.',
   disc:[['Evidence standards','If a report is used in proceedings, the tool\u2019s contribution must be disclosed.','Log the draft and every edit the officer makes.'],['A fixed format','The report format is fixed and well understood.','Drafting into it is straightforward.']],
   fv:'mid high', reality:'High value for officer time; medium feasibility until the evidence question is answered. A strategic bet.',
   metric:'Minutes per report, and reports returned for correction', g:'logging escalation sampling', hyp:'Halve the time per report.', data:'Past reports, the format, legal guidance.'},
  {n:'Review and classify reports', who:'Supervisors', vol:'About 35 a day, two hours per building', sys:'Report system',
   notes:'Supervisors read every report, check it is complete, classify it by type and seriousness, and send the serious ones upward.',
   pain:'Classification varies by supervisor, and serious reports wait in the same queue as minor ones.',
   p:'route text high mid', alt:'shape:check stakes:high', best:'classify', ok:'summarize rules', auto:'review', autoOk:'assist',
   why:'Classify reports by type and seriousness and order the queue, so supervisors read the serious ones first. Supervisors confirm every classification.',
   disc:[['Inconsistent labels','Two supervisors classify the same incident differently a third of the time.','Agree the categories before training anything.'],['Two years labelled','Two years of classified reports exist.','Data: usable once the categories are agreed.']],
   fv:'high mid', reality:'Quick win once the categories are agreed.',
   metric:'Minutes until a serious report is reviewed, and classification agreement', g:'threshold escalation sampling', hyp:'Serious reports reviewed within the hour.', data:'Classified reports, agreed categories.'},
 ]},

 shifts:{intro:'A hundred and ninety officers, three buildings, around the clock. The roster lives in a spreadsheet and changes by phone. Walk a week.', steps:[
  {n:'Build the weekly roster', who:'Shift sergeants', vol:'190 officers, every week', sys:'Spreadsheet, leave system',
   notes:'Sergeants build next week\u2019s roster in a spreadsheet: coverage minimums for each post, certifications, leave, training and overtime rules.',
   pain:'A sergeant-day a week per building, and coverage gaps found late.',
   p:'allocate structured high mid', alt:'input:tacit', best:'optimize', ok:'rules predict', auto:'review', autoOk:'auto',
   why:'Constraint-based rostering that proposes a compliant roster; the sergeant adjusts and publishes.',
   disc:[['The rules are written','Minimums, certifications and overtime rules are in policy and the collective agreement.','Data: the constraints are already captured.'],['Fairness matters','Officers care about the fair distribution of nights and overtime.','Make the fairness rules explicit and visible.']],
   fv:'high high', reality:'Quick win: written rules, a clear cost, a mature technique.',
   metric:'Sergeant hours on rostering, and coverage gaps', g:'logging rollback bias', hyp:'Return a day a week to each sergeant.', data:'Posts, certifications, leave, the agreement rules.'},
  {n:'Fill changes during the week', who:'Shift sergeants', vol:'About 40 changes a week', sys:'Phone, spreadsheet',
   notes:'Sickness, events and incidents change the roster daily. Sergeants phone around for cover, from memory of who might say yes.',
   pain:'Each gap takes an hour of calls, and the same officers are asked every time.',
   p:'coordinate structured high mid', alt:'shape:allocate', best:'optimize agent', ok:'rules', auto:'review',
   why:'Re-optimise on each change and offer the shift to eligible officers in a fair order through the app; the sergeant confirms.',
   disc:[['The same names','Twelve officers take most of the overtime.','Fairness: rotate the offers by rule.'],['An app nobody uses for this','Officers have a scheduling app that only shows the roster.','Use it to offer shifts.']],
   fv:'mid mid', reality:'Sensible, medium on both axes. Build it after the base roster.',
   metric:'Time to fill a gap, and how evenly overtime is spread', g:'bias logging escalation', hyp:'Fill gaps in minutes, and fairly.', data:'Roster, availability, overtime history.'},
  {n:'Forecast staffing demand', who:'Operations lieutenant', vol:'A quarterly plan', sys:'Events calendar, visitor counts',
   notes:'Each quarter, the lieutenant estimates demand from the events calendar and visitor patterns, to set overtime budgets and training dates.',
   pain:'Overtime runs 14% over budget, and peaks are planned from memory.',
   p:'predict structured low mid', alt:'rep:mid', best:'predict', ok:'rules', auto:'review',
   why:'A demand forecast from visitor counts and the events calendar, feeding the roster.',
   disc:[['Three years of counts','Daily visitor counts exist for three years.','Data: ready.'],['Four times a year','The forecast is made four times a year.','Low volume: keep it simple.']],
   fv:'high mid', reality:'Quick win, of modest size.',
   metric:'Overtime against budget', g:'sampling logging', hyp:'Bring overtime within budget.', data:'Visitor counts, events, overtime history.'},
 ]},

 helpdesk:{intro:'Three thousand one hundred tickets a month, and thirty-eight percent of them are password resets and access requests. Walk the desk.', steps:[
  {n:'Reset passwords and grant access', who:'Service desk analysts', vol:'About 1,200 a month, 38% of tickets', sys:'Ticketing, directory, phone',
   notes:'Password resets and access requests come in by phone or ticket. An analyst verifies the caller and actions the change in the directory. Each takes minutes; together they are over a third of the desk.',
   pain:'Analysts spend a third of their time on work that needs no judgment.',
   p:'coordinate structured high low', alt:'stakes:mid', best:'fix rules', ok:'agent converse', auto:'auto',
   why:'Self-service reset and an access-request workflow with approvals by rule. No AI needed: just remove the ticket.',
   disc:[['Already bought','The Bank licenses self-service reset. It was never rolled out.','Fix: turn it on.'],['Verification is the risk','Identity checks are where resets go wrong.','Use multi-factor verification in the self-service flow.']],
   fv:'high high', reality:'The biggest quick win in IT, and not an AI project.',
   metric:'Reset and access tickets per month', g:'logging escalation', hyp:'Take a third of tickets off the desk.', data:'Directory, the self-service licence.'},
  {n:'Triage and route tickets', who:'Service desk analysts', vol:'About 1,900 other tickets a month', sys:'Ticketing, email',
   notes:'The remaining tickets are read and assigned to a resolver group: desktop, network, applications, market data. Misrouted tickets bounce between groups.',
   pain:'A fifth of tickets are misrouted, and each bounce adds a day.',
   p:'route text high low', best:'classify', ok:'rules agent', auto:'review', autoOk:'auto',
   why:'Classify tickets to resolver groups with a confidence threshold; the unsure ones go to an analyst.',
   disc:[['Labelled history','Three years of tickets carry their final resolver group.','Data: ready.'],['Four problem categories','Bounces cluster in four categories with vague definitions.','Fix the four definitions.']],
   fv:'high mid', reality:'Quick win.',
   metric:'Misrouted tickets, and time to reach the right group', g:'threshold sampling', hyp:'Halve misrouting.', data:'Ticket history.'},
  {n:'Resolve common issues', who:'Resolver groups', vol:'About 1,000 a month', sys:'Knowledge base, ticketing',
   notes:'Analysts search the knowledge base for a fix, try it and update the ticket. The knowledge base has 2,000 articles, many of them out of date.',
   pain:'Analysts skip the knowledge base and ask a colleague instead.',
   p:'lookup text high low', best:'retrieve', ok:'converse draft fix', auto:'review', autoOk:'assist',
   why:'Retrieval over current articles and resolved tickets, suggesting the likely fix to the analyst, and to staff directly for the simplest issues.',
   disc:[['Stale articles','A third of the articles describe systems that no longer exist.','Curate first: a confident wrong answer is worse than none.'],['The real fixes','Resolved tickets hold the fixes that actually worked.','Use them as a second source.']],
   fv:'mid mid', reality:'Sensible, medium on both axes. Curation is the hidden cost.',
   metric:'Time to resolve, and issues resolved at first contact', g:'sampling escalation', hyp:'Resolve more at first contact.', data:'Knowledge base, resolved tickets.'},
 ]},

 accessreview:{intro:'Four hundred applications, 2,400 people, and access that accumulates. Walk access from joining to leaving.', steps:[
  {n:'Provision joiners and movers', who:'Identity team', vol:'About 70 joiners and movers a month', sys:'HR system, directory, 400 applications',
   notes:'When someone joins or moves, the identity team works out which applications they need from their role and the manager\u2019s email, then raises access in each one.',
   pain:'New starters wait four days for full access.',
   p:'coordinate structured high mid', alt:'input:text', best:'rules', ok:'agent recommend', auto:'auto', autoOk:'review',
   why:'Role-based access rules driven by the HR system, with exceptions approved by the manager.',
   disc:[['No role models','Access by role was never defined; it is copied from a colleague.','Define the roles first.'],['The feed exists','The HR system already sends a daily feed of joiners and movers.','Data: ready.']],
   fv:'mid mid', reality:'Sensible. Defining the roles is the real work.',
   metric:'Days to full access', g:'logging rollback', hyp:'Full access on day one.', data:'HR feed, role definitions.'},
  {n:'Review access twice a year', who:'Application owners and managers', vol:'400 applications, twice a year', sys:'Spreadsheets, email',
   notes:'Twice a year, managers receive spreadsheets showing who has access to what, and are asked to confirm. Most approve everything.',
   pain:'Six weeks of chasing for reviews that rubber-stamp.',
   p:'check structured mid high', best:'anomaly rules', ok:'recommend', auto:'assist', autoOk:'review',
   why:'Flag the unusual (access unlike peers, unused for months, risky combinations) so managers review twenty lines, not two thousand.',
   disc:[['Rubber stamps','Managers approved 99.6% of lines in the last cycle.','Change: show them only what needs a decision.'],['Usage data','Login data shows which access is never used.','A strong signal for removal.']],
   fv:'high high', reality:'Quick win with a real reduction in risk.',
   metric:'Lines reviewed per manager, and access removed', g:'logging escalation sampling', hyp:'Shorter reviews that actually remove risky access.', data:'Entitlements, login data, peer roles.'},
  {n:'Remove access for leavers', who:'Identity team', vol:'About 25 leavers a month', sys:'HR system, directory, applications',
   notes:'When someone leaves, their directory account is disabled the same day; access to individual applications is removed over the following weeks.',
   pain:'Audit found leavers with application access months after they left.',
   p:'coordinate structured mid high', best:'rules', ok:'agent anomaly', auto:'auto', autoOk:'review',
   why:'Automatic removal driven by the HR feed, with a reconciliation report for the applications that cannot be automated.',
   disc:[['An open audit finding','The finding is still open with the auditors.','Value: closes an audit issue.'],['Forty without connectors','Forty applications have no automated connector.','Report them weekly until they are connected.']],
   fv:'high mid', reality:'Quick win, and not an AI project.',
   metric:'Leavers with access remaining after 24 hours', g:'logging sampling', hyp:'No leaver keeps access past a day.', data:'HR feed, application inventory.'},
 ]},

 roadmap:{intro:'Once a year, IT decides the next three years of investment. Strategic, debated, and important. Walk the cycle.', steps:[
  {n:'Gather demand from the business', who:'IT strategy team', vol:'Once a year', sys:'Interviews, spreadsheets',
   notes:'Each year the strategy team interviews department heads about their needs and collects the requests in a spreadsheet.',
   pain:'Requests are vague, and duplicated across departments.',
   p:'summarize tacit low mid', alt:'input:text', best:'fix', ok:'summarize classify', auto:'assist',
   why:'A standard request template and a shared view of requests. Summarisation would help a little, once a year.',
   disc:[['Once a year','The exercise runs once a year.','No volume for a tool.'],['Six identical requests','Six departments asked for the same document system.','A shared view finds them. No AI needed.']],
   fv:'high low', reality:'A fill-in.',
   metric:'Duplicate requests found before planning', g:'logging', hyp:'A clean, de-duplicated list of demand.', data:'A request template.'},
  {n:'Prioritise the investments', who:'IT leadership', vol:'Once a year', sys:'Committee papers',
   notes:'Leadership weighs the requests against budget, risk and strategy, and decides the three-year plan.',
   pain:'The decisions are debated for weeks.',
   p:'decide tacit low high', best:'fix', ok:'recommend', auto:'assist',
   why:'Scoring criteria agreed in advance. The decision is strategic and stays human.',
   disc:[['No criteria','No scoring criteria have ever been agreed.','Fix: agree them first.'],['Multi-year commitments','The decisions commit budgets and contracts for years.','Not a decision for a tool.']],
   fv:'mid low', reality:'Avoid as an AI target. Agree the criteria.',
   metric:'Weeks to an agreed plan', g:'bias logging', hyp:'A plan agreed in weeks, on criteria.', data:'Criteria, budget.'},
  {n:'Write the roadmap document', who:'IT strategy team', vol:'Once a year, about 40 pages', sys:'Word processor',
   notes:'The decisions are written up as a roadmap document for the board.',
   pain:'Three weeks of drafting.',
   p:'draft text low mid', best:'draft', ok:'summarize', auto:'assist',
   why:'A general-purpose drafting assistant inside the approved environment is enough. This is not a dedicated use case.',
   disc:[['General tools suffice','Any approved assistant can help draft a document once a year.','No dedicated project needed.'],['A board audience','The board reads it closely.','The authors own every word.']],
   fv:'high low', reality:'A fill-in: use the general assistant.',
   metric:'Weeks spent drafting', g:'logging sampling', hyp:'A draft in one week, not three.', data:'The decisions, last year\u2019s roadmap.'},
 ]},

 policyq:{intro:'Fourteen hundred policy questions a quarter about leave, travel, conduct and pay. Most answers already sit in the policy library. Walk the inbox.', steps:[
  {n:'Receive and sort questions', who:'HR advisers', vol:'1,400 tickets a quarter', sys:'HR inbox, ticketing',
   notes:'Managers and staff email the HR inbox. An adviser reads each message and either answers it or passes it to a specialist.',
   pain:'A two-day wait for answers that are usually in the policy.',
   p:'route text high low', alt:'shape:lookup', best:'classify', ok:'rules converse', auto:'review', autoOk:'auto',
   why:'Classify by topic and route. General questions go straight to the answer step; personal cases go to a person.',
   disc:[['Six topics','Six topics cover 80% of questions.','Route by topic.'],['Personal cases','Some questions are about one employee\u2019s own situation.','Those always go to a person.']],
   fv:'high mid', reality:'Quick win.',
   metric:'Time to first response', g:'threshold escalation', hyp:'Same-day first response.', data:'Ticket history.'},
  {n:'Answer from the policy library', who:'HR advisers', vol:'About 1,000 a quarter', sys:'Policy library, intranet',
   notes:'Advisers find the right policy, read the relevant clause and answer, often paraphrasing the same paragraph for the hundredth time.',
   pain:'Answers vary between advisers, and managers shop around for the answer they want.',
   p:'lookup text high mid', alt:'stakes:low', best:'retrieve converse', ok:'draft fix', auto:'review', autoOk:'auto',
   why:'A grounded assistant over the policy library that cites the clause, for staff to self-serve, with a clear path to an adviser.',
   disc:[['Current policies','The policy library was overhauled last year.','Data: ready.'],['Answer shopping','Managers ask several advisers until they hear yes.','Consistency is the value.']],
   fv:'high high', reality:'Quick win: current documents, high volume, measurable consistency.',
   metric:'Questions self-served, and consistency on audit', g:'escalation sampling logging', hyp:'Most policy questions answered instantly and consistently.', data:'Policy library, past answers.'},
  {n:'Spot sensitive cases early', who:'HR specialists', vol:'About 150 a quarter', sys:'HR inbox, case files',
   notes:'Some questions are really cases: conduct concerns, accommodations, disputes. They need a specialist and confidential handling, but they arrive in the same inbox as everything else.',
   pain:'Two sensitive cases sat in the routine queue for a week last year.',
   p:'route text mid high', alt:'shape:check', best:'classify', ok:'rules', auto:'assist',
   why:'Flag likely sensitive cases for a specialist the moment they arrive. The specialist decides everything after that.',
   disc:[['Confidential','Case details are confidential and sometimes legally privileged.','Risk: minimal access, full logging.'],['Speed where it matters','Delay hurts most on exactly these cases.','Value: speed for the cases that matter most.']],
   fv:'mid mid', reality:'Sensible but sensitive. Build toward it with strict controls.',
   metric:'Hours until a sensitive case reaches a specialist', g:'privacy escalation logging', hyp:'Every sensitive case with a specialist within hours.', data:'Past cases, under strict access.'},
 ]},

 recruit:{intro:'Around 220 roles a year under public-sector hiring rules, and a 74-day time to hire. Decisions about people, closely scrutinised. Walk a hire.', steps:[
  {n:'Write and post the job', who:'Recruiters and hiring managers', vol:'About 220 roles a year', sys:'Applicant tracking system',
   notes:'Hiring managers draft a job description from an old one. Recruiters edit it to public-sector rules and post it.',
   pain:'A week of back and forth per posting.',
   p:'draft text mid mid', best:'draft', ok:'retrieve rules', auto:'assist', autoOk:'review',
   why:'Draft from the standard role profile and the rules, with the recruiter reviewing, and check the language for bias.',
   disc:[['Forty profiles','Most roles map to forty standard profiles.','Start from the profile.'],['Words decide who applies','Wording affects who applies.','Add an inclusive-language check.']],
   fv:'high mid', reality:'A modest quick win.',
   metric:'Days from request to posting', g:'bias sampling', hyp:'Post in two days, not a week.', data:'Role profiles, past postings.'},
  {n:'Schedule interviews', who:'Recruiting coordinators', vol:'About 1,300 interviews a year', sys:'Email, calendars',
   notes:'Coordinators find times that suit three to five panel members and the candidate, then book rooms.',
   pain:'A dozen emails per interview, and candidates drop out while they wait.',
   p:'allocate structured high low', alt:'shape:coordinate', best:'optimize agent', ok:'rules', auto:'auto', autoOk:'review',
   why:'Scheduling across calendars, with candidates booking their own slot.',
   disc:[['Shared calendars','Panel calendars are visible internally.','Data: ready.'],['Candidates drop out','Slow scheduling loses good candidates.','Value beyond the hours saved.']],
   fv:'high mid', reality:'Quick win.',
   metric:'Days to schedule an interview', g:'logging', hyp:'Interviews booked within a day.', data:'Calendars, rooms.'},
  {n:'Screen applicants', who:'Recruiters', vol:'About 9,000 applications a year', sys:'Applicant tracking system',
   notes:'Recruiters read each application against the minimum qualifications and shortlist for the hiring manager. Public-sector rules require screening to be consistent and auditable.',
   pain:'Three weeks on screening, and applicants complain about the silence.',
   p:'decide text high high', alt:'shape:check', best:'rules', ok:'extract recommend', auto:'assist', autoOk:'review',
   why:'Rules for the minimum qualifications, applied transparently. Ranking candidates with AI is high-risk and closely scrutinised; keep it out of scope.',
   disc:[['Under scrutiny','Automated screening of people faces legal and public scrutiny.','Risk: a person on every decision, and outcomes audited.'],['Minimums are rules','Minimum qualifications are written down and checkable.','Rules first.']],
   fv:'low mid', reality:'Park it: the risk and scrutiny outweigh the gain for now.',
   metric:'Days to shortlist, and outcome parity across groups', g:'bias logging escalation', hyp:'A shortlist in a week, screened consistently.', data:'Applications, the qualification rules.'},
 ]},

 perf:{intro:'Twenty-four hundred reviews a year, each one about a person\u2019s pay and career. Walk the cycle.', steps:[
  {n:'Gather feedback', who:'Managers', vol:'2,400 reviews a year', sys:'HR system, email',
   notes:'Managers ask colleagues for feedback by email and collect the replies in a document.',
   pain:'Chasing takes weeks, and the feedback is uneven.',
   p:'coordinate text mid mid', best:'rules fix', ok:'agent', auto:'auto',
   why:'A feedback request built into the HR system, with reminders. No AI.',
   disc:[['An unused module','The HR system has a feedback module nobody switched on.','Turn it on.'],['Once a year','The cycle is annual.','Keep it simple.']],
   fv:'high low', reality:'A fill-in.',
   metric:'Feedback received on time', g:'logging', hyp:'All feedback in on time.', data:'The HR system module.'},
  {n:'Write the review', who:'Managers', vol:'2,400 a year', sys:'HR system',
   notes:'Managers write a review for each of their reports, summarising the year, the feedback and the goals.',
   pain:'Reviews are late and vary in quality.',
   p:'draft text mid high', alt:'shape:summarize', best:'summarize', ok:'draft', auto:'assist',
   why:'A summary of the year\u2019s feedback for the manager to read. The review itself is written by the manager; a draft about a person written by a tool is a risk.',
   disc:[['About people','Reviews affect pay and careers.','Risk: nothing generated goes into a review unedited.'],['Uneven language','Review language differs across groups.','Check what is produced for bias.']],
   fv:'mid low', reality:'Avoid for now: high sensitivity, modest value.',
   metric:'Reviews submitted on time', g:'bias privacy logging', hyp:'Reviews on time and better grounded.', data:'Feedback, goals.'},
  {n:'Calibrate ratings', who:'Department heads', vol:'Once a year', sys:'Spreadsheets, meetings',
   notes:'Department heads meet to compare ratings across teams and adjust them.',
   pain:'Long meetings and inconsistent standards.',
   p:'decide structured low high', best:'fix', ok:'anomaly', auto:'assist',
   why:'Agree the standards and show rating distributions by team. An outlier report, not AI.',
   disc:[['Different distributions','Rating distributions differ sharply between teams.','Show them, and let people discuss.'],['A human conversation','Calibration is a judgment among peers.','Keep it that way.']],
   fv:'high low', reality:'A fill-in: a report.',
   metric:'Hours in calibration meetings', g:'bias logging', hyp:'Shorter calibration on clearer standards.', data:'Ratings by team.'},
 ]},

 retiree:{intro:'Thirty-eight hundred retirees changing addresses, bank details and beneficiaries, many of them by post. Bank changes are a fraud target. Walk a change.', steps:[
  {n:'Receive change requests', who:'Retiree services', vol:'About 4,000 a year', sys:'Post, phone, email',
   notes:'Retirees send address, bank and beneficiary changes by post, phone and email. Many prefer paper. Letters are scanned and sorted by hand.',
   pain:'Scanned letters are sorted by hand, and phone requests need a form to follow.',
   p:'route media high mid', alt:'shape:extract input:text', best:'extract classify', ok:'fix', auto:'review',
   why:'Extract and classify scanned letters and emails into requests, keeping the paper and phone paths open for retirees who need them.',
   disc:[['Paper matters','Many retirees prefer paper and the phone.','Never remove the human path.'],['Handwriting','A third of the letters are handwritten.','Expect lower confidence; review those.']],
   fv:'mid mid', reality:'Sensible, medium on both axes.',
   metric:'Days from receipt to a logged request', g:'threshold escalation privacy', hyp:'Every request logged within a day.', data:'Scanned letters, request types.'},
  {n:'Verify identity and authority', who:'Retiree services', vol:'About 4,000 a year', sys:'Pension system, call-back',
   notes:'Before changing payment details, staff check the request against the record and call the retiree back on the number held on file.',
   pain:'Call-backs take days, and fraud attempts have increased.',
   p:'check structured high high', alt:'input:text', best:'anomaly rules', ok:'extract', auto:'assist', autoOk:'review',
   why:'Rule checks against the record, and anomaly flags for patterns such as an address change followed by a bank change. The call-back stays.',
   disc:[['The fraud pattern','Most attempts change the address first, then the bank account.','A rule catches the pattern.'],['The strongest control','The call-back is the strongest control there is.','Keep it; use flags to prioritise it.']],
   fv:'high high', reality:'Quick win, with fraud reduction.',
   metric:'Fraud attempts caught before a payment changes', g:'logging escalation sampling', hyp:'Catch every known fraud pattern before payment details change.', data:'Change history, past fraud cases.'},
  {n:'Update the record and confirm', who:'Retiree services', vol:'About 4,000 a year', sys:'Pension system, letters',
   notes:'Approved changes are keyed into the pension system, and a confirmation letter is typed and posted.',
   pain:'Keying errors, and letters typed one at a time.',
   p:'coordinate structured high mid', best:'rules', ok:'agent draft', auto:'auto', autoOk:'review',
   why:'Update the record from the verified request by rule, and generate the standard letter.',
   disc:[['Five letters','Five letter types cover every change.','Generate them by rule.'],['One in fifty','One change in fifty has a keying error.','Remove the re-keying.']],
   fv:'high mid', reality:'Quick win, and not AI.',
   metric:'Keying errors', g:'logging rollback', hyp:'No keying errors.', data:'Letter templates, the pension system.'},
 ]},

 vendorrecon:{intro:'Fourteen insurance carriers bill the Bank every month. Last year $410,000 of overbilling was recovered, months late. Walk the month.', steps:[
  {n:'Collect carrier invoices', who:'Benefits finance', vol:'14 carriers, monthly', sys:'Carrier portals, email',
   notes:'Each month an analyst downloads the invoices from carrier portals and email: twelve as structured files, two as PDFs.',
   pain:'A day a month on collection.',
   p:'coordinate structured mid low', alt:'shape:extract input:text', best:'rules', ok:'extract agent', auto:'auto',
   why:'Scheduled downloads for the twelve structured files, extraction for the two PDFs.',
   disc:[['Two PDFs','Only two carriers send PDFs.','Extraction for two; rules for twelve.'],['Scheduled exports','The portals support scheduled exports.','Feasibility: a setting.']],
   fv:'high low', reality:'A fill-in.',
   metric:'Collection hours per month', g:'logging', hyp:'Collection in minutes.', data:'Portal access.'},
  {n:'Match bills to enrolment', who:'Benefits finance', vol:'About 6,000 billed lines a month', sys:'Spreadsheets, enrolment records',
   notes:'The analyst matches every billed person to the enrolment record and flags the differences: people who left, changed plans or were never enrolled.',
   pain:'Three days a month, and overbilling is found months late.',
   p:'check structured mid mid', alt:'rep:high', best:'rules', ok:'anomaly', auto:'auto', autoOk:'review',
   why:'Rule-based matching on the files, monthly and automatic, with anomaly flags for the unexpected.',
   disc:[['$410,000','Last year\u2019s overbilling was recovered, but late.','Value: recover within the month.'],['Shared data','This uses the same enrolment data as benefits enrolment.','Build once.']],
   fv:'high mid', reality:'Quick win, mostly rules.',
   metric:'Days to reconcile, and overbilling recovered within 30 days', g:'logging sampling', hyp:'Reconcile in half a day.', data:'Carrier files, enrolment records.'},
  {n:'Dispute and recover', who:'Benefits finance', vol:'About 60 disputes a month', sys:'Email, carrier contacts',
   notes:'Differences are disputed with each carrier by email, tracked in a spreadsheet and chased until credited.',
   pain:'Disputes stall, and credits are not tracked to closure.',
   p:'coordinate text mid mid', alt:'input:structured', best:'agent rules', ok:'draft', auto:'review',
   why:'Generate disputes from the match, track them, and chase on a schedule. The analyst approves each dispute.',
   disc:[['A standard file','Carriers accept a standard dispute file.','Generate it.'],['Never closed','A fifth of disputes were never closed.','Track every one to a credit.']],
   fv:'mid mid', reality:'Sensible, medium on both axes.',
   metric:'Disputes closed within 60 days', g:'logging escalation', hyp:'Every dispute closed and credited.', data:'Match results, dispute history.'},
 ]},
};

/* ---------------------------------------------------------------------
   Expansion
   --------------------------------------------------------------------- */
const POOR_NOTE = {
  extract:'This step is mainly reading material and pulling details out of it. Pick the capability built for reading.',
  route:'This step is mainly sorting items into the right place. Pick the capability built for sorting.',
  lookup:'This step is mainly finding an answer that already exists. Pick the capability built for finding and answering.',
  draft:'This step is mainly writing. Pick the capability built for drafting, and keep the author.',
  summarize:'This step is mainly reducing a lot of material to what matters. Pick the capability built for condensing.',
  predict:'This step is mainly putting a number on what has not happened yet. Pick the capability built for estimating.',
  check:'This step is mainly comparing against what should be true. Pick the capability that finds what does not match, or a rule.',
  suggest:'This step is mainly ranking options for a person. Pick the capability built for decision support.',
  allocate:'This step is mainly fitting work into limited capacity. Pick the capability that finds the best plan.',
  decide:'This step is a judgment someone is accountable for. Ask first whether it should be a target at all.',
  coordinate:'This step is mainly moving information between people and systems. Ask what a rule, an integration or a fix would do first.',
  physical:'This step is physical work. Software helps it mainly by seeing or planning, if at all.',
};
const AUTO_NOTE = {
  assist:s=>`${s==='high'?'High':'Real'} stakes: the tool prepares, a person decides every case.`,
  review:()=>'The routine cases can run on their own; a person handles the exceptions.',
  auto:()=>'Errors here are cheap and reversible: automate, and watch the metrics.',
};

function optOf(list, id){ return list.find(o=>o.id===id) || {name:id, d:''}; }
function words(s){ return (s||'').split(/\s+/).filter(Boolean); }

function expandStep(pid, i, c){
  const [shape,input,rep,stakes] = words(c.p);
  const alt = {};
  words(c.alt).forEach(kv=>{ const [k,v] = kv.split(':'); (alt[k] = alt[k] || []).push(v); });
  const best = words(c.best), ok = words(c.ok);
  const [feas, value] = words(c.fv);
  const fitNotes = {};
  ok.forEach(o=>{ fitNotes[o] = `${CAPS[o].name} could play a part here, but it is not the first move. ${CAPS[o].watch}`; });
  best.forEach(b=>{ fitNotes[b] = c.why; });
  const s = optOf(SHAPES,shape), inp = optOf(INPUTS,input), r = optOf(REPS,rep), st = optOf(STAKES,stakes);
  return {
    id:`${pid}-${i+1}`, name:c.n, who:c.who, volume:c.vol, systems:c.sys, notes:c.notes, pain:c.pain,
    expert:{shape, shapeAlt:alt.shape||[], input, inputAlt:alt.input||[], rep, repAlt:alt.rep||[], stakes, stakesAlt:alt.stakes||[]},
    profileNotes:{
      shape:`${s.name}. ${s.d}`,
      input:`${inp.name}. ${inp.d}`,
      rep:`${r.name}. ${r.d}`,
      stakes:`${st.name}. ${st.d}`,
    },
    fit:{best, ok}, fitNotes, poorNote:POOR_NOTE[shape] || 'Look again at what the person actually does in this step.',
    expertPick:best[0], expertWhy:c.why,
    autoBest:c.auto, autoOk:words(c.autoOk), autoNote:c.autoNote || AUTO_NOTE[c.auto](stakes),
    discoveries:c.disc.map(([title,text,effect])=>({title,text,effect})),
    expertFeas:feas, expertValue:value, realityNote:c.reality,
    metric:c.metric, guardrails:words(c.g), valueHyp:c.hyp, dataNeeded:c.data,
  };
}

const _expCache = {};
/* Return a playable expedition for any process id on the terrain map. */
function getExpedition(pid){
  if(_expCache[pid]) return _expCache[pid];
  const meta = (()=>{ for(const fn of FUNCTIONS){ const p = fn.processes.find(x=>x.id===pid); if(p) return {fn, proc:p}; } return null; })();
  if(!meta) return null;
  let exp;
  if(FLAGSHIP[pid]){
    const P = PROCESSES[FLAGSHIP[pid]];
    exp = {id:pid, key:FLAGSHIP[pid], name:P.name, fn:meta.fn.name, fnId:meta.fn.id, intro:P.intro, steps:P.steps, flagship:true, rating:meta.proc.rating};
  } else {
    const C = COMPACT[pid];
    if(!C) return null;
    exp = {id:pid, key:pid, name:meta.proc.name, fn:meta.fn.name, fnId:meta.fn.id, intro:C.intro,
      steps:C.steps.map((c,i)=>expandStep(pid,i,c)), flagship:false, rating:meta.proc.rating};
  }
  _expCache[pid] = exp;
  return exp;
}

/* Content check. Runs once on load and lists any problems in the browser
   console, so a typo in a new or edited process is easy to find. */
function validateExpeditions(){
  const problems = [];
  const has = (list, id)=>list.some(o=>o.id===id);
  const dimLists = {shape:SHAPES, input:INPUTS, rep:REPS, stakes:STAKES};
  FUNCTIONS.forEach(fn=>fn.processes.forEach(p=>{
    let exp;
    try{ exp = getExpedition(p.id); }catch(e){ problems.push(`${p.id}: failed to load (${e.message})`); return; }
    if(!exp){ problems.push(`${p.id}: no expedition content`); return; }
    exp.steps.forEach((st,i)=>{
      const at = `${p.id} step ${i+1}`;
      Object.keys(dimLists).forEach(k=>{ if(!st.expert || !has(dimLists[k], st.expert[k])) problems.push(`${at}: unknown ${k} "${st.expert && st.expert[k]}"`); });
      if(!CAPS[st.expertPick]) problems.push(`${at}: unknown capability "${st.expertPick}"`);
      [].concat(st.fit.best||[], st.fit.ok||[]).forEach(c=>{ if(!CAPS[c]) problems.push(`${at}: unknown capability "${c}"`); });
      if(!has(AUTONOMY, st.autoBest)) problems.push(`${at}: unknown autonomy "${st.autoBest}"`);
      (st.guardrails||[]).forEach(g=>{ if(!has(GUARDRAILS, g)) problems.push(`${at}: unknown guardrail "${g}"`); });
      if(!st.discoveries || st.discoveries.length!==2) problems.push(`${at}: needs exactly two field notes`);
      if(!has(LEVELS, st.expertFeas) || !has(LEVELS, st.expertValue)) problems.push(`${at}: feasibility and value must be low, mid or high`);
    });
  }));
  if(problems.length) console.warn('Groundwork content check found ' + problems.length + ' problem(s):\n' + problems.join('\n'));
  return problems;
}
try{ validateExpeditions(); }catch(e){ console.warn('Groundwork content check could not run:', e); }
