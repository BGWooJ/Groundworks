// Browser check for v8: phase 1 (the introduction, plain-language terms, "you are here", the new words)
// and phase 2 (save links and files, opened in other browsers), and phase 3 (the world map).
// Needs Playwright and a running preview:  npm run build && npx vite preview --port 4173
//   then  node scripts/browser-check-v8.cjs
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE = process.env.GROUNDWORK_URL || 'http://localhost:4173/';
const fs = require('fs'); const OUT = require('os').tmpdir() + '/groundwork-check-v8'; fs.mkdirSync(OUT, {recursive:true});
const R = []; const ok = (n, c, x)=>R.push((c?'PASS ':'FAIL ')+n+(x!==undefined?'  '+x:''));
const wait = ms=>new Promise(r=>setTimeout(r, ms));
// Words a newcomer should no longer meet on screen.
const OLD = /the field|field guide|field note|field report|field library|field journal|\bfield:|\bpain\b/i;
const oldWords = p=>p.evaluate(src=>{ const m = document.querySelector('main').innerText.match(new RegExp(src, 'i')); return m ? m[0] : null; }, OLD.source);
const stage = p=>p.evaluate(()=>{ const c = document.querySelector('.stages [aria-current="step"] .st-l'); return c ? c.textContent : null; });

(async()=>{
  const b = await chromium.launch(); const errors = [];
  const ctx = await b.newContext({viewport:{width:1360,height:800}}); const p = await ctx.newPage();
  p.on('pageerror', e=>errors.push(e.message)); p.on('console', m=>{ if(m.type()==='error') errors.push(m.text()); });
  await p.goto(BASE); await p.evaluate(()=>localStorage.clear()); await p.reload(); await wait(700);

  /* ---------- the introduction ---------- */
  let g = await p.evaluate(()=>({h1:document.querySelector('h1').textContent, skip:!!document.querySelector('.ihead .linkbtn'), regions:document.querySelectorAll('.iregion').length, divisions:document.querySelectorAll('.iregion li').length}));
  ok('intro: a new player starts with what Meridian is', g.h1==='Meet Meridian, a practice bank' && g.skip, JSON.stringify(g));
  ok('intro: it shows the five regions and thirteen divisions', g.regions===5 && g.divisions===13, JSON.stringify(g));
  await p.screenshot({path:OUT+'/01-intro-1.png'});
  await p.click('text=Next'); await wait(500);
  g = await p.evaluate(()=>({h1:document.querySelector('h1').textContent, calls:[...document.querySelectorAll('.icalls li')].map(x=>x.textContent)}));
  ok('intro: card 2 says what the player will do, with the four calls', g.h1==='What you will do' && g.calls.length===4, JSON.stringify(g));
  await p.click('.termbtn'); await wait(200);
  g = await p.evaluate(()=>({note:(document.querySelector('.termnote')||{}).textContent||'', exp:document.querySelector('.termbtn').getAttribute('aria-expanded')}));
  ok('terms: "What’s an LLM?" opens a plain-language note', g.exp==='true' && /large language model/.test(g.note), g.note.slice(0,60));
  await p.screenshot({path:OUT+'/02-intro-2-term.png'});
  await p.keyboard.press('Escape'); await wait(150);
  g = await p.evaluate(()=>({note:!!document.querySelector('.termnote'), focus:document.activeElement && document.activeElement.className}));
  ok('terms: Escape closes the note and returns focus to its button', !g.note && g.focus==='termbtn', JSON.stringify(g));
  await p.click('text=Next'); await wait(500);
  g = await p.evaluate(()=>({h1:document.querySelector('h1').textContent, phases:document.querySelectorAll('.iphases li').length, facts:(document.querySelector('.ifacts')||{}).textContent, btns:[...document.querySelectorAll('.iactions .btn')].map(x=>x.textContent)}));
  ok('intro: card 3 says what the player gets, how long it takes, and offers both ways in', g.h1==='Compare, then plan' && g.phases===4 && /15 minutes/.test(g.facts) && g.btns.includes('Explore Meridian') && g.btns.includes('Map your own work'), JSON.stringify(g));
  await p.screenshot({path:OUT+'/03-intro-3.png'});

  /* ---------- into a walk: lens, then "you are here" ---------- */
  await p.click('.iactions >> text=Explore Meridian'); await wait(500);
  g = await p.evaluate(()=>({h1:document.querySelector('h1').textContent, lede:document.querySelector('.lede').textContent}));
  ok('lens: chosen after the introduction, and says it does not change difficulty', g.h1==='Choose your lens' && /not how hard it is/.test(g.lede), g.h1);
  await p.click('.rolecard >> nth=0'); await p.waitForSelector('.wmap svg'); await wait(900);
  g = await p.evaluate(()=>({h1:document.querySelector('h1').textContent, lede:document.querySelector('.lede').textContent}));
  ok('survey: the heading is "Where could AI help most?" and keeps "no AI" a real answer', g.h1==='Where could AI help most?' && /need no AI/.test(g.lede), JSON.stringify(g));
  ok('stages: the survey is stage 1, Explore', (await stage(p))==='Explore', await stage(p));
  ok('words: no old wording on the survey', !(await oldWords(p)), await oldWords(p));
  await p.screenshot({path:OUT+'/04-survey.png'});
  await p.click('.lm[aria-label^="Economists"]'); await wait(900);
  ok('words: no old wording inside a division', !(await oldWords(p)), await oldWords(p));
  await p.click('.zone:has-text("Policy meeting briefings")'); await wait(900);
  ok('stages: a work area\'s processes are stage 2, Choose', (await stage(p))==='Choose', await stage(p));
  ok('words: no old wording in a work area', !(await oldWords(p)), await oldWords(p));
  await p.click('.site:has-text("Pre-meeting briefing cycle") .pin'); await wait(300);
  await p.click('.routebar >> text=Read my route'); await wait(600);
  g = await p.evaluate(()=>!!document.querySelector('.lede .termbtn'));
  ok('terms: the pick screen explains who the Guide is', g);
  await p.click('.lede .termbtn'); await wait(200);
  g = await p.evaluate(()=>(document.querySelector('.termnote')||{}).textContent||'');
  ok('terms: the Guide note says theirs is one view, not the only right answer', /not the only right answer/.test(g), g.slice(0,60));
  await p.screenshot({path:OUT+'/05-pick-guide.png'});
  await p.click('h1'); await wait(150);
  await p.click('.routecard'); await p.waitForSelector('button.mcard.cur'); await wait(500);
  ok('stages: the process map is stage 3, Make the calls', (await stage(p))==='Make the calls', await stage(p));
  await p.click('button.mcard.cur'); await p.waitForSelector('.question .token'); await wait(400);
  for(let i=0;i<14;i++){
    const band = await p.evaluate(()=>{ const q = document.querySelector('.question'); return q && q.dataset.q; });
    if(band==='band'){
      g = await p.evaluate(()=>!!document.querySelector('.question .qterm .termbtn'));
      ok('terms: the LLM question has "What’s an LLM?" next to it', g);
      await p.click('.qterm .termbtn'); await wait(200); await p.screenshot({path:OUT+'/06-step-term.png'}); await p.click('.qterm .termbtn'); await wait(150);
    }
    const ts = await p.$$('.question .token'); if(!ts.length) break; await ts[0].click(); await wait(480);
  }
  g = await p.evaluate(()=>(document.querySelector('[data-focus="reveal"]')||{}).textContent);
  ok('words: the reveal button says "Compare with the Guide"', g==='Compare with the Guide', g);
  await p.click('[data-focus="reveal"]'); await wait(2900);
  ok('stages: after comparing, the step is stage 4, Compare', (await stage(p))==='Compare', await stage(p));
  g = await p.evaluate(()=>({h3:(document.querySelector('.fieldread h3')||{}).textContent, figure:(document.querySelector('.pain figcaption')||{}).textContent}));
  ok('words: the comparison names the Guide', /^The Guide/.test(g.h3||''), g.h3);
  ok('words: no old wording on a compared step', !(await oldWords(p)), await oldWords(p));
  await p.screenshot({path:OUT+'/07-compared.png', fullPage:true});

  /* ---------- returning player ---------- */
  await p.click('.brand'); await wait(500);
  await p.reload(); await wait(700);
  g = await p.evaluate(()=>({h1:document.querySelector('h1').textContent, cards:[...document.querySelectorAll('.startcard b')].map(x=>x.textContent), times:[...document.querySelectorAll('.sc-t')].map(x=>x.textContent), logbook:[...document.querySelectorAll('h2')].map(x=>x.textContent).includes('Logbook')}));
  ok('home: a returning player goes straight to the home screen', g.h1==='Groundwork', g.h1);
  ok('home: both ways in say what they are and how long they take', g.cards.length===2 && g.times.length===2, JSON.stringify(g));
  ok('home: the journal is now the Logbook', g.logbook);
  ok('words: no old wording on the home screen', !(await oldWords(p)), await oldWords(p));
  await p.screenshot({path:OUT+'/08-home.png'});
  await p.click('text=How it works'); await wait(500);
  ok('home: "How it works" opens the introduction again', (await p.evaluate(()=>document.querySelector('h1').textContent))==='Meet Meridian, a practice bank');
  await p.click('text=Skip the introduction'); await wait(500);
  ok('intro: skipping returns to the home screen', (await p.evaluate(()=>document.querySelector('h1').textContent))==='Groundwork');

  /* ---------- your own map ---------- */
  await p.click('.startcard >> nth=1'); await p.waitForSelector('#proc'); await wait(300);
  ok('stages: your own map starts at Describe it, stage 1 of 3', (await stage(p))==='Describe it' && (await p.$$eval('.stages li', l=>l.length))===3, await stage(p));

  /* ---------- phone ---------- */
  const ctx2 = await b.newContext({viewport:{width:390,height:844}}); const q = await ctx2.newPage();
  q.on('pageerror', e=>errors.push('phone: '+e.message));
  await q.goto(BASE); await wait(700);
  g = await q.evaluate(()=>({h1:document.querySelector('h1').textContent, sw:document.documentElement.scrollWidth}));
  ok('phone: the introduction fits the screen width', g.h1==='Meet Meridian, a practice bank' && g.sw<=390, JSON.stringify(g));
  await q.screenshot({path:OUT+'/09-phone-intro.png', fullPage:true});
  await q.click('text=Next'); await wait(400); await q.click('.termbtn'); await wait(200);
  g = await q.evaluate(()=>{ const n = document.querySelector('.termnote').getBoundingClientRect(); return {l:Math.round(n.left), r:Math.round(n.right), sw:document.documentElement.scrollWidth}; });
  ok('phone: the LLM note stays inside the screen', g.l>=0 && g.r<=390 && g.sw<=390, JSON.stringify(g));
  await q.screenshot({path:OUT+'/10-phone-term.png'});
  await q.click('h1'); await q.click('text=Next'); await wait(400); await q.click('.iactions >> text=Explore Meridian'); await wait(400);
  await q.click('.rolecard >> nth=1'); await q.waitForSelector('.wmap svg'); await wait(900);
  g = await q.evaluate(()=>({now:(document.querySelector('.st-now')||{}).textContent, labels:[...document.querySelectorAll('.stages .st-l')].filter(x=>getComputedStyle(x).display!=='none').map(x=>x.textContent), sw:document.documentElement.scrollWidth}));
  ok('phone: the stage strip is one compact line', g.now==='Stage 1 of 5' && g.labels.length===1 && g.sw<=390, JSON.stringify(g));
  await q.screenshot({path:OUT+'/11-phone-survey.png'});
  g = await q.evaluate(()=>{ const c = document.querySelectorAll('.startcard'); return c.length; });
  await q.click('.brand'); await wait(500);
  g = await q.evaluate(()=>({sw:document.documentElement.scrollWidth, cards:document.querySelectorAll('.startcard').length}));
  ok('phone: the home screen fits, with both start cards', g.sw<=390 && g.cards===2, JSON.stringify(g));
  await q.screenshot({path:OUT+'/12-phone-home.png', fullPage:true});

  /* ================= phase 2: getting back to your work ================= */
  const fresh = async (vp)=>{ const c = await b.newContext({viewport:vp || {width:1360,height:800}, acceptDownloads:true}); const pg = await c.newPage();
    pg.on('pageerror', e=>errors.push('save: '+e.message)); return {c, pg}; };
  const walkOneStep = async pg=>{
    await pg.click('.startcard >> nth=0'); await pg.click('.rolecard >> nth=1'); await pg.waitForSelector('.wmap svg'); await wait(900);
    await pg.click('.lm[aria-label^="Economists"]'); await wait(900); await pg.click('.zone:has-text("Policy meeting briefings")'); await wait(900);
    await pg.click('.site:has-text("Pre-meeting briefing cycle") >> text=Walk this process'); await pg.waitForSelector('button.mcard.cur'); await pg.click('button.mcard.cur'); await pg.waitForSelector('.question .token');
    for(let i=0;i<14;i++){ const ts = await pg.$$('.question .token'); if(!ts.length) break; await ts[0].click(); await wait(450); }
    await pg.click('[data-focus="reveal"]'); await wait(2900);
  };
  const A = await fresh(); const pa = A.pg;
  await A.c.grantPermissions(['clipboard-read','clipboard-write'], {origin:new URL(BASE).origin});
  await pa.goto(BASE); await wait(700);
  ok('save: the introduction offers "Played before?" to someone on a new browser', !!(await pa.$('.ihead >> text=Played before? Open your saved progress')));
  await pa.click('text=Skip the introduction'); await wait(400);
  g = await pa.evaluate(()=>({door:!!document.querySelector('.welcomeback'), save:!!document.querySelector('.tbtn[aria-label^="Save progress"]')}));
  ok('save: an empty browser\'s home screen offers to open saved progress, and has nothing to save yet', g.door && !g.save, JSON.stringify(g));
  await walkOneStep(pa);
  g = await pa.evaluate(()=>{ const t = document.querySelector('.tbtn[aria-label^="Save progress"]'); return {btn:!!t, dot:!!(t && t.querySelector('.tdot'))}; });
  ok('save: once there is work, the top bar offers "Save progress", marked as not yet saved', g.btn && g.dot, JSON.stringify(g));
  await pa.click('.tbtn[aria-label^="Save progress"]'); await pa.waitForFunction(()=>{ const i = document.querySelector('.linkrow .in'); return i && i.value.includes('#save=gw1.'); });
  g = await pa.evaluate(()=>({h:document.querySelector('#dlgTitle').textContent, link:document.querySelector('.linkrow .in').value, email:!!document.querySelector('a[href^="mailto:"]')}));
  ok('save: the dialog makes a save link for this site, with an email option when it is short enough', g.h==='Take your progress with you' && g.link.startsWith(BASE) && g.email, `${g.link.length} characters`);
  const link1 = g.link;
  await pa.screenshot({path:OUT+'/20-save-dialog.png'});
  await pa.click('.linkrow .btn'); await wait(300);
  g = await pa.evaluate(async()=>({btn:document.querySelector('.linkrow .btn').textContent, clip:await navigator.clipboard.readText()}));
  ok('save: "Copy the link" copies it and says so', g.btn==='Copied' && g.clip===link1, g.btn);
  const [dl] = await Promise.all([pa.waitForEvent('download'), pa.click('.saveopt >> text=Save a file')]);
  const file1 = OUT + '/progress.json'; await dl.saveAs(file1);
  ok('save: "Save a file" downloads the progress', /groundwork-progress-.*\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  await pa.click('.savedlg .actions >> text="Done"'); await wait(400);
  g = await pa.evaluate(()=>!!document.querySelector('.tbtn[aria-label^="Save progress"] .tdot'));
  ok('save: after saving, the top bar no longer marks progress as unsaved', !g);

  /* the link, opened on a phone that has never seen Groundwork */
  const B = await fresh({width:390,height:844}); const pb = B.pg;
  await pb.goto(link1); await wait(1500);
  g = await pb.evaluate(()=>({h1:document.querySelector('h1').textContent, hash:location.hash, toast:[...document.querySelectorAll('.toast')].map(t=>t.textContent).join(' '), resume:(document.querySelector('.resume-item')||{}).textContent}));
  ok('link: an empty browser opens straight to home with the progress, no introduction', g.h1==='Groundwork' && /Welcome back/.test(g.toast), JSON.stringify({h1:g.h1, toast:g.toast.slice(0,60)}));
  ok('link: the walk in progress is there to pick up', /1 of \d steps read/.test(g.resume||''), g.resume);
  ok('link: the save is cleared from the address bar once read', g.hash==='', g.hash);
  await pb.screenshot({path:OUT+'/21-phone-opened-link.png'});
  await pb.click('.resume-item'); await wait(800);
  g = await pb.evaluate(()=>document.querySelectorAll('.mcard.done').length);
  ok('link: one tap returns to the walk with its answers', g===1, g);

  /* the file, opened in a third browser through "Played before?" */
  const C = await fresh(); const pc = C.pg;
  await pc.goto(BASE); await wait(700);
  await pc.click('.ihead >> text=Played before? Open your saved progress'); await wait(400);
  await pc.screenshot({path:OUT+'/22-open-dialog.png'});
  await pc.setInputFiles('.savedlg input[type=file]', file1); await wait(900);
  g = await pc.evaluate(()=>({h1:document.querySelector('h1').textContent, resume:(document.querySelector('.resume-item')||{}).textContent}));
  ok('file: a save file opens in another browser with the same progress', g.h1==='Groundwork' && /1 of \d steps read/.test(g.resume||''), JSON.stringify(g));

  /* a newer save, opened where there is already progress */
  await pa.click('.brand'); await wait(400); await pa.click('.resume-item'); await wait(700);
  await pa.click('button.mcard.cur'); await pa.waitForSelector('.question .token');
  for(let i=0;i<14;i++){ const ts = await pa.$$('.question .token'); if(!ts.length) break; await ts[0].click(); await wait(450); }
  await pa.click('[data-focus="reveal"]'); await wait(2900);
  await pa.click('.tbtn[aria-label^="Save progress"]'); await pa.waitForFunction(()=>{ const i = document.querySelector('.linkrow .in'); return i && i.value.includes('#save=gw1.'); });
  const link2 = await pa.evaluate(()=>document.querySelector('.linkrow .in').value);
  await pb.goto(link2); await wait(1500);
  g = await pb.evaluate(()=>({h:(document.querySelector('#dlgTitle')||{}).textContent, cols:[...document.querySelectorAll('.sumgrid h3')].map(x=>x.textContent)}));
  ok('replace: a browser with progress asks first, and shows both side by side', g.h==='Replace the progress in this browser?' && g.cols.length===2, JSON.stringify(g));
  await pb.screenshot({path:OUT+'/23-phone-replace.png', fullPage:true});
  g = await pb.evaluate(()=>document.documentElement.scrollWidth);
  ok('phone: the replace dialog fits the screen width', g<=390, g);
  await pb.click('text=Keep this browser’s progress'); await wait(400);
  await pb.click('.brand'); await wait(500);
  g = await pb.evaluate(()=>(document.querySelector('.resume-item')||{}).textContent);
  ok('replace: keeping this browser\'s progress changes nothing', /1 of \d steps read/.test(g||''), g);
  await pb.goto(link2); await wait(1500); await pb.click('text=Use the saved progress'); await wait(800);
  g = await pb.evaluate(()=>(document.querySelector('.resume-item')||{}).textContent);
  ok('replace: using the saved progress brings in the newer walk', /2 of \d steps read/.test(g||''), g);

  /* a link cut short */
  await pc.goto(BASE + '#save=' + link1.split('#save=')[1].slice(0, 60)); await wait(1200);
  g = await pc.evaluate(()=>({h:(document.querySelector('#dlgTitle')||{}).textContent, err:(document.querySelector('.saveerr')||{}).textContent}));
  ok('damaged: a link cut short explains itself instead of failing silently', g.h==='Open your saved progress' && /cut off/.test(g.err||''), g.err);
  await pc.screenshot({path:OUT+'/24-damaged-link.png'});

  /* phone: the save dialog */
  await pb.click('.tbtn[aria-label^="Save progress"]'); await pb.waitForFunction(()=>{ const i = document.querySelector('.linkrow .in'); return i && i.value.includes('#save=gw1.'); });
  g = await pb.evaluate(()=>({sw:document.documentElement.scrollWidth, btn:document.querySelector('.linkrow .btn').getBoundingClientRect().width}));
  ok('phone: the save dialog fits, with a full-width copy button', g.sw<=390 && g.btn>250, JSON.stringify(g));
  await pb.screenshot({path:OUT+'/25-phone-save.png'});
  await A.c.close(); await B.c.close(); await C.c.close();

  /* ================= phase 3: the world ================= */
  const W = await fresh({width:1360, height:860}); const pw = W.pg;
  await pw.goto(BASE); await wait(600); await pw.click('text=Skip the introduction');
  await pw.click('.startcard >> nth=0'); await pw.click('.rolecard >> nth=0'); await pw.waitForSelector('.wmap svg'); await wait(900);
  g = await pw.evaluate(()=>{ const m = document.querySelector('.wmap').getBoundingClientRect(), rings = [...document.querySelectorAll('.lm-ring')].map(r=>r.getBoundingClientRect());
    return {landmarks:rings.length, regions:document.querySelectorAll('.w-region').length, inside:rings.filter(r=>r.left>=m.left && r.right<=m.right && r.top>=m.top && r.bottom<=m.bottom).length, hint:!!document.querySelector('.whint'),
      routeTop:Math.round(document.querySelector('.routebar').getBoundingClientRect().top), mapBottom:Math.round(m.bottom)}; });
  ok('world: thirteen divisions in five regions, all on screen on a desktop', g.landmarks===13 && g.regions===5 && g.inside===13, JSON.stringify(g));
  ok('world: the first visit shows how to move around', g.hint);
  ok('world: the map clears the route bar', g.mapBottom<=g.routeTop, JSON.stringify(g));
  await pw.hover('.lm[aria-label^="Benefits"]'); await wait(250);
  g = await pw.evaluate(()=>(document.querySelector('.lmcard b')||{}).textContent);
  ok('world: pointing at a division shows its card', g==='Benefits organization', g);
  const scaleOf = ()=>pw.evaluate(()=>{ const t = document.querySelector('.wmap svg > g').getAttribute('transform') || ''; const m = /scale\(([\d.]+)\)/.exec(t); return m ? +m[1] : 1; });
  const k0 = await scaleOf();
  await pw.focus('.wmap > svg'); await pw.keyboard.press('+'); await wait(500); await pw.keyboard.press('ArrowLeft'); await wait(300);
  const k1 = await scaleOf();
  ok('world: the keyboard zooms and moves the map', k1>k0, `${k0} -> ${k1}`);
  await pw.click('.wctl [aria-label="Show all of Meridian"]'); await wait(600);
  /* smoothness: frame gaps while entering a division */
  await pw.evaluate(()=>{ window.__f = []; const t0 = performance.now(); const tick = t=>{ window.__f.push(t); if(t - t0 < 900) requestAnimationFrame(tick); }; requestAnimationFrame(tick); });
  await pw.click('.lm[aria-label^="Economists"]'); await wait(1000);
  g = await pw.evaluate(()=>{ const f = window.__f, gaps = f.slice(1).map((t,i)=>t - f[i]); return {frames:f.length, worst:Math.round(Math.max(...gaps)), over50:gaps.filter(x=>x>50).length}; });
  ok('motion: entering a division runs without long stalls', g.worst<120 && g.over50<=3, JSON.stringify(g));
  g = await pw.evaluate(()=>({h1:document.querySelector('h1').textContent, focus:document.activeElement && document.activeElement.tagName, zones:document.querySelectorAll('.zone').length, crumbs:[...document.querySelectorAll('.wscene-head .crumb')].map(x=>x.textContent)}));
  ok('world: a division opens with its work areas, and focus moves to its name', g.h1==='Economists' && g.focus==='H1' && g.zones===3, JSON.stringify(g));
  ok('world: the breadcrumb says where you are', g.crumbs.join(' > ')==='Meridian > Economists', g.crumbs.join(' > '));
  await pw.click('.zone:has-text("Policy meeting briefings")'); await wait(900);
  g = await pw.evaluate(()=>({h1:document.querySelector('h1').textContent, sites:document.querySelectorAll('.site').length, rating:!!document.querySelector('.site .heatbar')}));
  ok('world: a work area lists its processes', g.h1==='Policy meeting briefings' && g.sites===3, JSON.stringify(g));
  ok('world: ratings stay hidden until the player has chosen', !g.rating);
  await pw.keyboard.press('Escape'); await wait(800);
  ok('world: Escape goes back up one level', (await pw.evaluate(()=>document.querySelector('h1').textContent))==='Economists');
  await pw.keyboard.press('Escape'); await wait(900);
  ok('world: and again, back to the map', !!(await pw.$('.wmap svg')));
  /* the route */
  const pin = async (div, area, proc)=>{ await pw.click(`.lm[aria-label^="${div}"]`); await wait(850); await pw.click(`.zone:has-text("${area}")`); await wait(850);
    await pw.click(`.site:has-text("${proc}") .pin`); await wait(250); await pw.click('.crumbs >> text=Meridian'); await wait(900); };
  await pin('Benefits', 'Inquiries', 'Benefits inquiries'); await pin('Finance', 'Payables', 'Supplier invoice processing'); await pin('Economists', 'Policy meeting briefings', 'The policy recommendation itself');
  g = await pw.evaluate(()=>[...document.querySelectorAll('.rb-slot.on > span')].map(x=>x.textContent));
  ok('route: pins from three divisions fill the route', g.length===3, g.join(' | '));
  await pw.click('.lm[aria-label^="Enterprise IT"]'); await wait(850); await pw.click('.zone >> nth=0'); await wait(850);
  g = await pw.evaluate(()=>{ const b = document.querySelector('.site .pin'); return {disabled:b.disabled, text:b.textContent}; });
  ok('route: a fourth pin waits for a free place', g.disabled && /Route full/.test(g.text), JSON.stringify(g));
  await pw.reload(); await wait(900);
  await pw.click('.startcard >> nth=0'); await pw.waitForSelector('.wmap svg'); await wait(700);
  g = await pw.evaluate(()=>document.querySelectorAll('.rb-slot.on').length);
  ok('route: it is kept with your progress, through a reload', g===3, g);
  await pw.click('.routebar >> text=How do they rank?'); await wait(700);
  g = await pw.evaluate(()=>({h1:document.querySelector('h1').textContent, mine:document.querySelectorAll('.ladder li.mine').length}));
  ok('route: "How do they rank?" marks your picks in the full ranking', g.h1==='How do they rank?' && g.mine===3, JSON.stringify(g));
  await pw.click('text=Read my route'); await wait(600);
  g = await pw.evaluate(()=>({h1:document.querySelector('h1').textContent, cards:document.querySelectorAll('.routecard').length}));
  ok('route: "Read my route" lists the three to read', g.h1==='Your route' && g.cards===3, JSON.stringify(g));
  await pw.click('.routecard:has-text("The policy recommendation itself")'); await pw.waitForSelector('button.mcard.cur'); await wait(500);
  g = await pw.evaluate(()=>[...document.querySelectorAll('.crumbs .crumb')].map(x=>x.textContent).join(' > '));
  ok('world: a process shows where it sits in Meridian', g==='Meridian > Economists > Policy meeting briefings > The policy recommendation itself', g);
  /* walk it to the end: the next on the route waits */
  for(let guard=0; guard<80; guard++){
    if(await pw.$('.v-finished')) break;
    if(await pw.$('.modal .choice')){ await pw.click('.modal .choice >> nth=0'); await wait(400); await pw.click('.modal >> text=Continue'); await wait(600); continue; }
    if(await pw.$('.modal [data-autofocus]')){ await pw.click('.modal [data-autofocus]'); await wait(300); continue; }
    if(await pw.$('.spot')){ /* the achievement spotlight floats; it does not block */ }
    if(await pw.$('.v-map')){ await pw.click('button.mcard.cur'); await wait(500); continue; }
    const tok = await pw.$('.question .token'); if(tok){ await tok.click(); await wait(420); continue; }
    const rv = await pw.$('[data-focus="reveal"]'); if(rv){ await rv.click(); await wait(2900); await pw.click('.read .actions .btn.primary'); await wait(700); continue; }
    break;
  }
  g = await pw.evaluate(()=>({finished:!!document.querySelector('.v-finished'), next:[...document.querySelectorAll('.actions .btn')].map(b=>b.textContent).find(t=>/Next on your route/.test(t)) || null}));
  ok('route: a finished walk offers the next process on the route', g.finished && /Next on your route: (Benefits inquiries|Supplier invoice processing)/.test(g.next||''), JSON.stringify(g));
  g = await pw.evaluate(()=>JSON.parse(localStorage.getItem('gw_journal_v4')).route);
  ok('route: the walked process leaves the route', g.length===2 && !g.includes('ratevote'), JSON.stringify(g));
  /* list view */
  await pw.click('.brand'); await wait(400); await pw.click('.startcard >> nth=0'); await pw.waitForSelector('.wmap svg'); await wait(600);
  await pw.click('.viewtoggle >> text=List'); await wait(700);
  g = await pw.evaluate(()=>({divs:document.querySelectorAll('.wl-div').length, regions:document.querySelectorAll('.wl-region').length}));
  ok('list: the same thirteen divisions in five regions, as lists', g.divs===13 && g.regions===5, JSON.stringify(g));
  await pw.click('.wl-div:has-text("Bank supervision") summary'); await wait(300);
  await pw.click('.wl-div:has-text("Bank supervision") li:has-text("Regulatory report validation") >> text=Walk this process'); await pw.waitForSelector('button.mcard.cur');
  ok('list: a process can be walked straight from the list', (await pw.evaluate(()=>document.querySelector('.crumbs .crumb.on').textContent))==='Regulatory report validation');
  await W.c.close();

  /* reduced motion: the zoom becomes a fade */
  const RM = await b.newContext({viewport:{width:1360,height:860}, reducedMotion:'reduce'}); const pr = await RM.newPage();
  await pr.goto(BASE); await wait(600); await pr.click('text=Skip the introduction'); await pr.click('.startcard >> nth=0'); await pr.click('.rolecard >> nth=0'); await pr.waitForSelector('.wmap svg'); await wait(700);
  await pr.click('.lm[aria-label^="Economists"]'); await wait(60);
  g = await pr.evaluate(()=>[...document.querySelectorAll('.wscene')].map(x=>getComputedStyle(x).transform));
  ok('motion: with reduced motion, levels fade without scaling', g.every(t=>t==='none' || /^matrix\(1, 0, 0, 1/.test(t)), JSON.stringify(g));
  await RM.close();

  /* phone */
  const PH = await fresh({width:390, height:844}); const pp = PH.pg;
  await pp.goto(BASE); await wait(600); await pp.click('text=Skip the introduction'); await pp.click('.startcard >> nth=0'); await pp.click('.rolecard >> nth=0'); await pp.waitForSelector('.wmap svg'); await wait(900);
  g = await pp.evaluate(()=>{ const n = document.querySelector('.lm[aria-label^="Economists"] .lm-name').getBoundingClientRect(); return {labelPx:Math.round(n.height), sw:document.documentElement.scrollWidth, k:(/scale\(([\d.]+)\)/.exec(document.querySelector('.wmap svg > g').getAttribute('transform')||'')||[0,1])[1]}; });
  ok('phone: the map opens zoomed to the screen, with readable labels', +g.k>1.5 && g.labelPx>=12 && g.sw<=390, JSON.stringify(g));
  await pp.screenshot({path:OUT+'/40-phone-world.png'});
  await pp.click('.lm[aria-label^="Economists"]'); await wait(900); await pp.click('.zone:has-text("Policy meeting briefings")'); await wait(900);
  g = await pp.evaluate(()=>({h1:document.querySelector('h1').textContent, sw:document.documentElement.scrollWidth}));
  ok('phone: a division and a work area open by tapping, and fit', g.h1==='Policy meeting briefings' && g.sw<=390, JSON.stringify(g));
  await pp.screenshot({path:OUT+'/41-phone-area.png'});
  await PH.c.close();

  ok('no page errors', !errors.length, errors.join(' | '));
  console.log(R.join('\n')); console.log('screenshots in', OUT);
  await b.close();
  process.exit(R.some(x=>x.startsWith('FAIL')) ? 1 : 0);
})().catch(e=>{ console.error('FAILED', e); process.exit(1); });
