# Groundwork v6: review findings

Covers the four threads in the v5 review plan. Everything below was measured on the code in this
repository on 13 October 2026; the numbers can be reproduced with `npm run audit` and `npm test`.

## 1. Decision engine audit

**Method.** `verdictOf` and `scoreTools` take a small set of inputs, so they were checked over their
whole input space rather than a sample: 43,200 states for verdicts, 17,280 for tool scoring, and
1,036,800 states for outcome coverage. States are limited to ones a player can reach, meaning the
capability always belongs to the band the question offers.

### Confirmed correct

- **Verdicts are exclusive and exhaustive.** `verdictOf` is an ordered chain that ends in a fallback
  (`pilot`), so exactly one verdict fires for every input and none is left without one. All eight are
  reachable: assist 17,784 states, capture 10,260, prepare 4,200, small 4,104, pilot 2,232, fix 2,160,
  engineering 1,404, park 1,056.
- **Tie-breaking never depended on object key order.** Ranking sorts a fixed array of destination ids,
  so results are reproducible. (It did depend on array order, see finding 2.)
- **Content resolves against the engine.** All 126 steps: every capability, autonomy and guardrail id
  exists, every `fit.best` has a field note, and the field's chosen capability is always one the
  capability question actually offers for the field's band, so a player can always match the field.
  The v5 additions were checked too: every Field Report's capabilities, verdicts, guardrails and kinds
  of work resolve. Content never names a tool id, because tools are computed, so there is nothing to
  orphan there.
- **Game state never feeds the engine.** Complications change standing and XP only. `scoreTools`
  and `verdictOf` take no lens, rank or stat, so the plan's "lens-weighted complications feeding back
  into the base score" does not exist, and the engine's results are independent of how well you play.

### Defects found and fixed

1. **Agent steps with personal data pointed at plain LPP, which cannot act.** The personal-data rule
   credited LPP +3 for every step. For an agent or coordinate step that tied LPP with LPP Plus (3 each)
   and array order gave it to LPP. **1,740 of the 6,048 agentic states (29%)** pointed at LPP, with the
   card reading "Personal or confidential data stays inside the air-gapped suite" as the reason.
   Fix: for agentic steps the credit goes to LPP Plus, which shares the boundary and can act.
   Afterwards no agentic step in the LLM bands points at LPP. Ties for first place fell from 3,072 to
   1,744 of 17,280 states.
2. **Tie order was an accident of array order.** It is now a named constant, `TIE_ORDER`, documented
   (least to build first, "no new tool" last) and enforced by a test. Behaviour is unchanged.
3. **Two sources of truth for complication slots, and dead content in v4.** `story.js` listed only
   `trail` for the first slot while the app drew from `trail` and `sponsor`. In v4, which used only
   `story.js`, the three sponsor complications (the demo, the brand name, the peer bank) could never
   fire. `story.js` is now the single source and the app imports it.

### Design questions, left for you to decide

- **Copilot Studio is credited twice for "connects to systems."** An agentic step already earns it +2
  for connecting systems, and "the work happens in a business system" adds another +2 for the same
  fact. In the 468 agentic states examined, counting it once changes the winner in 312 of them (LPP Plus
  would win instead). If that is the intent (agents in business systems go to Studio) it is working; if
  not, it is a one-line change. The cards currently give both sentences as reasons.
- **Agent steps can still point at Copilot GCC.** 252 of the 6,048 agentic states (4%) do, when the
  work lives in Office and the builder is the team. Copilot GCC is described as an assistant inside
  Outlook, Word, Excel and Teams, not an agent platform.
- **`assist` hides `park` in 5,478 of 43,200 states (12.7%).** A high-stakes step that is also blocked
  by media inputs and no builder is told "assist only", and never "park it: name the single blocker".
  Reasonable precedence, but the blocker advice is lost.
- **Negative scores.** Personal data takes 1 point off Copilot GCC, so 2,016 states contain a score
  below zero. The interface clamps these at zero, so nothing is shown wrongly.

### Golden test coverage

The 4,000-combination sample reached **411 of 1,829 distinct outcomes (22.5%)**, counting each
combination of value, feasibility, verdict, winning tool, runner-up and challenges. It was a good smoke
test but missed most edge cases. Added:

- `tests/engine.exhaustive.test.js`: all eight verdicts reachable and none missing across 43,200
  states; ties go to `TIE_ORDER`; no agentic step points at plain LPP; personal data stays in LPP or
  LPP Plus.
- `tests/engine.ledger.test.js`: compares every state of `scoreTools` with a frozen copy of the v4
  module (`tests/legacy/tools-v4.js`). The only permitted difference is finding 1, and the test checks
  that exactly the personal-data credit moved from LPP to LPP Plus. It also checks that verdicts,
  value, feasibility, challenges, guardrails and numbers sentences are identical to the v4 fixture.
- `tests/fixtures/golden-current.json` pins today's behaviour; `golden-v4.json` is kept as history.
  After a deliberate scoring change, run `npm run golden` and add the change to the ledger.

## 2. Department discoverability

**Diagnosis confirmed, with numbers.** The detail panel rendered after all five bands. From a cold
start, clicking Economists put the process list 832 px below the card at 1360×800, and 1,830 px below
it on a 390×844 phone. (The plan calls the state `selectedDept`; in this code it is `viewFn`.)

**Fixed:**

| Change | Result |
|---|---|
| Inline drawer under the band that holds the card | Opens directly beneath the card you clicked, inside the same band |
| Count and chevron on every card | 13 of 13 cards show "N processes" and a chevron that points down or up |
| Keeps the clicked card in view when the drawer opens | Card and process list on screen after one click, at both sizes |
| Auto-opens one department on first visit, once | Opens the one with the strongest evidence, not the first in the list, so a player who heads for the top card is not closing it. Remembered in the journal |
| Hint line when nothing is open | Replaces the old empty box at the bottom of the page |
| Motion height and opacity (220 ms ease-out), instant under reduced motion | Open and close both animate |

Tested at desktop and phone width (26 checks): cold-start Economists scenario, one drawer at a time,
shortlisting from inside the drawer, clicking the open card closes it, second visit starts closed,
Enter and Space on a card, and reduced motion.

## 3. Three.js: recommendation is no, for now

Your own test is "anything that only decorates is left out," and the terrain screen does not pass it.
Despite the name, **it is not spatial**: it is 13 department cards in five groups over a decorative
contour background. There is no distance, adjacency or position to explore, so a 3D camera would add
something to operate and nothing to read. Evidence strength is already one variable and shows as a glow
and a heat rating.

The costs you listed all apply: a heavy dependency, a 2D fallback for weak phones, and much more work to
keep keyboard and screen-reader behaviour at the level the cards have now. Revisit only if the screen
gains data that is actually spatial (the three buildings, or flows between departments). Even then, a
2D SVG survey map would be cheaper and accessible. The discoverability fix was the real cause of the
"nothing happened" feeling, and it is done.

## 4. Motion

Added with `LazyMotion`, so the animation features load after first paint. Entry bundle: +17 KB gzip
(213 KB total), plus an 18 KB chunk loaded afterwards.

**Applied where CSS could not do the job, which is exits and animating to `height: auto`:**
department drawer (open and close), dialogs (complications, rank-ups, Field Reports: enter and exit),
and toasts (exit).

**Not changed, and why.** The plan assumed several of these were instant. They are not:
- Stage transitions already use the browser View Transitions API (cross-fade, with named step cards).
- The verdict landing is already a staged sequence: each answer is marked in turn, then the field's
  read, then the verdict card flips in and its emblem stamps.
- XP gain, rank-up and mark unlocked already animate (floating XP pop-up, toast, rank-up dialog).

Adding Motion on top would double-animate them in the browsers that support View Transitions. Everything
respects `prefers-reduced-motion`.
