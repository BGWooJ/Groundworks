// Browser check for v8 phase 1: the introduction, plain-language terms, "you are here", and the new words.
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

  ok('no page errors', !errors.length, errors.join(' | '));
  console.log(R.join('\n')); console.log('screenshots in', OUT);
  await b.close();
  process.exit(R.some(x=>x.startsWith('FAIL')) ? 1 : 0);
})().catch(e=>{ console.error('FAILED', e); process.exit(1); });
