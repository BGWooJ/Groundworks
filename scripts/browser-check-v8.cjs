// Browser check for v8: phase 1 (the introduction, plain-language terms, "you are here", the new words)
// and phase 2 (save links and files, opened in other browsers).
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
  await p.click('.rolecard >> nth=0'); await p.waitForSelector('.station'); await wait(900);
  g = await p.evaluate(()=>({h1:document.querySelector('h1').textContent, lede:document.querySelector('.lede').textContent}));
  ok('survey: the heading is "Where could AI help most?" and keeps "no AI" a real answer', g.h1==='Where could AI help most?' && /need no AI/.test(g.lede), JSON.stringify(g));
  ok('stages: the survey is stage 1, Explore', (await stage(p))==='Explore', await stage(p));
  ok('words: no old wording on the survey', !(await oldWords(p)), await oldWords(p));
  await p.screenshot({path:OUT+'/04-survey.png'});
  await p.click('.station >> text=Economists'); await wait(900);
  await p.click('.pick >> nth=0'); await wait(400);
  await p.click('.picknext .btn'); await wait(700);
  ok('stages: the full survey is stage 2, Choose', (await stage(p))==='Choose', await stage(p));
  ok('words: no old wording on the full survey', !(await oldWords(p)), await oldWords(p));
  await p.click('text=Choose the process to walk'); await wait(600);
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
  await q.click('.rolecard >> nth=1'); await q.waitForSelector('.station'); await wait(900);
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
    await pg.click('.startcard >> nth=0'); await pg.click('.rolecard >> nth=1'); await pg.waitForSelector('.station'); await wait(900);
    await pg.click('.station >> text=Economists'); await wait(900); await pg.click('.pick >> nth=0'); await wait(300);
    await pg.click('.picknext .btn'); await wait(500); await pg.click('text=Choose the process to walk'); await wait(400);
    await pg.click('.routecard'); await pg.waitForSelector('button.mcard.cur'); await pg.click('button.mcard.cur'); await pg.waitForSelector('.question .token');
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

  ok('no page errors', !errors.length, errors.join(' | '));
  console.log(R.join('\n')); console.log('screenshots in', OUT);
  await b.close();
  process.exit(R.some(x=>x.startsWith('FAIL')) ? 1 : 0);
})().catch(e=>{ console.error('FAILED', e); process.exit(1); });
