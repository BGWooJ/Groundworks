// v8 phase 6: how fast the game is ready on a slow phone, and how smooth its main transitions are.
// Needs Playwright and a running preview:  npm run build && npx vite preview --port 4173
//   then  node scripts/perf-check.cjs            (prints a table; fails if a budget is missed)
// Profile: "slow 4G" (150 ms round trip, 1.6 Mbit/s down) and a CPU four times slower than this machine.
// Web fonts are blocked so the numbers do not depend on Google's servers; the game falls back to system fonts.
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.env.GROUNDWORK_URL || 'http://localhost:4173/';
const RUNS = +(process.env.RUNS || 3);
const BUDGET = {paint:2500, ready:4500};   // ms on the slow profile: something on screen, then the first screen usable
const R = []; const ok = (n, c, x)=>R.push((c?'PASS ':'FAIL ')+n+(x!==undefined?'  '+x:''));
const wait = ms=>new Promise(r=>setTimeout(r, ms));
const median = a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];

async function slowPage(b, viewport){
  const ctx = await b.newContext({viewport});
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r=>r.abort());
  const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', {cacheDisabled:true});
  await cdp.send('Network.emulateNetworkConditions', {offline:false, latency:150, downloadThroughput:1.6e6/8, uploadThroughput:750e3/8});
  await cdp.send('Emulation.setCPUThrottlingRate', {rate:4});
  return {ctx, p, cdp};
}

/* One cold load: when something first appears, when the first screen is usable, and how long the main thread was blocked. */
async function coldLoad(b, seed){
  const {ctx, p} = await slowPage(b, {width:390, height:844});
  await p.addInitScript(s=>{ if(s && !sessionStorage.__seeded){ Object.entries(s).forEach(([k,v])=>localStorage.setItem(k, v)); sessionStorage.__seeded = 1; }
    // the moment the game's own first screen appears, timed inside the page
    new MutationObserver((l, o)=>{ if(document.querySelector('main#main h1')){ window.__ready = performance.now(); o.disconnect(); } }).observe(document, {childList:true, subtree:true});
    window.__long = 0; try{ new PerformanceObserver(l=>l.getEntries().forEach(e=>{ window.__long += e.duration; })).observe({type:'longtask', buffered:true}); }catch(e){} }, seed || null);
  let bytes = 0; p.on('response', async r=>{ try{ const h = await r.allHeaders(); bytes += +(h['content-length'] || 0); }catch(e){} });
  await p.goto(BASE, {waitUntil:'commit'});
  await p.waitForSelector('main#main h1', {timeout:30000});   // the game's own first screen, not the loading screen
  await wait(1500);
  const m = await p.evaluate(()=>{ const fcp = performance.getEntriesByName('first-contentful-paint')[0], ready = window.__ready;
    return {paint:fcp ? Math.round(fcp.startTime) : null, ready:Math.round(ready), long:Math.round(window.__long),
      js:performance.getEntriesByType('resource').filter(e=>/\.js$/.test(e.name) && e.startTime < ready).reduce((s,e)=>s + (e.encodedBodySize || 0), 0)}; });
  await ctx.close();
  return m;
}

/* Frames around a tap. Two things are measured apart, as browsers do:
   - response: the gap that holds the tap's own work (building the next screen), judged like Google's
     "interaction to next paint", where under 200 ms is good;
   - smoothness: every frame after that, while the change animates, where a gap over 50 ms is a dropped beat. */
const startFrames = p=>p.evaluate(()=>{ window.__f = []; const t0 = performance.now(); const tick = t=>{ window.__f.push(t); if(t - t0 < 1000) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
const readFrames = p=>p.evaluate(()=>{ const f = window.__f, g = f.slice(1).map((t,i)=>t - f[i]), r = g.indexOf(Math.max(...g.slice(0, 12))), rest = g.filter((x,i)=>i!==r);
  return {frames:f.length, response:Math.round(g[r]), worst:Math.round(Math.max(...rest)), over50:rest.filter(x=>x>50).length}; });
const smooth = g=>g.response<200 && g.worst<=67 && g.over50<=1;

(async()=>{
  const b = await chromium.launch();
  const runs = [];
  for(let i=0;i<RUNS;i++) runs.push(await coldLoad(b));
  const pick = k=>median(runs.map(r=>r[k]));
  console.log('cold load, slow 4G and 4x slower CPU, phone size (median of ' + RUNS + '):');
  console.log(`  first paint ${pick('paint')} ms, first screen usable ${pick('ready')} ms, main thread blocked ${pick('long')} ms, JavaScript before the first screen ${Math.round(pick('js')/1024)} KB`);
  ok(`first paint under ${BUDGET.paint} ms`, pick('paint')!==null && pick('paint') < BUDGET.paint, pick('paint') + ' ms');
  ok(`first screen usable under ${BUDGET.ready} ms`, pick('ready') < BUDGET.ready, pick('ready') + ' ms');

  /* A player faster than their connection: the world map's code is held back, so "Opening" shows,
     then the map arrives and the keyboard focus lands on its heading as on any other screen. */
  {
    const ctx = await b.newContext({viewport:{width:1280, height:800}}); const p = await ctx.newPage();
    let release; const held = new Promise(r=>{ release = r; });
    await ctx.route(/\/assets\/World-[^/]+\.js$/, async r=>{ await held; r.continue(); });
    await p.goto(BASE); await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('gw_journal_v4', JSON.stringify({marks:{}, walks:[], maps:{}, profile:{role:'steward', xp:10}})); });
    await p.reload(); await p.waitForSelector('main#main h1'); await wait(300);
    await p.click('.startcard >> nth=0'); await wait(400);
    const opening = await p.evaluate(()=>{ const o = document.querySelector('main#main .opening'); return o && o.getClientRects().length ? o.textContent : null; });
    release(); await p.waitForSelector('.wmap svg', {timeout:10000}); await wait(600);
    const g = await p.evaluate(()=>({h1:document.querySelector('main#main h1') && document.querySelector('main#main h1').textContent, focus:document.activeElement && document.activeElement.tagName}));
    ok('slow connection: a screen still loading says "Opening", then arrives with focus on its heading', opening==='Opening…' && g.focus==='H1', JSON.stringify({opening, ...g}));
    await ctx.close();
  }
  /* A screen that cannot be fetched says so and keeps the rest of the game; a reload brings it back with nothing lost. */
  {
    const ctx = await b.newContext({viewport:{width:1280, height:800}}); const p = await ctx.newPage();
    let fail = true;
    await ctx.route(/\/assets\/World-[^/]+\.js$/, r=>fail ? r.abort() : r.continue());
    await p.goto(BASE); await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('gw_journal_v4', JSON.stringify({marks:{}, walks:[], maps:{}, profile:{role:'steward', xp:10}})); });
    await p.reload(); await p.waitForSelector('main#main h1'); await wait(1500);
    await p.click('.startcard >> nth=0'); await p.waitForSelector('.opening.failed', {timeout:10000}).catch(()=>{});
    const g1 = await p.evaluate(()=>({h1:(document.querySelector('main#main h1') || {}).textContent, topbar:!!document.querySelector('.topbar')}));
    fail = false; await p.click('text=Reload the page'); await p.waitForSelector('main#main h1'); await wait(600);
    const kept = await p.evaluate(()=>JSON.parse(localStorage.getItem('gw_journal_v4') || '{}').profile.role);
    await p.click('.startcard >> nth=0'); await p.waitForSelector('.wmap svg', {timeout:10000}).catch(()=>{});
    const map = !!(await p.$('.wmap svg'));
    ok('a screen that fails to load says so, keeps the rest of the game, and a reload brings it back', g1.h1==='This screen did not load' && g1.topbar && kept==='steward' && map, JSON.stringify({...g1, kept, map}));
    await ctx.close();
  }

  /* Smoothness on a slowed phone: entering a division, opening a work area, and the quick read's comparison. */
  const ctx = await b.newContext({viewport:{width:390, height:844}}); const p = await ctx.newPage();
  await p.goto(BASE); await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('gw_journal_v4', JSON.stringify({marks:{}, walks:[], maps:{}, profile:{role:'steward', xp:10}})); });
  await p.reload(); await wait(800);
  const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', {rate:4});
  await p.click('.startcard >> nth=0'); await p.waitForSelector('.wmap svg'); await wait(1500);
  await startFrames(p); await p.click('.lm[aria-label^="Finance"]'); await wait(1100);
  let g = await readFrames(p); ok('slowed phone: entering a division responds within 200 ms and then runs smoothly', smooth(g), JSON.stringify(g));
  await startFrames(p); await p.click('.zone:has-text("Payables")'); await wait(1100);
  g = await readFrames(p); ok('slowed phone: opening a work area responds within 200 ms and then runs smoothly', smooth(g), JSON.stringify(g));
  /* The quick read: make every call, then time the comparison as its rows arrive. */
  await p.click('.site >> nth=0 >> text=Walk this process'); await p.waitForSelector('.v-map'); await wait(500);
  await p.click('text=Start the quick read'); await p.waitForSelector('.qstep'); await wait(500);
  const n = (await p.$$('.qstep')).length;
  for(let i=0;i<n;i++){
    const row = (await p.$$('.qstep'))[i];
    await (await row.$$('.qcall >> nth=0 >> .nchip'))[0].click(); await wait(60);
    await (await row.$$('.qcall >> nth=1 >> .nchip'))[0].click(); await wait(60);
    const auto = await row.$$('.qcall >> nth=2 >> .nchip'); if(auto.length){ await auto[1].click(); await wait(60); }
  }
  await wait(600);
  await startFrames(p); await p.click('[data-focus="compare"]'); await wait(1100);
  g = await readFrames(p); ok('slowed phone: the quick read comparison responds within 200 ms and then runs smoothly', smooth(g), JSON.stringify(g));
  await ctx.close();

  /* Reduced motion: once a screen settles, nothing on it keeps moving (pulses, glows and rings included). */
  {
    const ctx = await b.newContext({viewport:{width:1280, height:800}, reducedMotion:'reduce'}); const p = await ctx.newPage();
    await p.goto(BASE); await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('gw_journal_v4', JSON.stringify({marks:{}, walks:[], maps:{}, profile:{role:'steward', xp:10}})); });
    await p.reload(); await p.waitForSelector('main#main h1'); await wait(3500);
    const moving = ()=>p.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').map(a=>(a.animationName || a.constructor.name) + ' on ' + (a.effect && a.effect.target ? (a.effect.target.className.baseVal ?? a.effect.target.className) : '?')));
    const seen = {home:await moving()};
    await p.click('.startcard >> nth=0'); await p.waitForSelector('.wmap svg'); await wait(1500); seen.world = await moving();
    await p.click('.lm[aria-label^="Finance"]'); await wait(800); await p.click('.zone:has-text("Payables")'); await wait(800);
    await p.click('.site >> nth=0 >> text=Walk this process'); await p.waitForSelector('.v-map'); await wait(1200); seen.process = await moving();
    ok('reduced motion: nothing keeps moving on Home, the map or a process', !seen.home.length && !seen.world.length && !seen.process.length, JSON.stringify(seen));
    await ctx.close();
  }

  console.log(R.join('\n'));
  await b.close();
  process.exit(R.some(x=>x.startsWith('FAIL')) ? 1 : 0);
})();
