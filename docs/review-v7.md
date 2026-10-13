# Groundwork v7: what changed and why

v7 answers four pieces of feedback on v6: a map that could not be found again, achievements that
vanished, shortlist choices that were hard to see, and whether the options and the mapping hold
together as a strategic exercise. Every problem below was reproduced in a browser or measured with a
script before it was changed. The checks can be re-run with `npm test`, `node scripts/audit-options.mjs`
and `node scripts/browser-check.cjs`.

## 1. Getting back to a map

**What was wrong.** Three separate things, all reproduced:

- A map of your own was saved, but Home listed it under "Your maps" 907 px down a 800 px screen, and the
  big "Map your own process" button opened a new, blank map. It looked lost.
- A Meridian walk was not saved at all. Going Home or reloading lost it, and a finished walk kept only a
  one-line summary, so its finished map could never be seen again.
- A setup typed before pressing "Start mapping" was lost on reload.

**What v7 does.**

- Every walk and map is saved in this browser on every change, including half-typed setups, which are
  kept as drafts.
- Home opens with **Pick up where you left off**, above the fold, and the button now says
  "Map a new process" once you have maps.
- **My maps**, in the top bar on every screen, lists everything in progress and finished, with a way
  back into each and a delete with confirmation. Finished walks reopen on their finished map, read-only,
  so nothing is scored twice.
- **Save map file** and **Open a map file** carry a map to another browser or device. Browser storage is
  per browser, so this is the only way a map made on one machine can be opened on another.
- A walk you return to says so, with a way to start it again from scratch.

## 2. Achievements you can actually see

**What was wrong.** Marks, ranks and new cases were small toasts in the bottom-right corner for 4.6
seconds. At the end of a walk several fired at once, and only three could be on screen; extras were
dropped immediately.

**What v7 does.**

- A **spotlight** near the top of the screen shows one achievement at a time for 7 to 8 seconds, with a
  visible countdown. It pauses while you point at it or focus it, waits for any dialog to close, and
  offers "See your insignia". Marks earned at the same moment share one card, so the end of a walk is
  one card, not a queue.
- Nothing is lost if you miss it: new marks and ranks are counted on the character button, new cases on
  the Library button, highlighted as "New" when you open them, and the walk's debrief lists everything
  earned on that walk.
- New Field Reports no longer get a spotlight, because the case is already on screen where you met it.

## 3. Shortlisting, and the next step

**What was wrong.** The department panel opened in place (v6), but the processes were small "Shortlist"
buttons on the right of a two-column panel, after the illustration and signals, and the way on was a
plain button in the footer.

**What v7 does.**

- The processes come first, as large cards you click to add, under **Choose what to shortlist** with a
  live "N of 3 chosen". Signals move to the side as the evidence.
- Once something is chosen, **Next: compare with the full survey** appears right under the choices, and
  the footer button turns brass with the same words.
- When a department opens, the page shows as much as fits while the card you clicked stays on screen.
  On a phone, the description is shortened to two lines so the first choice fits.

## 4. The options, and whether mapping feels strategic

An exhaustive script (`scripts/audit-options.mjs`) switched each answer while everything else stayed the
same, and measured whether what the player is told changed: verdict, value, feasibility, tool,
challenges and guardrails.

| Finding | v6 | v7 |
|---|---|---|
| Strong complication answer is the longest of the three | 26 of 26 | 2 of 26 |
| Kind of work: "read & pull out facts", "look up & answer", "write & draft", "summarise" change anything | never (0%) | 17% to 45% of contexts |
| A capability that is not a usual fit for the kind of work draws a challenge | 32 of 792 | 792 of 792 |
| Forecasting, scheduling or physical work called an LLM's job is challenged | 1 of 6 cases | 6 of 6 |
| "How much should it act on its own?" asked after "Fix the process (no tool)" | yes | no |
| "Where does the work happen?" asked when it cannot affect anything (rules, fixes, non-LLM AI) | yes | no |
| "Paper" and "several of these" for where the work happens behave identically | yes | no: paper with typed inputs is challenged |

**Complications.** Every answer to all 26 was rewritten so that length gives nothing away and every
wrong answer carries the reason that makes it tempting. The feedback for each answer is unchanged.

**Your own maps.** The capability question now leads with what fits the kind of work you described
("Fits this work", "Could work") and explains why on hover; the LLM-fit question marks the bands that
hold a usual fit; autonomy shows the usual setting for the stakes you chose; cautions (data not
captured, low volume, high stakes) appear where they matter. Guided walks stay unhinted, because there
the read is the test.

**The plan.** The finished map now leads with a plan, in both modes:
- a headline: what to do first and why;
- four phases (clear the ground, prove it, build the plumbing, park or keep simple), with every read step
  in exactly one, by its verdict, and its first move;
- a warning wherever a pilot or a build comes after a step that needs groundwork;
- what the sponsor has to decide or provide (a decision owner, permission to change the process,
  where data will be recorded, a privacy review, who builds it, developer time, system owners);
- how you will know it worked, starting from your charter's measure of success;
- for your own maps, the hours a month at stake.
The plan travels in the JSON export and the LPP prompt.

**Left as it is.** "Public" and "internal" data still lead to the same advice, because every approved
tool may hold internal material. The distinction is recorded for the export.

## Engine changes, and how they are pinned

The new challenges are change 2 in `tests/engine.ledger.test.js`: across all 17,280 combinations of
band, capability, kind of work, inputs, place, stakes and autonomy, v4's challenges come first and
unchanged, and every added one is one of the three v7 kinds. Verdicts, value, feasibility, tool scoring
and guardrails are untouched since v6.

## Tests

- `npm test`: 33 tests, including the v4 ledger, exhaustive engine properties, and v7's questions, plan,
  journal and store (saving, resuming, drafts, map files, the achievement queue).
- `scripts/browser-check.cjs`: 22 checks in Chromium at desktop and phone width, covering each issue
  above as a player would meet it.
