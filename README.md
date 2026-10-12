# Groundwork v5: find where an LLM earns its keep

Groundwork teaches one method: break a process into its steps, read each step for the kind of
work it really is, and decide honestly whether it is an LLM's kind of work, a job where an LLM
supports a person, a job for a different kind of AI, or a job for something simpler. Every
answer also moves a **heading** toward the approved tool that fits.

v5 is a rewrite in React. It keeps the v4 decision engine unchanged and adds more ground to walk,
real cases from outside the Bank, a light RPG layer for every level of the organisation, and
optional sound.

## The hypothesis behind the game

- **Behaviour we want:** before anyone proposes a tool, they read the process step by step and
  match each step to the right kind of help, including "no tool".
- **Outcome it should produce:** fewer pilots that start from a brand or a demo, and more
  pilots with a baseline, a measure and the right amount of human oversight.
- **How we would know:** the share of proposals that arrive with a step map and a baseline, and
  how often players' reads match the field (the progress report records both, privately).

Every game mechanic in Groundwork has to change a decision or explain one. Anything that only
decorates is left out.

## Two ways in

**Walk a Meridian process.** A fictional reserve bank with 13 departments and 38 walkable
processes (126 steps). Survey the Bank, shortlist up to three processes, pick one, and read it
step by step. After each read you compare with the field's view: which answers match, the verdict,
notes from the floor, and often a real case from the wider world. Two complications per walk
test your judgment under pressure.

**Map your own process.** Start with the **charter**, four questions to answer before any tool,
pilot or game: the challenge (as a hypothesis), what success looks like, whether your systems can
track it automatically, and who it is for. Then name the steps and read each one, with optional
numbers. Groundwork gives each step a verdict, pushes back on contradictions, and builds the map.
The charter travels with the map into every export.

## Every level of the organisation: lenses

On first play you choose a lens. Lenses change what opens first, not the difficulty. Every lens
can see every finding.

| Lens | For | Opens first on every step |
|---|---|---|
| Practitioner | People who do the work | Both field notes, and what changes for the person at the desk |
| Steward | Team leads and managers | First move, who to involve, how to measure it |
| Sponsor | Executives | Value and feasibility grid, and the value hypothesis |
| Builder | Builders and IT | How each approved tool scored, data needed, guardrails |

Complications are drawn with a preference for your lens, so a sponsor meets "gamify everything"
and "show me the return" more often, and a builder meets "build our own" and "write access".

## The RPG layer

- **Experience and ranks.** XP comes from reading well (matching the field), judging well
  (strong answers to complications), hearing from the floor, finishing walks and maps, and taking
  maps further. Ranks run from Apprentice Surveyor to Master Cartographer.
- **Standing.** Four stats move with your complication answers: Credibility (with leadership),
  Rigour (in the method), Trust (of the people doing the work) and Time in hand. The debrief at the
  end of a walk tells you what your sponsor thinks of how you handled the pressure.
- **Reading skills and capability mastery.** Your match rate on each question, and on each
  capability family. Weak spots tell you what to practise.
- **Insignia.** Fourteen marks, including four new ones in v5.
- **Field Library.** 19 real, public cases (Air Canada's chatbot ruling, Mata v. Avianca, Knight
  Capital, Zillow Offers, UPS ORION, the Robodebt Royal Commission and more). You collect each one
  when a step you read or a complication you face calls for it. Each card names its source and
  links to it. You can read any case in the library before you collect it.

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
| `src/content/story.js` | v4 complications, reaction lines, field guide hints and marks |
| `src/content/campaign.js` | v5: lens-tagged complications and the charter questions |
| `src/content/fieldReports.js` | v5: the sourced real-world cases and how they are matched to a step |
| `src/engine/engine.js`, `tools.js` | The decision engine: LLM fit, numbers, value, feasibility, verdicts, challenges, tool scoring |
| `src/game/flow.js` | The rules of a walk as pure functions, and the exports |
| `src/game/rpg.js` | Lenses, ranks, XP, standing and mastery |
| `src/game/store.js` | Game state and every action; the journal in local storage |
| `src/audio/sound.js` | Optional synthesised sound |
| `src/art/` | Line icons and the illustration set (13 departments, 12 kinds of work, 3 autonomy levels, 4 lens portraits) |
| `src/views/`, `src/components/` | Screens and shared UI |
| `src/styles/` | Tokens and styles |
| `tests/` | Golden tests that pin the engine to v4, and content tests |

## Adding content

- **A process:** add it to a department in `districts.js` (or a new department) with steps in
  the compact form. Run `npm run check -- -v` to see the field's verdict for every step, and
  adjust the profile until each lands where you intend.
- **A Field Report:** add it to `fieldReports.js` with a named, linkable source and a figure you
  can find in that source. Tag the capabilities, verdicts, guardrails and kinds of work it
  illustrates.
- **A complication:** add it to `V5_EVENTS` in `campaign.js` with three answers, feedback for
  each, the lenses it is written for, and optionally a linked report.

## Develop, test and deploy

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # golden engine tests and content tests
npm run check      # content check with the verdict spread
npm run build      # static site in dist/
```

`tests/fixtures/golden-v4.json` was produced by running `tests/probe.js` against the v4 scripts
before the rewrite: every Meridian step under every tool context, and 4,000 sampled answer
combinations. The test fails if the engine decides anything differently.

The workflow in `.github/workflows/deploy.yml` tests, builds and publishes `dist/` to GitHub
Pages on every push to `main`. In the repository settings, set **Pages > Source** to **GitHub
Actions**.

Marks, walks, saved maps and progress are kept in the browser's local storage under the v4 key,
so v4 maps and marks carry over. "Clear my results" on the home screen removes them after a
confirmation.
