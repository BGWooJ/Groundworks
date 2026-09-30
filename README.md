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
- Sleek, modern UI with refined typography and hover states
- Function icons integrated into terrain map and process selection

🤖 **AI Integration:**
- Connect to any OpenAI-compatible local LLM (Ollama, etc.)
- Contextual nudges while analyzing steps
- Personalized hints when struggling
- Dynamic tool recommendations at the end based on identified capabilities

🛠 **Tool Recommendations:**
Suggests tools from your approved list:
- **LPP** (Airgapped suite: Claude, Llama, Mistral, Nova)
- **LPP Plus** (with agent functionality)
- **Copilot for Gov Community Cloud**
- **CodeHelper** (Claude Code in terminal/VS Code)
- **Copilot Studio** (low-code agent builder)

## Files

- `index.html` — Main entry point with modals
- `styles.css` — Enhanced CSS with transitions, icons, and animations
- `data.js` — Meridian Reserve Bank configuration (2,400 staff, 8 functions, 4 deep-dive processes)
- `icons.js` — SVG icon library (function icons, autonomy levels, UI elements)
- `app.js` — Game logic, state machine, view rendering
- `engine.js` — Scoring and suggestion engine (copied from v1, unchanged)
- `ai.js` — AI connection, nudge generation, tool matching

## Local Setup

### 1. Basic (no AI)
```bash
cd groundwork2
python -m http.server 8000
# Visit http://localhost:8000
```

### 2. With AI Nudges (Ollama)

**Install Ollama:**
```bash
# macOS: https://ollama.ai
# Linux: curl -fsSL https://ollama.ai/install.sh | sh
# Windows: https://ollama.ai/download/windows
```

**Start Ollama with CORS:**
```bash
# macOS/Linux:
OLLAMA_ORIGINS="*" ollama serve

# Or, first pull a small model:
ollama pull mistral  # or: llama2, neural-chat, orca-mini
OLLAMA_ORIGINS="*" ollama serve
```

**Start the game:**
```bash
python -m http.server 8000
# Visit http://localhost:8000
# Click ⚙ AI → connect (default: http://localhost:11434/v1)
```

Models tested:
- `mistral` (7B, fast, good)
- `neural-chat` (7B, conversational)
- `orca-mini` (3B, quick, airgapped-friendly)
- `llama2` (7B, Ollama default)
- `phi` (2.7B, very fast)

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
1. Fonts must be bundled locally (see `styles.css`, lines with `@import`)
2. Ollama or another LLM must be running locally
3. Remove CORS headers from Ollama if proxy blocks them

## For Your Organization

### Adapting the Data
Edit `data.js`:
- **COMPANY.name**, **COMPANY.staff**, **COMPANY.description** — your org
- **FUNCTIONS** — change the 8 functions to match your structure
- **PROCESSES** — replace the 4 deep-dive processes
- **CAPS** — keep or customize the 15 AI capability types
- **DIMS** — keep the 8 task dimensions (they're universal)

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

Follow the existing format in `PROCESSES[0]` (pre-meeting briefing).

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
- `AI.init()` — connects to Ollama (background, non-blocking)
- `AI.nudge(step, notes, pain)` — generates contextual hints
- `AI.reflect(step, profile, expert)` — gives feedback on accuracy
- `AI.suggestTools()` — matches capabilities to your approved tools
- Nudges appear in `.nudge` divs; tool cards in `.toolcard` divs

## Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Customizations We Can Help With

1. **More processes** — add 5th, 6th process for your org
2. **Guided hints** — write org-specific nudges for each step
3. **Tool matching** — refine the algorithm that suggests tools
4. **UI reskinning** — colors, fonts, layout
5. **Offline bundle** — embed fonts and Ollama model
6. **Export reports** — PDF or email summaries of findings

## Troubleshooting

### "AI: no connection"
- Is Ollama running? `ollama serve` (with `OLLAMA_ORIGINS="*"`)
- Is the URL correct? Default is `http://localhost:11434/v1`
- Is CORS enabled? Set `OLLAMA_ORIGINS="*"` before `ollama serve`

### Fonts not loading
- Check browser console for 404s on fonts.googleapis.com
- For airgapped: download fonts locally and update `styles.css`

### Slow rendering
- Clear browser cache
- Check if Ollama model is large (7B+ can be slow on old hardware)
- Use a smaller model: `orca-mini`, `phi`, or offline (no AI)

### Tool recommendations not showing
- Make sure capabilities were identified in the profile steps
- Check console for errors in `TOOL_RECS.suggestForCapabilities()`

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
