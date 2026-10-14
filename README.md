# Groundwork v8: find where an LLM earns its keep

Groundwork teaches one method: break a process into its steps, read each step for the kind of
work it really is, and decide honestly whether it is an LLM's kind of work, a job where an LLM
supports a person, a job for a different kind of AI, or a job for something simpler. Every
answer also moves a **heading** toward the approved tool that fits.

v5 rewrote the game in React and added more ground to walk, real cases from outside the Bank, a light
RPG layer for every level of the organisation, and optional sound. v6 audited the engine and opened
departments in place. v7 makes work easy to find again, makes achievements visible, puts shortlist
choices first, checks that every option means something, and ends every map with a plan. See
`docs/review-v6.md` and `docs/review-v7.md`.

v8 (`docs/plan-v8.md`, reviewed in `docs/review-v8.md`) came in six phases, all now in. Phase 1: new players meet a three-card introduction
(what Meridian is, what they will do, what they get), a "you are here" strip names each stage of a
walk or map, "What's an LLM?" and "Who is the Guide?" explain the two terms a newcomer meets cold,
and the words are friendlier: **the Guide** (was "the field"), **landmark cases** and the **case
library** (were Field Reports and the Field Library), **Logbook** (was the field journal), **Hint**
(was the field guide), and "Where could AI help most?" (was "Where does the pain live?"). Only the
words on screen changed; saved progress and every stored name are the same.

Phase 2 is in too: progress can leave the browser. **Save progress** (top bar, the Logbook, the
finished map, My maps) makes a **save link** that holds everything, compressed into the part of the
link after "#", which browsers never send to the website, and a **save file** with the same contents.
Opening the link in any browser brings everything back; a browser that already has progress shows
both side by side and asks before replacing anything.

Phases 3 to 5 are in as well. Meridian is now a map you move around, from the island to a division,
then a work area, then its processes (**The world** below). 54 true-to-life processes join the
original 38 (**The processes** below). And the **quick read** (below) is the new default way to read
a process: the facts are given, you make three calls per step on one screen, and one comparison with
the Guide comes at the end. A route of two or three processes ends with a comparison of where to start.

Phase 6 polished it:
- **Speed:** a faster first load, with a loading screen from the first moment.
- **Motion:** only position and fade animate.
- **Accessibility:** every main screen passes an accessibility audit at desktop and phone size.

See **Speed, motion and access** below.

## The hypothesis behind the game

- **Behaviour we want:** before anyone proposes a tool, they read the process step by step and
  match each step to the right kind of help, including "no tool".
- **Outcome it should produce:** fewer pilots that start from a brand or a demo, and more
  pilots with a baseline, a measure and the right amount of human oversight.
- **How we would know:** the share of proposals that arrive with a step map and a baseline, and
  how often players' reads match the Guide (the progress report records both, privately).

Every game mechanic in Groundwork has to change a decision or explain one. Anything that only
decorates is left out.

## Two ways in

**Explore Meridian.** A made-up reserve bank with 13 divisions, 38 work areas and 92 walkable
processes (300 steps), drawn as a map you move around (see **The world** below). Go inside a division, then one
of its work areas, and walk a process or pin up to three to your route. Read it with the quick read
(three calls per step, one screen) or the full read (every question, step by step). Then compare with
the Guide's view: which answers match, the verdict, notes from the team, and often a landmark case
from the wider world. Complications test your judgment under pressure: one per step in a full read,
one per process in a quick read.

**Map your own work.** Start with the **charter**, four questions to answer before any tool,
pilot or game: the challenge (as a hypothesis), what success looks like, whether your systems can
track it automatically, and who it is for. Then name the steps and read each one, with optional
numbers. Groundwork gives each step a verdict, pushes back on contradictions, and builds the map.
The charter travels with the map into every export.

## Every level of the organisation: lenses

On first play you choose a lens. Lenses change what opens first, not the difficulty. Every lens
can see every finding.

| Lens | For | Opens first on every step |
|---|---|---|
| Practitioner | People who do the work | Both notes from the team, and what changes for the person at the desk |
| Steward | Team leads and managers | First move, who to involve, how to measure it |
| Sponsor | Executives | Value and feasibility grid, and the value hypothesis |
| Builder | Builders and IT | How each approved tool scored, data needed, guardrails |

Complications are drawn with a preference for your lens, so a sponsor meets "gamify everything"
and "show me the return" more often, and a builder meets "build our own" and "write access".

## The world

Meridian is an island of five regions, with each of the 13 divisions a landmark on it
(`src/views/World.jsx`, `src/content/world.js`).

- **Moving around:** drag, scroll or pinch, or use the arrow keys and plus and minus. A glow marks
  where the evidence of repeated, measurable work is strongest. Pointing at a landmark shows its card.
- **Three levels, each opening out of the one before:** Meridian, a division (its work areas), and a
  work area (its processes). Each level grows out of the spot you pressed and shrinks back into it.
  The breadcrumb, Back or Escape go up a level. With reduced motion turned on, levels fade instead.
- **Work areas** (`src/content/areas.js`) group each division's processes the way its people would.
  Every process belongs to exactly one, and the content check enforces it. Each area holds two or
  three processes.
- **The route** replaces the shortlist. Pin up to three processes from any level, and the route is kept
  with your progress. **How do they rank?** shows where your picks sit among every process; ratings
  stay hidden until then, so judging the evidence is still part of the game. **Read my route** lists
  them, and a finished walk offers the next one.
- **List view:** the same levels as nested lists, one toggle away, for keyboards, screen readers and
  small screens.
- **Built with:** SVG and d3-zoom, with Motion for the zooms. No 3D: a flat map stays sharp at every
  zoom, keeps every division a real button, and runs smoothly on modest laptops and phones.

## The quick read

Most people reading a process want to know where AI could help, not to fill in ten questions per step
(`src/views/QuickRead.jsx`). The quick read keeps the judgment and drops the form-filling.

- **The facts are given:** how much of the work there is, what comes in, and what is at stake. They
  come from the process's own profile, which is where the Guide takes them from. "About your
  organisation" (where the work happens, who would build a tool, how sensitive the data is) is set
  once and remembered for every quick read after.
- **Three calls per step,** all on one screen:
  1. What kind of work is it?
  2. Is it an LLM's kind of work?
  3. How much should it do on its own?

  A capability is suggested from the first two calls and shown, and you can change it. "Fix the process
  first" needs no autonomy call.
- **One comparison:** **Compare with the Guide** opens once every step has its calls. A summary leads
  ("You and the Guide agree on 7 of 10 calls"), then one row per step with its verdict, and the details
  on tap. Only your own calls are scored: given facts, and a capability you left as suggested, earn and
  cost nothing.
- **How long it takes:** 9 to 15 taps for a process of three to five steps, and one complication
  before the plan.
- **A route:** when you read two or three processes from your route, the last finished map compares
  them side by side and says which to start with.
- **The full read** is one toggle away on the process screen, and the default for the Builder lens.
  XP and mastery count from either. Walks saved before v8 resume as full reads.

## Speed, motion and access

- **First load:** the first screen comes in one download of about 300 KB (compressed). The world map, the
  reads and the finished map load just after, while the player reads it (`later()` in `src/App.jsx`).
  The libraries and the Bank's content have files of their own, so they stay cached when only screens
  change. `index.html` shows a loading screen before any script arrives, and says what to do if the game
  cannot start.
- **Motion:** only position, size and fade animate, never layout. Interface changes take 120 to 250 ms,
  and the zoom between map levels takes 550 ms. With reduced motion turned on, nothing keeps moving and
  the map's levels fade instead of zooming.
- **Access:** text and controls meet WCAG 2.2 AA contrast. Brass behind white text uses `--brass-fill`.
  - **Button names:** every button's spoken name contains the words it shows.
  - **Dialogs:** the page behind is inert while one is open, and focus goes back to where it was when it
    closes.
  - **Tap targets:** on phones they are at least 24 pixels.
- **Checked by:** `scripts/a11y-check.cjs` (axe-core on 25 screens at two sizes, plus keyboard and tap
  targets) and `scripts/perf-check.cjs` (load on a slow phone, tap response, frame timing, reduced motion).

## The RPG layer

- **Experience and ranks.** XP comes from reading well (matching the Guide), judging well
  (strong answers to complications), hearing from the floor, finishing walks and maps, and taking
  maps further. Ranks run from Apprentice Surveyor to Master Cartographer.
- **Standing.** Four stats move with your complication answers: Credibility (with leadership),
  Rigour (in the method), Trust (of the people doing the work) and Time in hand. The debrief at the
  end of a walk tells you what your sponsor thinks of how you handled the pressure.
- **Reading skills and capability mastery.** Your match rate on each question, and on each
  capability family. Weak spots tell you what to practise.
- **Insignia.** Fourteen marks, including four new ones in v5.
- **Case library.** 19 landmark cases: real, public cases (Air Canada's chatbot ruling, Mata v. Avianca, Knight
  Capital, Zillow Offers, UPS ORION, the Robodebt Royal Commission and more). You collect each one
  when a step you read or a complication you face calls for it. Each card names its source and
  links to it. You can read any case in the library before you collect it.

## Getting back to your work

Every walk and map is saved in this browser as you go, including a setup you have only started typing.
Home opens with **Pick up where you left off**, and **My maps** (top bar, every screen) lists everything
in progress and finished. Finished walks reopen on their finished map.

Browser storage is per browser, so v8 adds a way to take everything with you:

- **Save progress** makes a **save link**: your maps, walks, rank and marks, compressed into the part
  of the link after "#". Browsers never send that part to the website, so nothing reaches a server.
  A walk in progress makes a link of about 660 characters; a finished walk plus a map of your own,
  about 1,600. Copy it, or email it to yourself when it is short enough for mail apps (under 1,800
  characters); longer links point to the save file instead.
- The same dialog saves a **save file** with the same contents, for long links or people who prefer files.
- **Open saved progress** (home screen, the introduction, My maps) takes a pasted link or a file.
  v7 map files open there too. Opening a save link just works: an empty browser takes it at once, and
  one with progress shows both side by side and asks first, with a way to keep a file of what is there.
- A link that was cut short, or a file that is not a Groundwork save, says so in plain words.
- The top bar marks progress that is newer than your last link or file, and the Logbook and the
  finished map remind you where you stop.

Everything in a save is treated as untrusted: it is checked, size-limited and copied as plain data
before the game uses it (`src/game/storage.js`).

## The plan

Every finished map leads with a plan: what to do first, the four phases (clear the ground, prove it,
build the plumbing, park or keep simple) with each step's first move, warnings where a pilot depends on
groundwork, what the sponsor must decide or provide, and how success will be measured, starting from
your charter. It is included in the JSON export and the LPP prompt (`planFor` in `src/game/flow.js`).

## Private progress report

Nothing leaves the browser on its own. From the character sheet, download a progress report
(JSON or CSV): lens, rank, standing, match rates by skill and capability family, marks and cases
collected. Share it with a manager or combine several to compare across a team.

## Sound

Sound is off by default. Turn it on with the speaker button in the top bar. Every cue is
synthesised in the browser with Web Audio (`src/audio/sound.js`), so there are no audio files to
load or license. Cues mark selections, matches and misses as each read is compared, the verdict
stamp, complications, marks and new ranks.

## Taking a map further

From the finished map: a ready-to-paste prompt for LPP, a structured map file (JSON, same shape
every time, now `version: 5` with an optional `charter`) for a Copilot Studio agent, a CSV with
one row per step, and print or save as PDF. Step descriptions are left out unless you tick
"Include step descriptions".

## Verdicts and the tool heading

Unchanged from v4. Eight verdicts (pilot now, pilot after preparing the data, assist only,
engineering not AI, fix the process first, capture the data first, not worth a tool at this
volume, park it) in `src/engine/engine.js` (`verdictOf`, `VERDICTS`). Six destinations (LPP,
LPP Plus, Copilot GCC, Copilot Studio, CodeHelper, No new tool) in `src/engine/tools.js`
(`scoreTools`). Every point a tool earns carries the sentence that explains it.

## Files

| Path | What it holds |
|---|---|
| `src/content/meridian.js` | The Bank: capabilities, profile options, guardrails, departments, the four flagship processes |
| `src/content/expeditions.js` | Step content for the original processes in compact form, the expander and the content check |
| `src/content/districts.js` | v5: five more departments and 15 processes in the same compact form |
| `src/content/story.js` | v4 complications, reaction lines, hints and marks |
| `src/content/campaign.js` | v5: lens-tagged complications and the charter questions |
| `src/content/fieldReports.js` | v5: the sourced landmark cases (real-world) and how they are matched to a step |
| `src/engine/engine.js`, `tools.js` | The decision engine: LLM fit, numbers, value, feasibility, verdicts, challenges, tool scoring |
| `src/game/flow.js` | The rules of a walk as pure functions, and the exports |
| `src/game/rpg.js` | Lenses, ranks, XP, standing and mastery |
| `src/game/store.js` | Game state and every action; the journal in local storage, saved on every change |
| `src/game/journal.js` | One list of everything started or finished, for Home, My maps and the top bar |
| `src/game/storage.js` | v8: the one place the game saves and loads: this browser, save links and save files |
| `src/components/SaveDialogs.jsx` | v8: saving and opening progress, and the check before replacing it |
| `src/views/Intro.jsx`, `src/components/Stages.jsx`, `src/content/glossary.js` | v8: the introduction, "you are here", and plain-language terms |
| `src/views/World.jsx`, `src/content/world.js`, `src/content/areas.js` | v8: the world map, its geography, and the work areas |
| `src/views/QuickRead.jsx` | v8: the quick read, its comparison, and the toggle between quick and full |
| `src/views/Survey.jsx` | The ranking of every process ("How do they rank?") and your route |
| `src/audio/sound.js` | Optional synthesised sound |
| `src/motionFeatures.js` | Animation features for Motion, loaded after first paint |
| `scripts/` | Content check, engine audit, fixture regeneration, and the browser, accessibility and performance checks |
| `docs/` | Review findings |
| `src/art/` | Line icons and the illustration set (13 departments, 12 kinds of work, 3 autonomy levels, 4 lens portraits) |
| `src/views/`, `src/components/` | Screens and shared UI |
| `src/styles/` | Tokens and styles |
| `tests/` | Golden tests that pin the engine to v4, and content tests |

## The processes

The original 38 processes are in `src/content/meridian.js`, `expeditions.js` and `districts.js`. v8
adds 54 more in `src/content/more/`, one file per group of divisions, merged on load
(`more/index.js`).

- **What they are:** true-to-life work that real central banks and large public bodies do, at
  Meridian's scale. Examples:
  - nowcasting growth from early data;
  - sanctions screening alerts;
  - stress test review;
  - CCTV review requests;
  - board minutes;
  - pension estimates.
- **The verdicts:** they are deliberately mixed. Across all 300 steps:

  | Verdict | Steps |
  |---|---|
  | Assist only | 66 |
  | Pilot now | 60 |
  | Engineering, not AI | 59 |
  | Prepare the data first | 39 |
  | Fix the process first | 38 |
  | Not worth a tool | 24 |
  | Capture the data first | 9 |
  | Park it | 5 |

  Every division has at least six different verdicts, and "pilot now" is about one step in five.

## Adding content

- **A process:** add it to a file in `src/content/more/` with its division, work area and steps in
  the compact form, and check the file with `node scripts/check-more.mjs <file>`. It checks structure,
  allowed values, the work area, house style, each step's verdict, and whether the engine would
  question the Guide's own read. `node scripts/check-guide-reads.mjs -v` reports the verdict spread
  for every division. Run `npm run check -- -v` to see the Guide's verdict for every step, and
  adjust the profile until each lands where you intend.
- **A landmark case:** add it to `fieldReports.js` with a named, linkable source and a figure you
  can find in that source. Tag the capabilities, verdicts, guardrails and kinds of work it
  illustrates.
- **A complication:** add it to `V5_EVENTS` in `campaign.js` with three answers, feedback for
  each, the lenses it is written for, and optionally a linked report.

## Develop, test and deploy

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # golden, ledger and exhaustive engine tests, and content tests
npm run check      # content check with the verdict spread
npm run audit      # exhaustive engine audit: verdicts, ties, overlaps, coverage, content integrity
node scripts/audit-options.mjs   # does every answer matter, do questions make sense, are complications a real choice
node scripts/browser-check.cjs   # the v7 fixes in Chromium (needs Playwright and a running preview)
node scripts/browser-check-v8.cjs   # v8: introduction, terms, stages, new words; save links and files; the world map; the quick read
node scripts/a11y-check.cjs         # v8: axe-core (WCAG 2.2 AA) on every main screen, dialogs, keyboard, tap targets
node scripts/perf-check.cjs         # v8: first load on a slow phone, tap response, frame timing, reduced motion
npm run golden     # regenerate the pinned fixture after a deliberate scoring change
npm run build      # static site in dist/
```

The decision engine is pinned three ways. `tests/fixtures/golden-current.json` holds today's
behaviour (every Meridian step under every tool context, plus 4,000 sampled combinations).
`tests/engine.exhaustive.test.js` checks properties over the whole input space instead of a sample.
`tests/engine.ledger.test.js` compares every state with a frozen copy of the v4 scoring
(`tests/legacy/tools-v4.js`) and allows only the differences listed in it. To change scoring on
purpose: change `tools.js`, add the change to the ledger, then run `npm run golden`.

`docs/review-v6.md` records the v6 review: the engine audit, what was fixed, and the open design
questions. `docs/review-v7.md` and `docs/review-v8.md` do the same for v7 and v8.

The workflow in `.github/workflows/deploy.yml` tests, builds and publishes `dist/` to GitHub
Pages on every push to `main`. In the repository settings, set **Pages > Source** to **GitHub
Actions**. While it is still "Deploy from a branch", GitHub also publishes the unbuilt repository on
every push, which is a blank page; the workflow waits for that to finish so the built site is published
last, and the page explains the setting if it is ever served unbuilt.

Marks, walks, saved maps and progress are kept in the browser's local storage under the v4 key,
so v4 maps and marks carry over. "Clear my results" on the home screen removes them after a
confirmation.
