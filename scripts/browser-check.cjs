// Browser check for the v7 fixes. Needs Playwright (npm i -g playwright) and a running preview:
//   npm run build && npx vite preview --port 4173   then   node scripts/browser-check.cjs
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.env.GROUNDWORK_URL || 'http://localhost:4173/';
const fs = require('fs'); const OUT = require('os').tmpdir() + '/groundwork-check'; fs.mkdirSync(OUT, {recursive:true});
const R = []; const ok = (n, c, x)=>R.push((c?'PASS ':'FAIL ')+n+(x!==undefined?'  '+x:''));
const wait = ms=>new Promise(r=>setTimeout(r, ms));
async function answerAll(p, pick){ for(let i=0;i<14;i++){ const ts = await p.$$('.question .token'); if(!ts.length) break; await (pick ? pick(ts, p) : ts[0]).click(); await wait(480); } }
async function walkStep(p){ await p.waitForSelector('.question .token'); await answerAll(p); await p.click('[data-focus="reveal"]'); await wait(2900); }
(async()=>{
  const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({viewport:{width:1360,height:800}, acceptDownloads:true}); const p = await ctx.newPage();
  p.on('pageerror', e=>errors.push(e.message)); p.on('console', m=>{ if(m.type()==='error') errors.push(m.text()); });
  await p.goto(BASE); await p.evaluate(()=>localStorage.clear()); await p.reload(); await wait(500);

  /* ---------- 1. Shortlist choices and next step, from a cold start ---------- */
  await p.click('text=Walk a Meridian process'); await p.click('.rolecard >> nth=2'); await p.waitForSelector('.station'); await wait(900);
  await p.click('.station >> text=Economists'); await wait(900);
  let g = await p.evaluate(()=>{ const pk=[...document.querySelectorAll('.pick')].map(x=>x.getBoundingClientRect()); return {vh:innerHeight, first:Math.round(pk[0].top), last:Math.round(pk[pk.length-1].bottom), n:pk.length}; });
  ok('shortlist: all Economists choices are on screen after one click (desktop)', g.first>60 && g.last<g.vh, JSON.stringify(g));
  await p.screenshot({path:OUT+'/1-economists.png'});
  await p.click('.pick:has-text("Pre-meeting briefing cycle")'); await wait(900);
  g = await p.evaluate(()=>{ const n=document.querySelector('.picknext.ready'), b=n&&n.querySelector('.btn').getBoundingClientRect(); return {state:document.querySelector('.pick.on .pick-state').textContent, next:!!n, nextVisible: b ? b.top>0 && b.bottom<innerHeight-90 : false, nb: b && Math.round(b.bottom), sticky:document.querySelector('.actions.sticky .btn').textContent}; });
  ok('shortlist: a chosen card says so', g.state==='Shortlisted', g.state);
  ok('shortlist: the next step appears right under the choices, on screen and clear of the footer', g.next && g.nextVisible, JSON.stringify(g));
  ok('shortlist: the bottom bar names the next step', g.sticky==='Next: compare with the full survey', g.sticky);
  await p.screenshot({path:OUT+'/2-shortlisted.png'});

  /* ---------- 2. A walk in progress can be picked up again ---------- */
  await p.click('.picknext .btn'); await p.click('text=Choose the process to walk'); await p.click('.routecard'); await p.waitForSelector('button.mcard.cur');
  await p.click('button.mcard.cur'); await walkStep(p);
  await p.click('.brand'); await wait(600);
  g = await p.evaluate(()=>{ const r=document.querySelector('.resume-item'); const b=r&&r.getBoundingClientRect(); return {text:r&&r.textContent, top:b&&Math.round(b.top), vh:innerHeight}; });
  ok('resume: Home shows the walk in progress, above the fold', g.text && g.text.includes('Pre-meeting briefing cycle') && g.top<g.vh, JSON.stringify(g));
  await p.screenshot({path:OUT+'/3-home-resume.png'});
  await p.reload(); await wait(600);
  await p.click('.resume-item'); await wait(800);
  g = await p.evaluate(()=>({h1:document.querySelector('h1').textContent, back:!!document.querySelector('.callout.back'), read:document.querySelectorAll('.mcard.done').length}));
  ok('resume: after a reload, one click returns to the walk with its answers', g.read===1 && g.back, JSON.stringify(g));

  /* finish the walk, watch the achievements */
  for(let k=0;k<40;k++){
    if(await p.$('.v-finished')) break;
    if(await p.$('.modal .choice')){ await p.click('.modal .choice >> nth=0'); await wait(500); await p.click('.modal >> text=Continue'); await wait(800); continue; }
    if(await p.$('.modal [data-autofocus]')){ await p.click('.modal [data-autofocus]'); await wait(400); continue; }
    if(await p.$('.v-map')){ await p.click('button.mcard.cur'); await wait(500); continue; }
    if(await p.$('.read .actions .btn.primary')){ await p.click('.read .actions .btn.primary'); await wait(900); continue; }
    await walkStep(p);
  }
  await p.waitForSelector('.v-finished'); await wait(1200);
  const spot1 = await p.evaluate(()=>{ const s=document.querySelector('.spot'); return s ? {name:s.querySelector('.spot-name').textContent, more:(s.querySelector('.spot-more')||{}).textContent||''} : null; });
  ok('achievements: a spotlight appears at the end of a walk, without a long backlog', !!spot1 && !/[3-9] more/.test(spot1.more), JSON.stringify(spot1));
  await p.screenshot({path:OUT+'/4-spotlight.png'});
  await wait(5000);
  ok('achievements: it is still there after 5 seconds', !!(await p.$('.spot')));
  await p.hover('.spot'); await wait(4000);
  ok('achievements: pointing at it holds it open', !!(await p.$('.spot')));
  const badge = await p.evaluate(()=>{ const t=document.querySelector('.rankpill .tcount'); return t ? t.textContent : null; });
  ok('achievements: the character badge counts what is new', badge && +badge>0, badge);
  const earned = await p.evaluate(()=>[...document.querySelectorAll('.earned li')].map(x=>x.textContent));
  ok('achievements: the debrief lists what was earned on this walk', earned.length>0, earned.join(' | '));
  g = await p.evaluate(()=>({plan:!!document.querySelector('.plan'), head:(document.querySelector('.plan h2')||{}).textContent, phases:[...document.querySelectorAll('.phase:not(.empty)')].length}));
  ok('plan: the finished map leads with a sequenced plan', g.plan && g.phases>=1, JSON.stringify(g));
  await p.screenshot({path:OUT+'/5-finished-plan.png', fullPage:true});
  await p.mouse.move(5, 790);
  await p.click('.rankpill'); await wait(600);
  g = await p.evaluate(()=>({fresh:document.querySelectorAll('.insignia li.fresh').length, badge:!!document.querySelector('.rankpill .tcount')}));
  ok('achievements: the character sheet shows them as new, and the badge clears', g.fresh>0 && !g.badge, JSON.stringify(g));

  /* finished walk can be reopened */
  await p.click('.tbtn:has-text("My maps")'); await wait(500);
  await p.click('.work.k-finished-walk .btn.primary'); await wait(800);
  ok('reopen: a finished walk opens again on its finished map', await p.evaluate(()=>!!document.querySelector('.v-finished .plan') && document.body.textContent.includes('A finished walk, reopened')));

  /* ---------- 3. Your own map: draft, hints, coherence, skipped questions ---------- */
  await p.click('.brand'); await p.click('text=Map your own process'); await p.waitForSelector('#proc');
  await p.fill('#proc', 'Logging customer meetings'); await p.reload(); await wait(500);
  await p.click('.tbtn:has-text("My maps")'); await wait(400);
  ok('draft: a half-typed setup survives a reload and is listed', (await p.textContent('.worklist')).includes('Logging customer meetings'));
  await p.click('.work.k-draft .btn.primary'); await wait(500);
  ok('draft: it reopens in setup with what was typed', (await p.inputValue('#proc'))==='Logging customer meetings');
  const ins = await p.$$('.steprow input'); await ins[0].fill('Log the meeting'); await ins[2].fill('Fix the shared form');
  await p.click('text=Start mapping'); await p.click('button.mcard >> nth=0'); await p.waitForSelector('.question .token');
  // kind of work: Write & draft; then band core; then look at the capability hints
  const choose = async label=>{ await p.click(`.question .token:has-text("${label}")`); await wait(480); };
  await choose('Write & draft'); await choose('Unstructured text'); await choose('High'); await choose('Low'); await choose('Yes, at the core');
  g = await p.evaluate(()=>({first:document.querySelector('.question .token b').textContent, tags:[...document.querySelectorAll('.question .ttag')].map(x=>x.textContent)}));
  ok('hints: the capability question leads with what fits the kind of work', g.first==='Drafting & generation' && g.tags.length>0, JSON.stringify(g));
  await p.screenshot({path:OUT+'/6-cap-hints.png'});
  await choose('Classification & routing'); await answerAll(p);
  g = await p.evaluate(()=>[...document.querySelectorAll('.challenge p')].map(x=>x.textContent));
  ok('coherence: a capability that does not fit the work is challenged', g.some(t=>/usual fits/.test(t)), g.join(' | '));
  // step 2: a process fix should not be asked about autonomy or place
  await p.click('.read .actions .btn.primary'); await p.waitForSelector('.question .token');
  await choose('Chase, coordinate & update'); await choose('Structured data'); await choose('Medium'); await choose('Low'); await choose('No, something simpler fits'); await choose('Fix the process (no tool)');
  await answerAll(p);
  g = await p.evaluate(()=>({rows:[...document.querySelectorAll('.arow .rk')].map(x=>x.textContent), verdict:(document.querySelector('.verdict h3')||{}).textContent}));
  ok('options: a process fix is not asked about autonomy or where it happens', !g.rows.includes('Autonomy') && !g.rows.includes('Where it happens') && g.verdict==='Fix the process first', JSON.stringify(g));

  /* save the map as a file, open it in a browser with nothing saved */
  await p.click('text=The map'); await wait(500);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('text=Save map file')]);
  const path = OUT + '/map.json'; await dl.saveAs(path);
  const ctx2 = await b.newContext({viewport:{width:390,height:844}}); const q = await ctx2.newPage();
  q.on('pageerror', e=>errors.push('phone: '+e.message));
  await q.goto(BASE); await wait(500);
  await q.click('button[aria-label^="My maps"]'); await wait(400);
  await q.setInputFiles('input[type=file]', path); await wait(900);
  g = await q.evaluate(()=>({view:document.querySelector('.app').className, h:document.querySelector('.tb-name') ? '' : '', done:document.querySelectorAll('.mcard.done').length}));
  ok('map file: opens in another browser with its answers', g.view.includes('v-map') && g.done===2, JSON.stringify(g));

  /* phone: shortlist visible */
  await q.click('.brand'); await q.click('text=Walk a Meridian process'); await q.click('.rolecard >> nth=0'); await q.waitForSelector('.station'); await wait(800);
  await q.click('.station >> text=Economists'); await wait(900);
  g = await q.evaluate(()=>{ const pk=document.querySelector('.pick').getBoundingClientRect(); return {vh:innerHeight, top:Math.round(pk.top), bottom:Math.round(pk.bottom)}; });
  ok('shortlist: the first choice is on screen and clear of the footer after one click (phone)', g.top>50 && g.bottom<g.vh-96, JSON.stringify(g));
  await q.screenshot({path:OUT+'/7-phone-economists.png'});
  ok('no page errors', errors.length===0, errors.join(' | '));
  console.log(R.join('\n'));
  await b.close();
})().catch(e=>{ console.log(R.join('\n')); console.error('FAILED', e.message); process.exit(1); });
