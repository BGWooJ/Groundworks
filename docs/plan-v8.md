# Groundwork v8: plan

**Audience:** people who are not technical and are still getting to know AI.
**Promise:** v8 adds to v7 and does not tear it down.

## What stays

Players will see a different front door and a different way to choose a process. Most of what sits behind it stays as it is.

| Stays as it is | Why it matters |
|---|---|
| The decision engine, with its verdicts and tool scoring | The tests that pin it today keep passing unchanged. |
| Every process and step ID, and the saved journal | v7 walks, maps, marks and ranks carry over. |
| Your own maps, the charter, the plan and the exports | Untouched in v8. |
| The RPG layer, sound, the achievement spotlight and My maps | Reused, not rebuilt. |
| The 38 current processes | Each one moves into a work area. None are removed. |
| The current survey list | Kept as the **List view** of the new map, for keyboard users, screen readers and small phones. |

Renaming changes only the words players see. The underlying names stay the same, so nothing saved is lost.

## 1. The first two minutes: know exactly what you are about to do

**Today:** the first screen says "Walk a Meridian process" and never explains what Meridian is. It uses "field", "LLM" and "pain" before any of them has been introduced.

**v8:**
- **A short primer on first visit.** Three cards, about 30 seconds, with a Skip button:
  1. **Meridian is a practice bank.** It is made up, with 13 divisions and real-feeling work. Nothing in it is real data.
  2. **What you will do.** Pick one piece of work, look at its steps, and decide for each step: can AI do it, can AI help a person do it, or is AI the wrong tool?
  3. **What you get.** You compare your calls with the Guide's (see below) and finish with a plan you can take to your team. One process takes about five minutes, and everything saves as you go.
- **A "you are here" strip** stays at the top for the whole walk: Explore, Choose, Make the calls, Compare, Your plan.
- **Plain-language pass on every screen.** "LLM" is introduced once as "AI that reads and writes text, such as Copilot". After that it carries a small "What's this?" explainer. Each of the two Home buttons gets a one-line description and a time estimate.
- **The lens choice comes after the primer,** with one line: "This changes what you see first, not how hard it is."

### New words

| Today | v8 | Where it appears |
|---|---|---|
| Where does the **pain** live? | **Where could AI help most?** The line under it keeps the lesson: "Look for the work that takes the most time. Some of it will turn out to need no AI at all." | Survey heading, the full-survey comparison |
| "…repetition and **pain** someone has measured" | "…repetition and **time** someone has measured" | Signals |
| The **field**'s view / Compare with the **field** | The **Guide**'s view / Compare with the **Guide** | Every read |
| "**Field:** Summarise" (on a result row) | "**Guide:** Summarise" | Results |
| **Field guide** (the hint panel) | **Hint** | Steps |
| **Field notes** / Hear more from the floor | **Notes from the team** | Results |
| **Field Reports** / **Field Library** | **Landmark cases** / **Case library** | Library, results, character sheet |
| **Field journal** | **Logbook** | Home |
| A **field** game about where AI earns its keep | A **practice** game about where AI helps at work | Home |

**Why "the Guide":** it fits the surveying theme, and a newcomer recognises it straight away: an experienced guide who has walked every Meridian process with the people who do the work. It can have a portrait and a voice. "Landmark cases" works the same way: well-known places other organisations have already been, good and bad.

## 2. Getting back to your work from any browser

**The problem:** everything lives in one browser's storage. It is lost on:
- another computer;
- another browser;
- a private window;
- cleared history;
- work machines that reset the browser when you sign out, which is common on shared or virtual desktops.

**Without a server (recommended now):**
- **Your save link.** One link holds all your progress. Open it in any browser on any device and everything is back.
  - **Measured size:** one finished walk plus one map of your own is a 1.6 KB link, so about ten walks would still fit in a bookmark or an email to yourself.
  - **Privacy:** the progress sits in the part of the link after the "#". Browsers never send that part to the website, so nothing leaves the player's hands.
  - **When we offer it:** at natural stopping points, such as finishing a process, finishing a route, or the "Leaving?" button.
- **Save my progress (file).** The same content as a file, for anyone whose link is too long for their email. This extends v7's "Save map file" from one map to everything.
- **Welcome-back door.** If a browser has no saved progress, Home asks: "Played before? Open your save link or file."
- **A storage layer.** The game saves through one small module, so a sign-in option can be added later without touching the game.

**With a server (later, only if IT agrees):**
- **Sign in with a work Microsoft account, and progress saves to your own OneDrive automatically.** Data stays inside the organisation's own Microsoft 365. It needs IT to register the app and approve where the site is hosted, and it can't be tested until that exists.
- **Not recommended:** an outside cloud database. Descriptions of internal processes would leave the organisation, which is unlikely to pass a bank's data review. A short code such as "MERIDIAN-4821" would also need a server.

## 3. Meridian as a world

The organisation becomes a flat, illustrated map that players move around. Choosing a place zooms in, and each level opens out of the one before it, like an infinite zoom.

| Level | What you see | What you choose |
|---|---|---|
| **Meridian** | Five regions (the mission, running the buildings, supporting the people, the financial system, the institution), with 13 divisions as landmarks. A glow shows where the time goes. | A division |
| **Division** | The landmark opens into its 3 or 4 **work areas**, each with its process count and time signal. | A work area |
| **Work area** | Its processes as points. Each shows a one-line real-life description, its step count and its time signal. | A process (read it, or pin it to your route) |
| **Process** | The existing step trail, so the deepest level is v7's map, kept as it is. | Start reading |

- **Moving around:** drag to pan; scroll, pinch or use the + and − buttons to zoom. Hover or tap a landmark for a card describing the division.
  - A **breadcrumb** (Meridian › Economists › Briefings › Pre-meeting briefing cycle) zooms back out to any level.
  - **Esc** also zooms out.
- **The zoom:** the camera moves into the chosen point, and the next level grows out of it as it arrives. Zooming out reverses this. It takes about 0.8 seconds. With reduced motion turned on, it becomes a simple fade.
- **List view:** the same levels as nested lists, one toggle away.
- **The shortlist becomes a route.** Pin up to three processes from anywhere on the map, then use **Read my route** to read them one after another, quickly (section 5). Pinning is optional: you can also choose a single process and start reading.
- **How it's built:** SVG drawn in the current palette, with the 13 existing department illustrations as landmarks. A small, proven library (d3-zoom) handles drag, pinch and trackpad. Motion, already in the game, animates the zooms. No 3D.

## 4. More ground: work areas and true-to-life processes

**Target:**
- each division gets three work areas, with three or four processes in each;
- about 60 new processes and about 200 new steps, bringing the total to around 100 processes;
- each new process is based on work real organisations do, named where it is public (for example, the US Federal Reserve's Beige Book or a supervisor's Call Report).

\* = an existing process. The rest are new proposals for review.

| Division | Work areas and processes |
|---|---|
| Economists | **Forecasting:** nowcasting growth from early data; writing up the forecast round · **Policy meeting briefings:** pre-meeting briefing cycle\*; the policy recommendation\*; drafting the Governor's speeches · **Regional intelligence:** district business intelligence\*; summarising business contacts (like the Beige Book); coding open-text business survey answers |
| Research & data | **Data management:** data set maintenance\*; publishing statistical releases; metadata and documentation · **Research support:** literature search\*; checking that research code reproduces its results · **Requests & surveys:** external data requests\*; coding household survey responses |
| Facilities | **Maintenance:** work orders\*; contractor permits to work; fire safety inspections · **Energy & plant:** central plant\*; utility invoice checks · **Space:** space and occupancy\*; office moves; desk booking |
| Events | **Internal events:** event requests\*; conference speaker logistics · **Public programmes:** public tours\*; school programme bookings; visitor centre questions |
| Police & security | **Access:** visitor and delivery screening\*; badge and access requests · **Incidents:** incident reporting\*; CCTV review requests · **Readiness:** patrol and shift scheduling\*; training and certification tracking |
| IT | **Service desk:** helpdesk tickets\*; software requests; phishing report triage · **Access & security:** access reviews\*; patch tracking · **Change & planning:** technology roadmap\*; change approval board; asset inventory |
| HR | **Advice:** employee policy questions\*; leave requests · **Hiring:** recruiting and screening\*; writing job descriptions; onboarding checklists · **Performance & learning:** performance review cycle\*; training catalogue; exit interview themes |
| Benefits | **Inquiries:** benefits inquiries and enrolment\*; open enrolment communications · **Pensions:** retiree pension changes\*; pension estimate requests · **Billing & changes:** carrier invoice reconciliation\*; life-event changes |
| Supervision | **Examinations:** exam planning and document requests\*; drafting exam reports; tracking findings to closure · **Consumer protection:** consumer complaints\*; complaint trend reporting · **Reports & applications:** regulatory report validation\* (like the Call Report); bank merger applications; stress test submission review |
| Cash & payments | **Payments:** payment exceptions\*; sanctions screening alerts; settlement reconciliation · **Currency:** currency processing\*; coin and note orders from banks; counterfeit note reports · **Resilience:** business continuity testing\*; incident communications |
| Finance & procurement | **Payables:** supplier invoices\*; purchase card reconciliation · **Procurement:** contract and procurement review\*; supplier due diligence · **Budgets & controls:** travel and expense audit\*; budget variance commentary; fixed asset register |
| Outreach | **Relationships:** contact records\*; speaker requests · **Media & public:** public and media inquiries\*; social media monitoring · **Publications:** publications and translation\*; plain-language summaries of policy statements; website updates |
| Legal & audit | **Records:** public records requests\*; records retention · **Audit:** internal audit control testing\*; drafting audit reports · **Policy & ethics:** policy library and attestations\*; conflict-of-interest disclosures; board minutes |

Every new process passes the same checks as today's:
- the content check;
- the verdict spread (so no area becomes all "pilot now");
- links to landmark cases where one fits.

The engine is not changed. The pinned test file is regenerated only to add the new steps, and that is recorded.

## 5. A quicker read

**Today:** about 10 questions per step and 3 to 5 steps per process. That is around 33 answers and 3 to 5 comparisons per process, or about 100 answers for a shortlist of three.

**v8, the quick read (the new default):**
- **Facts are given; you make the calls.** Inputs, volume, stakes and where the work happens are facts about the process. They appear in a short "What we know" strip instead of being asked. "Who would build it" and "how sensitive is the data" are asked once per route, not once per process.
- **Three calls per step:**
  1. What kind of work is it?
  2. Can AI do it, help a person do it, or is it not a job for AI?
  3. How much should it do on its own?

  The capability is filled in from your first answer and shown, and you can change it.
- **One screen per process:** every step is a row with its three choices, and there is one **Compare with the Guide** at the end. Results come back as one table with a verdict for each step.
- **How long it takes:** about 9 to 15 taps per process, roughly three minutes; a route of three takes about ten minutes.
- **The comparison:** a plain summary comes first ("You and the Guide agree on 7 of 9 calls"), with details on tap and no waiting on animations.
- **Full read:** one toggle away for anyone who wants all ten questions, and the default for the Builder lens. XP and mastery count from either.
- **End of a route:** a short comparison of the processes you read: which has the strongest case, and where to start.
- **Own maps:** stay as they are. There, every fact is the player's to give.

**Why the engine still works:** the quick read fills the given facts from the process's own profile, which is where the Guide takes them from. Verdicts mean exactly what they meant before.

## 6. Visuals and motion

- **One motion language:**
  - zooming is moving through space;
  - cards arrive from where they came from;
  - nothing moves without a reason.
- **Smooth by construction:**
  - only position, size and fade animate, never layout, so it holds 60 frames a second;
  - a zoom can be interrupted and redirected;
  - durations: 150 to 250 ms for interface changes, about 800 ms for a zoom.
- **Reduced motion is respected everywhere:** it switches to fades.
- **Checked, not assumed:** a browser script records frame times during zooms, at desktop size and on a slowed phone profile, and fails if frames drop.
- **Map art:** paper and ink to match the current palette. Regions are tinted, and the 13 department illustrations become landmarks. The existing "heat" glow shows where the time goes.

## 7. Order of work

Each phase ships on its own. It goes on its own branch and pull request and passes the tests and browser checks before merging, so the live site only ever moves forward.

1. **Words and the first two minutes:** primer, "you are here" strip, plain-language pass, renames. Text only, so low risk.
2. **Getting back to your work:** storage layer, save link, save file, welcome-back door.
3. **The world map:** levels, zoom, list view and the route, using today's 38 processes placed in work areas.
4. **More ground:** the new processes, reviewed one division at a time, with checks run after each division.
5. **The quick read:** one-screen read, comparison table, route summary, with the full read kept as an option.
6. **Polish:** a motion and performance pass, an accessibility pass, the review document (`docs/review-v8.md`) and the README.

Phases 1 and 2 don't depend on the map, so they can go live first.

## Decisions

| Question | Decided |
|---|---|
| Getting back to your work | **Save link and file.** No server and no sign-in. Saving goes through one small module, so sign-in stays possible later. |
| The word for "field" | **The Guide** |
| The word for "pain" | **"Where could AI help most?"** The line underneath steers players toward time spent and keeps "no AI" a real answer. |
| Several processes | **A route of up to three,** read with the quick read, with a short comparison at the end |
| The content list in section 4 | Open: cut, add or swap anything before phase 4 begins |

## Progress

**Phase 1, words and the first two minutes: done.** As planned, plus "Who is the Guide?" next to the
first mention of the Guide, and the lens line on both lens screens.

**Phase 2, getting back to your work: done.** As planned. Found and fixed along the way:
- A save link pasted into a tab where the game is already open changes only the part after "#", so
  the page does not reload. The game now listens for that and opens the save.
- With **Save progress** added, the top bar no longer fit on phones (from 320 px) or wrapped its
  labels on desktop step screens. Narrow phones now show the logo alone. Between phone and wide
  desktop the top-bar buttons show icons only. The process name shortens before anything wraps.
- Saves are treated as untrusted: keys that could change how objects behave are dropped, damaged
  entries are removed, and anything that unpacks to more than 4 MB is refused.

**Phase 3, the world map: done.** Built in SVG with d3-zoom and Motion. Three.js was offered and not
needed: a flat map is sharper at every zoom, keeps every division a real button for keyboards and
screen readers, and stays smooth on modest hardware. Decisions and fixes along the way:
- **Ratings:** in a work area, processes show their description and step count but not their
  hotspot rating, so judging the evidence stays part of the game. "How do they rank?" on the route
  shows the ranking, as the full survey did.
- **Screen sizes:** a wide screen shows the whole island. A phone opens zoomed to its height, centred
  on the mission, with labels at a readable size.
- **Reduced motion:** levels only fade, with no scaling at all.
- **The route:** kept with your progress, and in save links. A walked process leaves the route, and
  the finished map offers the next one.
- **Fixed:** starting a walk used to carry over state from the screen it was started from, such as
  which complications had already fired. Every walk now starts clean.
- **Economists' Forecasting area** has no processes yet and is hidden until phase 4 fills it.
