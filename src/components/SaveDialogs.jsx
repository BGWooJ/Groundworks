/* v8: taking progress to another browser, and bringing it back.
   SaveDialog     a save link (copy or email) and a save file
   RestoreDialog  paste a save link or choose a file (map files from v7 open here too)
   RestoreConfirm when the browser already has progress, show both before replacing anything */
import {useEffect, useRef, useState} from 'react';
import {useGame, actions, download} from '../game/store.js';
import {packJournal, unpackJournal, saveLinkOf, progressFile, saveError} from '../game/storage.js';
import {summaryOf, ago} from '../game/journal.js';
import {Icon} from './ui.jsx';

const EMAIL_LIMIT = 1800;   // mail apps cut longer links; offer the file instead

export function SaveDialog(){
  const J = useGame(s=>s.J), [code, setCode] = useState(null), [failed, setFailed] = useState(false), [copied, setCopied] = useState(false);
  const box = useRef(null);
  useEffect(()=>{
    let live = true;
    // the saved copy records the moment it was saved, so a browser that opens it knows it is up to date
    packJournal(Object.assign({}, J, {profile:Object.assign({}, J.profile, {lastSave:Date.now()})}))
      .then(c=>{ if(live) setCode(c); }, ()=>{ if(live) setFailed(true); });
    return ()=>{ live = false; };
  }, []);
  const link = code ? saveLinkOf(code) : '';
  const copied1 = ()=>{ setCopied(true); actions.saveDone('link'); };
  const copy = ()=>{
    if(!link) return;
    const fallback = ()=>{ const b = box.current; if(!b) return; b.focus(); b.select(); try{ if(document.execCommand('copy')) copied1(); }catch(e){} };
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(copied1, fallback); else fallback();
  };
  const file = ()=>{ const f = progressFile(Object.assign({}, J, {profile:Object.assign({}, J.profile, {lastSave:Date.now()})})); download(f.name, f.text, 'application/json'); actions.saveDone('file'); };
  const mail = `mailto:?subject=${encodeURIComponent('My Groundwork progress')}&body=${encodeURIComponent('Open this link to carry on where I left off in Groundwork:\n\n' + link)}`;
  return <div className="savedlg">
    <p className="dfrom"><Icon name="flag"/>Your progress</p>
    <h2 id="dlgTitle">Take your progress with you</h2>
    <p className="dtext">Groundwork saves as you go, but only in this browser. To carry on in another browser or on another computer, or in case this browser clears its history, keep a save link or a save file.</p>
    <section className="saveopt" aria-labelledby="so-link">
      <h3 id="so-link"><Icon name="send"/>Save link<span className="rec">Recommended</span></h3>
      <p>One link holds everything: your maps, walks, rank and marks. Bookmark it or email it to yourself, then open it anywhere.</p>
      {failed ? <p className="saveerr" role="alert">This browser could not make a link. Use the save file instead.</p>
        : <div className="linkrow">
            <input ref={box} className="in" readOnly value={link || 'Preparing your link…'} aria-label="Your save link" onFocus={e=>e.target.select()}/>
            <button className="btn brass" onClick={copy} disabled={!link} data-autofocus>{copied ? <><Icon name="check"/>Copied</> : <><Icon name="copy"/>Copy the link</>}</button>
          </div>}
      {link && (link.length<=EMAIL_LIMIT
        ? <a className="linkbtn" href={mail} onClick={()=>actions.saveDone('link')}><Icon name="send"/>Email it to myself</a>
        : <p className="small muted">This link is long ({link.length.toLocaleString()} characters). If your email cuts it off, use the save file instead.</p>)}
      <p className="small muted">The link is a snapshot of now: save a new one when you next stop. Your progress travels inside the link itself, after the # sign, and is never sent to a server. Treat it like the work: anyone who opens it sees your maps.</p>
    </section>
    <section className="saveopt" aria-labelledby="so-file">
      <h3 id="so-file"><Icon name="download"/>Save file</h3>
      <p>The same, as a file. Handy if the link is too long for your email, or if you prefer files.</p>
      <button className="btn secondary" onClick={file}><Icon name="download"/>Save a file</button>
    </section>
    <p className="small">To open it later, open the link, or choose <b>Open saved progress</b> on the home screen or in My maps and pick the file.</p>
    <div className="actions"><button className="btn primary" onClick={actions.closeModal}>Done</button></div>
  </div>;
}

export function RestoreDialog({M}){
  const [text, setText] = useState(''), [err, setErr] = useState(M.error || null), [busy, setBusy] = useState(false), file = useRef(null);
  const openLink = ()=>{ setBusy(true); setErr(null);
    unpackJournal(text).then(env=>actions.restoreArrive(env), e=>{ setErr(saveError(e)); setBusy(false); }); };
  const pick = e=>{ const f = e.target.files && e.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = ()=>{ const msg = actions.openSaveFile(String(r.result)); if(msg) setErr(msg); }; r.readAsText(f); e.target.value = ''; };
  return <div className="savedlg">
    <p className="dfrom"><Icon name="flag"/>Played before?</p>
    <h2 id="dlgTitle">Open your saved progress</h2>
    <p className="dtext">Paste your save link, or choose a save file. Map files from “Save map file” open here too.</p>
    {err && <p className="saveerr" role="alert"><Icon name="near"/>{err}</p>}
    <section className="saveopt">
      <label htmlFor="savepaste"><b>Save link</b></label>
      <textarea id="savepaste" className="in" rows={3} value={text} onChange={e=>setText(e.target.value)} placeholder="Paste the whole link here" data-autofocus/>
      <button className="btn primary" onClick={openLink} disabled={!text.trim() || busy}>{busy ? 'Opening…' : 'Open the link'}</button>
    </section>
    <section className="saveopt">
      <b>Save file</b>
      <p className="small muted">A file you saved with “Save progress” or “Save map file”.</p>
      <button className="btn secondary" onClick={()=>file.current && file.current.click()}><Icon name="download"/>Choose a file</button>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={pick} aria-label="Choose a save file"/>
    </section>
    <div className="actions"><button className="btn ghost" onClick={actions.closeModal}>Cancel</button></div>
  </div>;
}

function Summary({s, saved}){
  return <ul className="sumlist">
    <li><Icon name="user"/><b>{s.rank}</b>, {s.xp} XP</li>
    <li><Icon name="map"/>{s.inProgress} in progress, {s.finished} finished</li>
    <li><Icon name="mark"/>{s.marks} {s.marks===1 ? 'mark' : 'marks'}</li>
    <li><Icon name="flag"/>{saved ? `Saved ${ago(saved)}` : (s.last ? `Last worked on ${ago(s.last)}` : 'Nothing worked on yet')}</li>
  </ul>;
}

export function RestoreConfirm({M}){
  const J = useGame(s=>s.J), mine = summaryOf(J), theirs = summaryOf(M.env.J);
  const [kept, setKept] = useState(false);
  const keepCopy = ()=>{ const f = progressFile(J); download(f.name, f.text, 'application/json'); setKept(true); };
  return <div className="savedlg">
    <p className="dfrom"><Icon name="flag"/>Saved progress</p>
    <h2 id="dlgTitle">Replace the progress in this browser?</h2>
    <p className="dtext">This browser already has progress. Opening the save replaces it with what is in the save.</p>
    <div className="sumgrid">
      <section><h3>In this browser</h3><Summary s={mine}/></section>
      <section className="theirs"><h3>The save you opened</h3><Summary s={theirs} saved={M.env.at}/></section>
    </div>
    <p className="small">{kept ? <><Icon name="check"/> A file of this browser’s progress is saved, so you can come back to it.</>
      : <>To keep both, <button className="linkbtn" onClick={keepCopy}>save a file of this browser’s progress</button> first.</>}</p>
    <div className="actions">
      <button className="btn brass" onClick={()=>actions.restoreApply()} data-autofocus>Use the saved progress</button>
      <button className="btn ghost" onClick={actions.closeModal}>Keep this browser’s progress</button>
    </div>
  </div>;
}

/* Where players stop (the finished map, the Logbook): a reminder that saving here is per browser, and a
   way to take it with them. Quiet once the latest work is in a saved link or file. */
export function KeepProgress({card}){
  const J = useGame(s=>s.J), s = summaryOf(J);
  if(!s.last) return null;
  const last = J.profile.lastSave, fresh = last && last >= s.last;
  return <section className={card ? 'keep card' : 'keep'} aria-labelledby={card ? 'keep-h-c' : 'keep-h'}>
    <span className="keep-i"><Icon name={fresh ? 'check' : 'flag'}/></span>
    <div><h3 id={card ? 'keep-h-c' : 'keep-h'} className="h4">{fresh ? 'Your progress is saved to take with you' : 'Keep your progress'}</h3>
      <p className="small">{fresh ? `You saved a ${J.profile.lastSaveKind==='file' ? 'file' : 'link'} ${ago(last)} with everything so far.`
        : `It is saved in this browser only${last ? `, and you have done more since your last save link or file (${ago(last)})` : ''}. To carry on in another browser or computer, save a link or a file.`}</p></div>
    <span className="keep-b">
      <button className={'btn small ' + (fresh ? 'ghost' : 'brass')} onClick={actions.saveOpen}><Icon name="send"/>{fresh ? 'Save again' : 'Save progress'}</button>
      {card && <button className="linkbtn" onClick={()=>actions.restoreOpen()}>Open saved progress</button>}
    </span>
  </section>;
}
