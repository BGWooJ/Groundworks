/* ================= AI INTEGRATION ================= */
/* Connects to Together.ai (OpenAI-compatible) for nudges, hints and tool
   reasoning. Everything here fails soft: if the connection is down, the game
   still runs and the hand-written static hints take over. */

/* Private escape, so this file does not depend on app.js internals. */
function escA(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

const AI = {
  baseURL: 'https://api.together.xyz/v1',
  apiKey: 'key_CfaGt7CV9S1jKoWqtbvm1', // Together.ai key
  model: 'mistralai/Mistral-7B-Instruct-v0.1',
  enabled: false,
  available: [],

  headers(){
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + this.apiKey,
    };
  },

  // Persist runtime overrides (model/key) so the experience stays "yours" across reloads.
  loadSettings(){
    try{
      const m = localStorage.getItem('gw_ai_model');
      const k = localStorage.getItem('gw_ai_key');
      if(m) this.model = m;
      if(k) this.apiKey = k;
    }catch(e){ /* localStorage unavailable: fall back to defaults */ }
  },
  saveSettings(){
    try{
      localStorage.setItem('gw_ai_model', this.model||'');
      localStorage.setItem('gw_ai_key', this.apiKey||'');
    }catch(e){}
  },

  async init(){
    try {
      const res = await fetch(`${this.baseURL}/models`, { method:'GET', headers:this.headers() });
      if(!res.ok){ this.enabled=false; console.log('AI: no connection to Together.ai (status '+res.status+'). Check the key in ⚙ AI.'); return false; }
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.data || []);
      this.available = list.map(m => m.id || m.name).filter(Boolean);
      // Keep the configured model if it's valid; otherwise prefer a chat/instruct model.
      if(this.available.length && !this.available.includes(this.model)){
        const preferred = ['instruct','chat','turbo','mistral','llama'];
        this.model = this.available.find(m => preferred.some(p => m.toLowerCase().includes(p))) || this.model || this.available[0];
      }
      this.enabled = true;
      console.log('AI: connected to Together.ai, model:', this.model);
      return true;
    } catch(e){
      this.enabled = false;
      console.log('AI: Together.ai not reachable, nudges disabled (the game still works).');
    }
    return false;
  },

  async chat(messages, temperature=0.7){
    if(!this.enabled) return null;
    try {
      const res = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature,
          max_tokens: 200,
          stream: false,
        })
      });
      if(!res.ok) return null;
      const data = await res.json();
      return data.choices?.[0]?.message?.content || null;
    } catch(e){
      return null;
    }
  },

  // Nudge: contextual hint for a step
  async nudge(stepName, stepNotes, stepPain, context=''){
    const prompt = `You are an expert helping someone analyze business processes for AI opportunities. Be brief, encouraging, and specific. One or two sentences max.

They are looking at this step: "${stepName}"
What happens: ${stepNotes}
The pain they named: ${stepPain}
${context ? `Context: ${context}` : ''}

Give them a single nudge—a question or observation that will help them profile this step well. Be practical and short.`;

    return await this.chat([{role:'user', content:prompt}], 0.5);
  },

  // Reflection: comment on their profile of a step when it diverges from the expert
  async reflect(stepName, p, expert){
    const dims = Object.keys(p).filter(k => ['shape','input','rep','stakes'].includes(k));
    const matches = dims.filter(k => p[k]===expert[k]).length;
    const accuracy = dims.length ? Math.round(100*matches/dims.length) : 100;

    if(accuracy < 50){
      const prompt = `Someone analyzing a business process step named "${stepName}" made choices that differ from an expert's view on several dimensions.

They said: shape=${p.shape}, inputs=${p.input}, volume=${p.rep}, stakes=${p.stakes}
Expert said: shape=${expert.shape}, inputs=${expert.input}, volume=${expert.rep}, stakes=${expert.stakes}

They got ${accuracy}% right. Give them a gentle nudge to look again at where they disagreed. One sentence, encouraging not critical.`;
      return await this.chat([{role:'user', content:prompt}], 0.4);
    }
    return null;
  },

  // Tool recommendation: match capabilities to tools, optionally adding AI reasoning
  async suggestTools(capabilities, autonomyLevels, values){
    const tools = TOOL_RECS.suggestForCapabilities(capabilities, autonomyLevels, values);
    if(!this.enabled || tools.length === 0) return tools;

    if(tools.length > 1){
      const toolList = tools.map(t => `${t.name} (best for: ${t.bestFor})`).join('; ');
      const prompt = `You are helping someone in a financial institution choose approved tools to act on AI use cases they identified.

Capabilities they need: ${capabilities.join(', ') || 'general assistance'}
Autonomy they want: ${autonomyLevels.join(', ') || 'review'}

Candidate tools (already filtered to approved options): ${toolList}

Which is the best starting point, and why, in one short sentence? Be practical.`;
      const reasoning = await this.chat([{role:'user', content:prompt}], 0.6);
      if(reasoning && tools[0]) tools[0].reasoning = reasoning.trim();
    }
    return tools;
  },
};

/* ================= TOOL RECOMMENDATIONS ================= */
/* The organization's approved tool inventory. `useCases` are capability ids
   from CAPS (data.js) so matching lines up with what the game records.
   `bestFor` is the human-readable line shown on the card. */
const TOOL_RECS = {
  tools: [
    { id:'lpp', name:'LPP — Airgapped LLM Suite',
      why:'Web-based, airgapped access to Claude, Grok, Nemotron, Llama, Nova Pro and GPT OSS in one approved package. The foundation for most reading, writing and judgment use cases.',
      bestFor:'Reading documents, summarizing, Q&A over your own content, classifying, drafting',
      useCases:['extract','summarize','retrieve','classify','anomaly','recommend','draft','converse','vision','speech'],
      agentic:false, engineering:false },

    { id:'lpp-plus', name:'LPP Plus — with Agents',
      why:'LPP plus agent functionality: it can take multi-step actions across systems — look things up, fill forms, chase follow-ups — not just answer.',
      bestFor:'Multi-step workflows that coordinate across people and systems',
      useCases:['agent','converse','coordinate','recommend','draft'],
      agentic:true, engineering:false },

    { id:'copilot-gov', name:'Copilot for Government Community Cloud',
      why:'Broad assistant that lives inside your existing Microsoft environment and compliance boundary. Strong when the work already happens in Office and Teams.',
      bestFor:'Everyday drafting, summarizing and search inside the Microsoft environment',
      useCases:['extract','summarize','retrieve','draft','converse','classify','agent'],
      agentic:true, engineering:false },

    { id:'codehelper', name:'CodeHelper (Claude Code — Terminal / VS Code)',
      why:'Claude Code running on the user’s own PC. For technical teams that want to build and control the solution — scripts, rules, data pipelines, custom extraction.',
      bestFor:'Engineering the fix: rules, integrations, pipelines and custom extraction',
      useCases:['rules','fix','extract','optimize','predict','anomaly'],
      agentic:false, engineering:true },

    { id:'copilot-studio', name:'Copilot Studio',
      why:'Low-code agent builder for solutions that need MCP/API enhancement — connect systems and orchestrate workflows without full custom development.',
      bestFor:'Agents and workflows that need API/MCP integration, low-code',
      useCases:['agent','converse','classify','rules','coordinate'],
      agentic:true, engineering:false },
  ],

  suggestForCapabilities(caps, autos, vals){
    caps = caps || []; autos = autos || [];
    const hasAgent = caps.includes('agent') || caps.includes('coordinate');
    const wantsAuto = autos.includes('auto');
    const engCount = caps.filter(c => c==='rules' || c==='fix').length;
    const engineeringHeavy = caps.length > 0 && engCount >= Math.ceil(caps.length/2);

    const scores = {};
    this.tools.forEach(t => {
      let score = 0;
      caps.forEach(c => { if(t.useCases.includes(c)) score += 2; });
      if((hasAgent || wantsAuto) && t.agentic) score += 3;
      if(engineeringHeavy && t.engineering) score += 3;
      scores[t.id] = score;
    });

    let ranked = this.tools
      .map(t => ({ t, s: scores[t.id] || 0 }))
      .filter(x => x.s > 0)
      .sort((a,b) => b.s - a.s);

    // Always offer LPP as the foundation if nothing else matched.
    if(ranked.length === 0){
      const lpp = this.tools.find(t => t.id === 'lpp');
      ranked = [{ t: lpp, s: 1 }];
    }

    const out = ranked.slice(0, 3).map(x => ({ ...x.t, fit: 'recommended' }));
    if(engineeringHeavy){
      out.note = 'Much of what you identified is rules or process fixes — engineering, not AI. CodeHelper or your integration team may be the real answer, with an LLM only where the work is genuinely variable.';
    }
    return out;
  },

  formatAsCard(tool){
    const iconName = {lpp:'spark', 'lpp-plus':'act', 'copilot-gov':'compass', codehelper:'route', 'copilot-studio':'gear'}[tool.id] || 'spark';
    return `<div class="toolcard">
      <div class="icon">${icon(iconName, 'lg')}</div>
      <div class="text">
        <b>${escA(tool.name)}</b>
        <p>${escA(tool.why)}</p>
        <div class="fit">Best for: ${escA(tool.bestFor)}</div>
        ${tool.reasoning ? `<div class="fit" style="font-style:italic;margin-top:6px;">“${escA(tool.reasoning)}”</div>` : ''}
      </div>
    </div>`;
  }
};

// Helper to switch model/base from the UI (used by the ⚙ AI settings panel)
async function setAIModel(baseURL, model){
  if(baseURL) AI.baseURL = baseURL;
  AI.model = model;
  const ok = await AI.init();
  if(ok) console.log('AI switched to:', AI.model);
  return ok;
}
