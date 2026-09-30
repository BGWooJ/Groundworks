/* ================= AI INTEGRATION ================= */
/* Connects to Ollama (or other OpenAI-compatible LLM) for nudges, hints, and tool suggestions */

const AI = {
const AI = {
  baseURL: 'https://api.together.xyz/v1',
  apiKey: 'key_CfaGt7CV9S1jKoWqtbvm1', // ← Paste your key here
  model: 'mistralai/Mistral-7B-Instruct-v0.1',
  enabled: false,
  available: [],
  
  async init(){
    // Try to connect and list available models
    try {
      const res = await fetch(`${this.baseURL}/models`, { method:'GET' });
      if(!res.ok) { console.log('AI: no connection at', this.baseURL); return false; }
      const data = await res.json();
      this.available = (data.data || []).map(m => m.id);
      if(this.available.length){
        // Prefer smaller, faster models for real-time nudges
        const preferred = ['mistral', 'neural-chat', 'orca-mini', 'llama2', 'phi'];
        this.model = this.available.find(m => preferred.some(p => m.includes(p))) || this.available[0];
        this.enabled = true;
        console.log('AI: connected, model:', this.model);
        return true;
      }
    } catch(e){ 
      console.log('AI: not available, nudges disabled. To enable, start Ollama: OLLAMA_ORIGINS="*" ollama serve'); 
    }
    return false;
  },
  
  async chat(messages, temperature=0.7){
    if(!this.enabled) return null;
    try {
      const res = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Reflection: ask the AI to comment on their profile of a step
  async reflect(stepName, p, expert){
    const dims = Object.keys(p).filter(k => ['shape','input','rep','stakes'].includes(k));
    const matches = dims.filter(k => p[k]===expert[k]).length;
    const accuracy = Math.round(100*matches/dims.length);
    
    if(accuracy < 50){
      const prompt = `Someone analyzing a business process step named "${stepName}" made choices that differ from an expert's view on several dimensions. 

They said: shape=${p.shape}, inputs=${p.input}, volume=${p.rep}, stakes=${p.stakes}
Expert said: shape=${expert.shape}, inputs=${expert.input}, volume=${expert.rep}, stakes=${expert.stakes}

They got ${accuracy}% right. Give them a gentle nudge to look again at where they disagreed. One sentence, encouraging not critical.`;
      return await this.chat([{role:'user', content:prompt}], 0.4);
    }
    return null;
  },

  // Tool recommendation: match capabilities to tools
  async suggestTools(capabilities, autonomyLevels, values){
    const tools = TOOL_RECS.suggestForCapabilities(capabilities, autonomyLevels, values);
    if(!this.enabled || tools.length === 0) return tools;
    
    // Enhance with AI reasoning if we have multiple options
    if(tools.length > 1){
      const toolList = tools.map(t => `${t.name} (${t.fit})`).join(', ');
      const prompt = `You are helping someone choose tools to solve real business problems they identified using AI.

They need these capabilities: ${capabilities.join(', ')}
Autonomy they want: ${autonomyLevels.join(', ')}
Value is: ${values.join(', ')}

Suggested tools: ${toolList}

Which is the best starting point, and why in one sentence? Be practical.`;
      const reasoning = await this.chat([{role:'user', content:prompt}], 0.6);
      if(reasoning && tools[0]) tools[0].reasoning = reasoning;
    }
    return tools;
  },
};

/* ================= TOOL RECOMMENDATIONS ================= */
const TOOL_RECS = {
  tools: [
    { id:'lpp', name:'LPP (Airgapped LLM Suite)', fit:['read','judge','draft'], why:'Claude, Llama, Mistral, Nova in one secure package. Best for most foundations.', useCases:['extraction','summarization','retrieval','classification','drafting'], locked:false },
    { id:'lpp-plus', name:'LPP Plus (with Agents)', fit:['act'], why:'Multi-step workflows across systems. When tools need to coordinate.', useCases:['agent','coordinate','optimize'], locked:false },
    { id:'copilot-gov', name:'Copilot for Gov Community Cloud', fit:['read','judge','draft','act'], why:'Integration with your existing Microsoft environment and compliance framework.', useCases:['all'], locked:false },
    { id:'codehelper', name:'CodeHelper (Claude Code)', fit:['read','judge','draft'], why:'Terminal or VS Code. For technical teams that want control.', useCases:['extraction','drafting','custom-rules'], locked:false },
    { id:'copilot-studio', name:'Copilot Studio', fit:['act','judge'], why:'Low-code agent builder. When you need complex workflows without custom dev.', useCases:['agent','workflow','api-integration'], locked:false },
    { id:'ollama', name:'Ollama (local open models)', fit:['read','judge','draft'], why:'Maximum privacy and no cloud dependency. Runs on your hardware.', useCases:['extraction','summarization','classification'], locked:false },
  ],

  suggestForCapabilities(caps, autos, vals){
    // Simple matching for MVP; can be enhanced with ML later
    const scores = {};
    this.tools.forEach(t => {
      let score = 0;
      if(caps.some(c => t.useCases.includes(c))) score += 3;
      if(caps.some(c => t.useCases.includes(c.split('_')[0]))) score += 1;
      if(autos.includes('auto') && !t.fit.includes('act')) score -= 1;
      if(autos.includes('assist') && t.fit.includes('act')) score += 1;
      scores[t.id] = score;
    });
    
    return this.tools
      .filter(t => scores[t.id] > 0)
      .sort((a,b) => (scores[b.id]||0) - (scores[a.id]||0))
      .map(t => ({...t, fit: 'recommended'}))
      .slice(0,3);
  },

  formatAsCard(tool){
    const icon = {lpp:'plug', 'lpp-plus':'spark', 'copilot-gov':'compass', codehelper:'route', 'copilot-studio':'gear', ollama:'send'}[tool.id] || 'spark';
    return `<div class="toolcard">
      <div class="icon">${icon(icon, 'lg')}</div>
      <div class="text">
        <b>${esc(tool.name)}</b>
        <p>${esc(tool.why)}</p>
        <div class="fit">Best for: ${esc(tool.useCases.join(', '))}</div>
        ${tool.reasoning ? `<div class="fit" style="font-style:italic;margin-top:6px;">"${esc(tool.reasoning)}"</div>` : ''}
      </div>
    </div>`;
  }
};

// Helper to enable/disable AI from UI
async function setAIModel(baseURL, model){
  AI.baseURL = baseURL;
  AI.model = model;
  const ok = await AI.init();
  if(ok) console.log('AI switched to:', model);
  return ok;
}
