# Groundwork v8: what changed and why

v8 set out to make Groundwork usable by someone who is not technical and has never heard of Meridian:
they should know from the first screen what they are about to do, be able to come back to their work
from any browser, explore the Bank as a place, and read a process without filling in a long form. The
plan is in `docs/plan-v8.md`, with a progress note for each phase. This review covers what shipped,
then the polish pass (phase 6) in detail, with its measurements.

Every claim below comes from a check that can be re-run:

```bash
npm test                              # unit, engine and content tests
npm run build && npx vite preview --port 4173
node scripts/browser-check.cjs        # v7 behaviour still holds
node scripts/browser-check-v8.cjs     # v8 phases 1 to 5
node scripts/a11y-check.cjs           # phase 6: accessibility on every main screen
node scripts/perf-check.cjs           # phase 6: load time, response and smoothness on a slow phone
```

## What v8 delivered

| Phase | What a player gets |
|---|---|
| 1. The first two minutes | A three-card introduction (what Meridian is, what you will do, what you get), a "you are here" strip, and plain words: the Guide, landmark cases, Logbook, Hint, "Where could AI help most?" |
| 2. Getting back to your work | Save links and save files that carry everything to another browser, with nothing sent to a server, and a check before anything is replaced |
| 3. Meridian as a world | An island map you can move around, zooming from the Bank to a division, a work area and its processes; a route of up to three; a list view of the same levels |
| 4. More ground | 54 new true-to-life processes: 92 processes and 300 steps in 38 work areas, with an honest spread of verdicts |
| 5. The quick read | Three calls per step on one screen, the facts given, one comparison with the Guide, and a comparison across a route |
| 6. Polish | A faster first load, motion that never resizes the page, and every main screen passing an accessibility audit |

Saved progress kept the same shape throughout: a v7 journal opens in v8, and the scoring engine's
pinned fixtures are unchanged except where phase 4 added new processes.

## Phase 6: performance

**How it was measured.** `scripts/perf-check.cjs` loads the game cold on a phone-sized screen, over a
"slow 4G" connection (150 ms round trip, 1.6 Mbit/s) with the processor slowed four times. Web fonts
are blocked so the numbers do not depend on Google's servers. Medians of five runs:

| | Before | After |
|---|---|---|
| Something on screen | 0.57 s, an empty textured background | 0.79 s, the Groundwork loading screen |
| First screen ready to use | 2.46 s | 2.21 s |
| Main thread blocked while loading | 282 ms | 204 ms |
| Code downloaded before the first screen | 333 KB | 298 KB |

**What changed.**

- **Later screens load later.** The world map (with its zoom library), the reads, the finished map,
  the character sheet, the library and the setup for your own map now load just after the first screen
  appears, while the player reads it. A screen that is already loaded opens at once. A player who is
  faster than their connection sees "Opening…", then the screen. Keyboard focus still lands on its
  heading, and a check holds the map's code back on purpose to prove it.
- **A screen that cannot be fetched says so.** Splitting the code brings a new way to fail: the connection
  drops, or the site is updated while a tab is open and the old files are gone. Without a safety net, the
  whole page would go blank. Now the screen says it did not load, keeps the rest of the game, and offers a
  reload, which loses nothing because progress is saved on every change. "Try again" was tried and
  dropped: browsers remember a failed download until the page reloads, so it could never work. A check
  blocks the map's code to prove all this.
- **Separate files for things that change at different speeds.** The libraries (React, Immer) and the
  Bank's content now each have their own file. After an update that only touches screens, a returning
  player's browser keeps the larger files it already has.
- **A loading screen from the first moment.** `index.html` now carries a small loading screen with the
  Groundwork mark and "Opening Meridian…", styled inline so it needs nothing else to arrive. If the
  game cannot start, the same screen explains why. A slow connection is no longer reported as a
  failure after 10 seconds: after 20 it suggests reloading instead.
- **Fonts no longer hold up the first paint.** Text shows in a system font and switches to Literata
  and Atkinson Hyperlegible when they arrive. The check cannot reach Google from its sandbox, so this
  gain is not in the table. On a real slow connection it saves the time to connect to a second server.

**A finding, not changed.** The Bank's content is 558 KB of the 966 KB in the first download (172 KB
of 307 KB compressed), and every screen needs some of it, so it stays there. Most of it is the text of
each step. Loading that only when a process is opened would make the first download much smaller, but
it changes how content reaches every screen, the engine and the tests. It is the next step if the first
load ever needs to be faster.

## Phase 6: motion

The plan asked for one motion language: only position, size and fade animate, never layout, and
reduced motion is respected everywhere.

**What was found and fixed.**

- **Five progress bars and the tool-score bars animated their width.** This forces the browser to
  recalculate the page layout on every frame. They now slide a full-width fill into place, which looks
  the same and runs on the graphics card.
- **The current-step marker pulsed by repainting its shadow** on every frame, for as long as it was on
  screen. It is now a ring that grows and fades.
- **The pulse on the Home map's end point did nothing**, because shadows do not apply to map drawings.
  It now glows as intended.

**How it is checked.** `scripts/perf-check.cjs` records frame times on the slowed phone while entering
a division, opening a work area and comparing a quick read. It now measures two things separately, as
browsers do:

- **Response:** the frame that holds the tap's own work. Google's "interaction to next paint" counts
  under 200 ms as good. Measured: 50 to 133 ms.
- **Smoothness:** every frame after that. A gap over 50 ms is a dropped beat. Measured: the worst gap
  is 17 to 50 ms. The check fails if any gap passes 67 ms, or more than one passes 50 ms.

An earlier version of the check mixed the two, and failed now and then on a single 167 ms frame. A
profile showed that frame was React building the division screen, about 80 ms of script on the slowed
processor, before the zoom starts. The zoom itself never stalls.

With reduced motion turned on, the check confirms nothing keeps moving on Home, the map or a process
screen. With it off, the Home map's glow keeps running, which shows the check would notice. Levels of
the map fade instead of zooming, as in phase 3.

**Durations in use.** Interface changes take 120 to 250 ms. The zoom between map levels takes 550 ms,
shorter than the 800 ms in the plan, because it tested smooth and felt more responsive. Progress fills
take 300 to 600 ms.

## Phase 6: accessibility

**How it was checked.** `scripts/a11y-check.cjs` walks 25 screens and states at desktop and phone
size: the introduction, the lenses, the map, a division, a work area, the route, the list view, a
process, the quick read before and after comparing, a complication, the finished map, the save dialog,
Home, the full read, a step, My maps, the case library, the character sheet and the setup for a map of
your own. It runs axe-core on each, using the WCAG 2.2 A and AA rules plus axe's best practices. It also
checks what axe cannot:

- that Tab stays inside dialogs;
- that focus returns when a dialog closes;
- that tap targets on a phone are at least 24 by 24 pixels, or have room around them.

**Before:** 41 of the 48 screen audits failed, and so did all three keyboard checks. (The list view
joined the tour after this first run.)

| Rule broken | Impact | Where |
|---|---|---|
| Text contrast below 4.5:1 | Serious | 36 screen audits |
| A button's spoken name does not contain its visible text | Serious | 19 screen audits, including 21 buttons on the desktop library screen |
| Heading levels skip a level | Moderate | 12 screen audits |
| A role not allowed on its element | Minor | 18 screen audits |

**After:** all 50 screen audits pass, and so do the keyboard and tap-target checks.

**What changed.**

- **Brass behind white text was 3.3:1.** This covered the main call-to-action buttons, "New" tags,
  experience pop-ups and the "for your lens" tag. A new token, `--brass-fill` (#94661C), gives 5.0:1
  and keeps the warm brass look. The original brass stays for lines, bars and accents, which need only
  3:1. The amber "Workable, but" tag went from 4.4:1 to 5.2:1.
- **Empty plan phases were faded to 60% opacity,** which took their text down to 2.4:1. They now have
  a dashed outline and full-strength text.
- **Button names.** The top-bar buttons, the character button, the landmarks on the map and the
  library cards each had a spoken name that did not contain their visible text. For example, "Case
  library, 4 new" was read for a button showing "Library 4". This breaks voice control, where people
  say what they see. Names are now built from the visible text, with extra words hidden from sight but
  read out. On phones, the top-bar words are hidden from sight but still read out, instead of being
  removed.
- **Dialogs.** While a dialog is open, the page behind it is inert: Tab, clicks and screen readers stay
  inside it, and Tab wraps from the last button to the first. When it closes, focus returns to whatever
  opened it.
- **Headings** no longer skip levels on the division screen, the quick read's notes or the finished
  map. The achievement spotlight is a status message, without a role its element does not allow.

**What automated checks cannot tell you.** Automated tools find about a third to a half of
accessibility problems. Nobody has yet played Groundwork with a screen reader (NVDA, JAWS or
VoiceOver), with voice control, or at 200% zoom. A short session with people who use them every day
is the most useful next step.

## Open questions

- **Content on demand:** load step text per process to halve the first download (see Performance).
- **Real assistive technology:** a session with screen-reader and voice-control users (see
  Accessibility).
- **Checks in the deploy workflow:** the browser, accessibility and performance checks need a browser,
  so they run before each merge but not in the GitHub workflow. Adding Playwright to the workflow would
  catch a regression even when nobody runs them.
