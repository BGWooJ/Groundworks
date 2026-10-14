// v8 phase 6: accessibility check. Walks every main screen at desktop and phone size and runs axe-core
// (WCAG 2.2 A and AA rules, plus axe's best practices) on each, then checks a few things axe cannot:
// keyboard focus inside dialogs, focus coming back when they close, and the size of tap targets.
// Needs Playwright and a running preview:  npm run build && npx vite preview --port 4173
//   then  node scripts/a11y-check.cjs        (VERBOSE=1 lists every node that fails)
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const AXE = require('fs').readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const BASE = process.env.GROUNDWORK_URL || 'http://localhost:4173/';
const R = []; const ok = (n, c, x)=>R.push((c?'PASS ':'FAIL ')+n+(x!==undefined?'  '+x:''));
const wait = ms=>new Promise(r=>setTimeout(r, ms));
const STEWARD = JSON.stringify({marks:{}, walks:[], maps:{}, profile:{role:'steward', xp:10}});

/* Run axe on the page as it is now. Returns one line per rule broken, with how many elements break it. */
async function axe(p){
  if(!(await p.evaluate(()=>!!window.axe))) await p.addScriptTag({content:AXE});
  const res = await p.evaluate(()=>window.axe.run(document, {runOnly:{type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}, resultTypes:['violations']}));
  return res.violations.map(v=>({id:v.id, impact:v.impact, n:v.nodes.length, help:v.help, nodes:v.nodes.slice(0, 4).map(x=>x.target.join(' ') + (x.failureSummary ? '  ' + x.failureSummary.split('\n').slice(1, 2).join(' ').trim() : ''))}));
}
const seen = {};
async function audit(p, name){
  await wait(450);
  // let toasts and dialogs finish fading in, so colours are measured at rest
  await p.waitForFunction(()=>[...document.querySelectorAll('.toast, .modal, .dispatch, .spot')].every(el=>getComputedStyle(el).opacity==='1'), null, {timeout:3000}).catch(()=>{});
  const v = await axe(p);
  v.forEach(x=>{ (seen[x.id] = seen[x.id] || {impact:x.impact, help:x.help, screens:[]}).screens.push(name + ' (' + x.n + ')');
    if(process.env.VERBOSE) x.nodes.forEach(n=>console.log(`  ${name}: ${x.id}: ${n}`)); });
  ok(`axe: ${name}`, !v.length, v.map(x=>`${x.id} x${x.n}`).join(', '));
}

/* Tap targets: WCAG 2.2 asks for at least 24 by 24 CSS pixels, unless the target is inline in text or has room around it. */
const smallTargets = p=>p.evaluate(()=>[...document.querySelectorAll('button, a[href], input, select, [role="button"], [role="radio"], [tabindex="0"]')].filter(el=>{
  const r = el.getBoundingClientRect(); if(!r.width || !r.height) return false;
  if(el.closest('p, li > span, .prose') && getComputedStyle(el).display==='inline') return false;    // a link inside a sentence
  if(r.width>=24 && r.height>=24) return false;
  // spacing exception: a 24 px circle centred on it touches no other target
  const cx = r.x + r.width/2, cy = r.y + r.height/2;
  return [...document.querySelectorAll('button, a[href], input, select, [role="button"], [role="radio"]')].some(o=>{ if(o===el || o.contains(el) || el.contains(o)) return false;
    const q = o.getBoundingClientRect(); if(!q.width) return false;
    const dx = Math.max(q.x - cx, 0, cx - (q.x + q.width)), dy = Math.max(q.y - cy, 0, cy - (q.y + q.height)); return Math.hypot(dx, dy) < 12; });
}).map(el=>(el.getAttribute('aria-label') || el.textContent || el.className).trim().slice(0, 40) + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height)));

/* Tab through a dialog: focus must stay inside it. */
async function trapped(p, sel, presses=14){
  const out = [];
  for(let i=0;i<presses;i++){ await p.keyboard.press('Tab'); out.push(await p.evaluate(s=>{ const d = document.querySelector(s); return !!(d && d.contains(document.activeElement)); }, sel)); }
  return out.every(Boolean);
}

/* Make every call on the quick read. */
async function quickCalls(p){
  const n = (await p.$$('.qstep')).length;
  for(let i=0;i<n;i++){
    const row = (await p.$$('.qstep'))[i];
    await (await row.$$('.qcall >> nth=0 >> .nchip'))[0].click(); await wait(60);
    await (await row.$$('.qcall >> nth=1 >> .nchip'))[0].click(); await wait(60);
    const auto = await row.$$('.qcall >> nth=2 >> .nchip'); if(auto.length){ await auto[1].click(); await wait(60); }
  }
}

async function tour(b, size, label){
  const ctx = await b.newContext({viewport:size}); const p = await ctx.newPage();
  const errors = []; p.on('pageerror', e=>errors.push(e.message));
  const at = name=>label + ' ' + name;
  await p.goto(BASE); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForSelector('main#main h1');
  // a new player: the introduction, then the lenses
  await audit(p, at('introduction'));
  await p.click('text=Next'); await audit(p, at('introduction, card 2'));
  await p.click('text=Next'); await audit(p, at('introduction, card 3'));
  await p.click('.iactions >> text=Explore Meridian'); await p.waitForSelector('.rolecard'); await audit(p, at('lenses'));
  await p.click('.rolecard >> nth=1'); await p.waitForSelector('.wmap svg'); await wait(900);
  await audit(p, at('world map'));
  await p.click('.lm[aria-label^="Finance"]'); await wait(900); await audit(p, at('division'));
  await p.click('.zone:has-text("Payables")'); await wait(900); await audit(p, at('work area'));
  await p.click('.site >> nth=0 >> .pin'); await wait(300); await audit(p, at('work area with a route'));
  await p.click('.viewtoggle >> text=List'); await wait(700); await audit(p, at('list view'));
  await p.click('.viewtoggle >> text=Map'); await wait(900);   // back to the work area it was showing
  // the process, the quick read and its comparison
  await p.click('.site >> nth=0 >> text=Walk this process'); await p.waitForSelector('.v-map'); await audit(p, at('process'));
  await p.click('text=Start the quick read'); await p.waitForSelector('.qstep'); await audit(p, at('quick read'));
  await quickCalls(p); await audit(p, at('quick read, calls made'));
  await p.click('[data-focus="compare"]'); await wait(700); await audit(p, at('quick read, compared'));
  const more = await p.$('.qres button[aria-expanded]'); if(more){ await more.click(); await wait(300); await audit(p, at('quick read, details open')); }
  await p.click('.qfoot >> text=Continue to your plan'); await wait(800);
  if(await p.$('.modal')){
    await audit(p, at('complication'));
    if(label==='desktop') ok('keyboard: Tab stays inside the complication', await trapped(p, '.modal'));
    await p.click('.modal .choice >> nth=0'); await wait(400); await audit(p, at('complication, answered'));
    await p.click('.modal >> text=Continue'); await wait(800);
  }
  for(let g=0; g<6 && !(await p.$('.v-finished')); g++){ if(await p.$('.modal [data-autofocus]')) await p.click('.modal [data-autofocus]'); await wait(400); }
  await audit(p, at('finished map'));
  // the save dialog, with focus going back to where it was opened
  await p.focus('.tbtn[data-tb="save"]'); await p.keyboard.press('Enter'); await p.waitForSelector('.linkrow .in'); await audit(p, at('save dialog'));
  if(label==='desktop'){
    ok('keyboard: Tab stays inside the save dialog', await trapped(p, '.modal'));
    await p.keyboard.press('Escape'); await p.waitForFunction(()=>!document.querySelector('.modal'), null, {timeout:3000}).catch(()=>{});
    ok('keyboard: Escape closes the save dialog and focus returns to its button', await p.evaluate(()=>!document.querySelector('.modal') && document.activeElement.dataset.tb==='save'),
      await p.evaluate(()=>document.activeElement.outerHTML.slice(0, 80)));
  } else { await p.keyboard.press('Escape'); await wait(400); }
  // the full read
  await p.click('.brand'); await wait(500); await audit(p, at('home'));
  await p.click('.startcard >> nth=0'); await p.waitForSelector('.wmap svg'); await wait(700);
  await p.click('.lm[aria-label^="Economists"]'); await wait(900); await p.click('.zone:has-text("Policy meeting briefings")'); await wait(900);
  await p.click('.site:has-text("Pre-meeting briefing cycle") >> text=Walk this process'); await p.waitForSelector('.v-map');
  await p.click('.readtoggle >> text=Full read'); await wait(300); await audit(p, at('process, full read'));
  await p.click('button.mcard.cur'); await p.waitForSelector('.question .token'); await audit(p, at('step'));
  // the other screens
  await p.click('.tbtn[data-tb="maps"]'); await wait(500); await audit(p, at('my maps'));
  await p.click('.tbtn[data-tb="library"]'); await wait(500); await audit(p, at('case library'));
  await p.click('.rankpill'); await wait(500); await audit(p, at('character'));
  await p.click('.brand'); await wait(500);
  const own = await p.$('.startcard:has-text("Map your own")'); if(own){ await own.click(); await wait(600); await audit(p, at('your own map, setup')); }
  if(label==='phone'){ const t = await smallTargets(p); ok('phone: tap targets are at least 24 px or have room around them', !t.length, t.join('; ')); }
  ok(`${label}: no page errors`, !errors.length, errors.join(' | '));
  await ctx.close();
}

(async()=>{
  const b = await chromium.launch();
  await tour(b, {width:1280, height:800}, 'desktop');
  await tour(b, {width:390, height:844}, 'phone');
  console.log(R.join('\n'));
  const ids = Object.keys(seen);
  if(ids.length){ console.log('\nrules broken:'); ids.forEach(id=>console.log(`  ${id} [${seen[id].impact}] ${seen[id].help}: ${seen[id].screens.join(', ')}`)); }
  await b.close();
  process.exit(R.some(x=>x.startsWith('FAIL')) ? 1 : 0);
})();
