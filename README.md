# Groundwork v2: AI Use-Case Discovery for Meridian Reserve Bank

A visual, interactive game that teaches organizations how to discover AI use cases using a systematic process:
1. **Survey** the organizational terrain
2. **Pick** a process to deep-dive
3. **Profile** each step of the process
4. **Match** AI capabilities to needs
5. **Reality-check** feasibility and value
6. **Canvas** guardrails and next steps

Then **apply** the same method to your own processes.

## New in v2

✨ **Visual polish:**
- Smooth CSS transitions and tactile feedback on every interaction
- Icons for each organizational function (Economists, Researchers, IT, HR, Benefits, Facilities, Events, Law Enforcement)
- Terrain map grouped into three bands — the mission, running the buildings, supporting the people
- Sleek, modern UI with refined typography, hover states and a connection pill
- Function icons integrated into the terrain map, process selection and capability families

🤖 **AI Integration (Together.ai):**
- Connects to Together.ai (OpenAI-compatible) out of the box
- Contextual nudges while profiling and matching each step
- A hand-written static hint always shows what a section needs — so the game works fully even when AI is offline
- Dynamic tool recommendations at the end, with an optional one-line AI rationale
- Model and API key can be changed in the ⚙ AI panel (saved in your browser)

🛠 **Tool Recommendations:**
Suggests tools from the approved inventory, matched to the capability types you identified:
- **LPP** — airgapped LLM suite (Claude, Grok, Nemotron, Llama, Nova Pro, GPT OSS)
- **LPP Plus** — LPP with agent functionality
- **Copilot for Government Community Cloud**
- **CodeHelper** — Claude Code in Terminal / VS Code
- **Copilot Studio** — low-code agents for MCP/API integration

## Files

- `index.html` — Main entry point with modals and the ⚙ AI pill
- `styles.css` — Enhanced CSS with transitions, icons, bands, and the connection pill
- `data.js` — Meridian Reserve Bank configuration (2,400 staff, 8 functions, 4 deep-dive processes A–D)
- `icons.js` — SVG icon library (function icons, capability families, UI elements)
- `app.js` — Game logic, state machine, view rendering, nudges, tool recommendations
- `engine.js` — Scoring and suggestion engine (unchanged from v1)
- `ai.js` — Together.ai connection, nudge generation, tool inventory + matching

## Local Setup

### Run it (AI works out of the box)
```bash
cd groundwork2
python -m http.server 8000
# Visit http://localhost:8000
```
The game serves as static files — any static host or local server works. The Together.ai
key is built in, so nudges and tool reasoning are on by default.

### AI connection (Together.ai)
- Click **⚙ AI** (top-right pill). Green dot = connected.
- You can override the **model** (any Together.ai chat/instruct model id) and the **API key**.
  Both are saved in your browser's `localStorage` only.
- If Together.ai is unreachable, the game still runs: every step falls back to a
  hand-written static hint, and the ending still recommends tools from the capability match.

> **Note:** the default API key is hardcoded in `ai.js` for convenience. Anyone who opens the
> page can read it. Before any public/GitHub deploy, move the key out and rotate it.

## Deployment

### GitHub Pages
```bash
git init
git add .
git commit -m "Groundwork v2"
git remote add origin https://github.com/YOUR_USER/groundwork.git
git push -u origin main
```
Then: Settings → Pages → Deploy from branch `main` → live at `https://YOUR_USER.github.io/groundwork/`

### Your Own Server
```bash
# Copy all files to your web root
cp -r groundwork2/* /var/www/groundwork/
# Serve via nginx, Apache, etc.
```

### Airgapped (no internet)
The game itself is fully static and runs with no connection. Only the AI nudges and the
optional one-line tool rationale call out to Together.ai — everything else, including the
static hints and the tool recommendations, works offline.
1. Bundle the fonts locally (they load from `fonts.googleapis.com` in `index.html`)
2. If Together.ai is not reachable, leave AI disconnected — the static hints take over

## For Your Organization

### Adapting the Data
Edit `data.js`:
- **COMPANY.name**, **COMPANY.blurb**, **COMPANY.role** — your org
- **FUNCTIONS** — change the 8 functions to match your structure (each has `group` + `icon`)
- **MAP_GROUPS** — the three terrain bands functions are grouped into
- **PROCESSES** — replace the deep-dive processes (keyed A, B, C, D …)
- **CAPS** — keep or customize the 15 AI capability types
- **DIMS** — keep the 4 task dimensions (they're universal)

### Customizing Icons
Edit `icons.js` to add your org's icon set. Modify the SVG paths for function icons, add new capabilities, etc.

### Customizing Nudges
Edit `ai.js` to change:
- **AI.nudge()** — the prompt that generates contextual hints
- **AI.suggestTools()** — how tools are matched to capabilities
- Tool descriptions in **TOOL_RECS.tools**

### Adding More Processes
In `data.js`, add to the `PROCESSES` array. Each process needs:
- `id`, `name`, `fnId` (which function owns it)
- `steps[]` — array of step objects with full scaffolding

Follow the existing format in `PROCESSES.A` (pre-meeting briefing). The expedition picker
offers every key in `PROCESSES` automatically, so adding `E:` makes a fifth expedition appear.

## Architecture

### Game Flow
```
hero → terrain-intro → terrain-map → terrain-reveal 
  → pick-expedition → step (profile, match, reality) 
  → canvas → debrief → [apply-setup → apply-steps → apply-walk → apply-canvas]
```

### State Machine
- `S.mode` — 'guided' or 'apply'
- `S.stage` — current screen
- `S.stepPhase` — within a step: 'brief' → 'profile' → 'profile-reveal' → 'match' → 'match-reveal'
- `S.stepAnswers` — user's profiling of each step
- `S.realityRatings` — feasibility/value placements
- `S.canvasGuardrails` — selected guardrails

### Scoring
- **Terrain** — process ratings: 0/1/4/7/10 pts
- **Profile** — exact match on dimensions: 2pts each (max 8/step)
- **Match** — capability fit: best=3pts, workable=1pt, + autonomy bonus
- **Reality** — distance from expert placement: up to 4pts
- **Canvas** — guardrail selections: up to 3pts

### AI Integration
- `AI.init()` — connects to Together.ai (background, non-blocking)
- `AI.loadSettings()` / `AI.saveSettings()` — persist model + key in `localStorage`
- `AI.nudge(step, notes, pain)` — generates contextual hints
- `AI.reflect(step, profile, expert)` — gives feedback on accuracy
- `AI.suggestTools()` — matches capabilities to the approved tools, adds a one-line rationale
- `maybeNudge()` (app.js) — shows the static hint, then upgrades it with an AI nudge if connected
- Nudges appear in `#nudgeSlot`; tool cards use `.toolcard`; connection shows in the `.aipill`

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Customizations We Can Help With

1. **More processes** — add a 5th, 6th process for your org
2. **Guided hints** — write org-specific nudges for each step
3. **Tool matching** — refine the algorithm that suggests tools
4. **UI reskinning** — colors, fonts, layout
5. **Offline bundle** — embed the fonts for a fully airgapped build
6. **Export reports** — PDF or email summaries of findings

## Troubleshooting

### AI pill dot stays grey (not connected)
- Open **⚙ AI** and check the model id is a valid Together.ai chat/instruct model
- Confirm the API key (the built-in one, or your override) is still valid
- The game still works disconnected — static hints and tool recommendations continue

### Fonts not loading
- Check browser console for 404s on fonts.googleapis.com
- For airgapped: download the fonts locally and update `index.html`

### Nudges feel slow
- The static hint is instant; the AI nudge replaces it when the model responds
- Pick a faster/smaller Together.ai model in ⚙ AI if responses lag

### Tool recommendations not showing
- Make sure capabilities were chosen on the match steps
- Check the console for errors in `TOOL_RECS.suggestForCapabilities()`

## License & Use

Groundwork is designed for your organization's internal use. Feel free to:
- ✅ Customize data and processes
- ✅ Deploy to your intranet
- ✅ Integrate with your LMS or portal
- ✅ Modify for accessibility needs

Do not:
- ❌ Distribute as a commercial product
- ❌ Modify the copyright notice without permission
- ❌ Use for external training without approval

---

**Built for Meridian Reserve Bank** | v2.0 | September 2026
