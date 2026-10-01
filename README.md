# Groundwork v4: find where an LLM earns its keep

Groundwork teaches one method: break a process into its steps, read each step for the kind of
work it really is, and decide honestly whether it is an LLM's kind of work, a job where an LLM
supports a person, a job for a different kind of AI, or a job for something simpler. Every
answer also moves a **heading** toward the approved tool that fits.

## Two ways in

**Walk a Meridian process.** A fictional reserve bank with 23 processes. Survey the Bank,
shortlist up to three processes, pick one, and read it step by step. After each read you
compare with the field's view: which answers match, what the field sees differently, the
verdict for the step, and notes from the floor. Two complications per walk test your judgment,
with feedback but no score.

**Map your own process.** Name a process and its steps. For each step, answer the same
questions and, optionally, four plain numbers (how often, how long, how often it is redone,
how many people). Groundwork turns them into hours and a share of the team's time, gives each
step a verdict with a first move, pushes back on contradictions, and builds the finished map.
Maps save in the browser and can be reopened from the home screen.

## What happens on each step

Ten short questions, one at a time. Each folds into a row once answered; tap a row to change it.

1. Kind of work, inputs, volume, stakes: the profile of the work.
2. Is this an LLM's kind of work? Then the capability and how much it should act on its own.
3. Where the work happens, who would build it, and how sensitive the data is. These have no
   right answer; they decide which approved tool fits. The last two carry over to the next step.

## Verdicts

Every step gets one of eight verdicts, each with plain advice, a first 30-day move and who to
involve: pilot now, pilot after preparing the data, assist only (a person decides), engineering
not AI, fix the process first, capture the data first, not worth a tool at this volume, and
park it (valuable but blocked). Verdict rules are in `engine.js` (`verdictOf`, `VERDICTS`).

## The tool heading

Six destinations: LPP, LPP Plus, Copilot GCC, Copilot Studio, CodeHelper, and No new tool.
Each answer adds points to destinations, and every point carries the sentence that explains
it, so the map can always say why a step points where it does. The heading under the map shows
the leading destination, or two when a process genuinely splits. Scoring rules are in
`tools.js` (`scoreTools`). To add a destination such as MartinAI, add it to `DESTINATIONS` and
give it rules in `scoreTools`.

## Taking a map further

Nothing leaves the browser on its own. From the finished map:

- **Analyse in LPP:** a ready-to-paste prompt built from the abstracted results.
- **Copilot Studio:** a structured map file (JSON, same shape every time) to save where an
  agent reads, such as its knowledge folder.
- **Spreadsheet:** a CSV, one row per step.
- **Meeting:** print or save as PDF.

Step descriptions are left out of every export unless the person ticks "Include step descriptions".

## Files

| File | What it holds |
|---|---|
| `index.html` | Page shell |
| `styles.css` | All styling |
| `data.js` | Meridian Reserve Bank: functions, processes, capabilities, profile options, guardrails |
| `expeditions.js` | Step content for all 23 processes, with a content check that reports problems in the browser console |
| `story.js` | Complications, reaction lines, field guide hints and marks |
| `engine.js` | Field comparison, suggestions, LLM-fit bands, numbers, value and feasibility, verdicts, challenges |
| `tools.js` | Approved destinations and the tool scoring |
| `icons.js` | Line icons |
| `illustrations.js` | The illustration set: 8 departments, 12 kinds of work, 3 autonomy levels, drawn as SVG from shared helpers |
| `app.js` | Screens, flow, journal and exports |

## Deploying to GitHub Pages

Replace the repository's files with these. Then **delete `ai.js` and `app.js.clean`** from the
repository: v4 does not use them, and `ai.js` contains the old Together.ai key. Rotate that key
with Together.ai as well, because it has been publicly readable.

## Local testing

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Marks, recent walks and saved maps are kept in the browser's local storage. "Clear my results"
on the home screen removes them after a confirmation.

## Illustrations

`illustrations.js` holds 23 line drawings in the app's spruce and brass: one per
department (survey drawer, process picker, map heading), one per kind of work (shown beside
the first question as you point at each option, and on every read step card), and one per
autonomy level (on the autonomy choices). They are built from shared helpers (a person,
a document, a desk), so every figure is drawn the same way, with the head resting on the
shoulders. To add one, compose it from the helpers and add it to `dept`, `shape` or `auto`.
