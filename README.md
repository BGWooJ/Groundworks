# Groundwork v3: AI use-case discovery for Meridian Reserve Bank

A training game about finding where AI actually belongs in an organisation. You lead the
search at a fictional reserve bank: survey the terrain, walk one process step by step,
match capabilities to the work, check what it would really take, and pitch one case.
Then apply the same method to a process of your own.

## How a run plays

1. **The letter.** Your sponsor, Marion Okafor, gives you twelve weeks before the
   leadership meeting. Choose a background and how much guidance you want.
2. **Survey the terrain.** Read each function's signals and shortlist up to three processes.
3. **The full survey.** See how close your shortlist was to the true hotspots.
4. **Choose an expedition.** Pick one of *your shortlisted* processes. All 23 processes are playable.
5. **Walk the steps.** For each step: read the field card, profile the work, compare with the
   field read, choose a capability and autonomy level, collect field notes, and optionally
   spend time interviewing for more evidence. Carry promising steps forward.
6. **Reality check.** Rate data readiness, risk, change and integration, then see your
   placements plotted against the field's on a portfolio map.
7. **Build the case.** Pick the case to pitch, choose its guardrails, and get a one-page canvas.
8. **Debrief.** One of six endings, a final rank, where your points came from, paths not
   taken, marks earned, your expedition log, and approved tools that match what you found.

## The game layer

- **Standing.** XP and five ranks (Day tripper to Expedition lead), plus three stats from 0 to 10:
  Credibility (the sponsor's confidence), Trust (the floor's openness) and Rigor (the
  quality of your evidence). Weeks are a budget: each step, the survey, the reality check,
  the presentation and some interviews cost time.
- **Standing effects.** Stats change how the game plays. Trust at 7 or more makes interviews
  free, and at 2 or less they cost two weeks. Credibility at 7 or more buys an extra week, and
  at 2 or less loses one. Rigor at 7 or more adds Credibility when you present.
- **Backgrounds.** The analyst gets two free interviews, the operator hears a word from the
  floor before profiling every step, and the strategist gets two extra weeks and one chance
  to rethink a decision on the trail.
- **Events.** Six moments per run (sponsor, two on the trail, data, team, metric) are drawn
  from a pool of 13, with choices shuffled. Choices set flags that echo later in the run, on
  the canvas, at the debrief and in the tool recommendations.
- **Endings and marks.** Six endings and twelve marks are kept in the browser's field
  journal, shown on the start screen, so there is always a reason to try another approach.
  "Try another approach" replays the same process with a different background.
- **The field guide.** Help at the moment of need. "Walk me through it" opens a question at
  every decision. "Nudge me if I stall" opens after about 25 seconds without progress, or
  after a miss. "Only when I ask" keeps it closed. A second tier highlights the evidence
  on the page that answers the question. The guide opens inline, beside the decision.
- **Varied responses.** Reactions, arrivals and waypoints are drawn from line pools, so the
  same choice reads differently from one run to the next.

## Files

| File | What it holds |
|---|---|
| `index.html` | Page shell: app root, field guide dock, toasts, event dialog, AI settings |
| `styles.css` | All styling. Spruce instrument rail, survey-paper reading surface, brass for you, glacier blue for the field view |
| `data.js` | The Bank: functions, processes and ratings, capabilities, profile dimensions, guardrails, and the four flagship processes (A to D) |
| `expeditions.js` | **New.** The other 19 processes in a compact format, expanded into the full step shape, and `getExpedition(id)` |
| `story.js` | **New.** Sponsor, stats, backgrounds, effects, events, consequences, reaction lines, ranks, endings, marks and field guide hints |
| `engine.js` | Scoring and suggestion engine |
| `ai.js` | Optional Together.ai connection: field guide hints and tool reasoning, plus the approved tool inventory |
| `icons.js` | SVG icon library |
| `app.js` | Game state, flow, views, journal, field guide and effects |

`app.js.clean` from the previous version is no longer used and can be deleted.

## Customising content

**Add or edit a process.** Processes on the map come from `FUNCTIONS` in `data.js`. To make
one playable, add an entry to `COMPACT` in `expeditions.js` keyed by its process id. Each
step uses short fields, documented at the top of that file: `p` is the expert profile as
`"shape input rep stakes"`, `best` and `ok` list capability ids, `auto` is the best autonomy,
`disc` holds two field notes, `fv` is `"feasibility value"`, and `g` lists guardrail ids.
The loader validates every step on page load and logs problems to the browser console.

**Change the story.** Everything narrative lives in `story.js`. To add an event, add an
object to `EVENT_POOL` with a `slot`, the text, and options with a score `s` (0 to 2), stat
changes `d`, and an optional `flag`. Flags can be echoed later through `CONSEQUENCES`.
Endings are tested in order; the first `test` that passes is the one the player gets.

## Running it

It is a static site. Any static host or local server works:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

### GitHub Pages
Replace the files in the repository with these, and make sure `expeditions.js` and
`story.js` are committed alongside the others. Pages redeploys on push.

### AI connection
The game runs fully without AI. With a Together.ai connection, the field guide offers an
"Ask the AI guide" option and the debrief adds a one-line rationale to the tool suggestion.
Set the model and key from the **AI guide** pill; both are stored in the browser only.

> **Security note.** `ai.js` still contains a default Together.ai API key. On GitHub Pages,
> anyone can read it in the page source. Rotate that key, remove it from `ai.js`, and either
> let each user enter their own key in the AI panel or route requests through a small proxy
> that holds the key server-side.

## Testing notes

Every one of the 23 expeditions was played to the debrief in a headless browser, with
random choices and with expert choices, across all three backgrounds, with no script
errors. Random play ends at "Back to the map"; expert play reaches "Green-lit" at the top
rank. Layouts were checked at desktop and phone widths, with reduced-motion respected.
