/* =====================================================================
   ILLUSTRATIONS: one consistent set of line drawings.
   8 departments, 12 kinds of work, 3 autonomy levels. Everything is built
   from the same helpers, so line weight, figures and colour stay matched.
   Brass marks the part of each scene that matters.
   ===================================================================== */
const ILLUS = (function(){
  const L = (x1,y1,x2,y2,c='k')=>`<line class="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
  const R = (x,y,w,h,c='k w',rx=3)=>`<rect class="${c}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
  const C = (x,y,r,c='k w')=>`<circle class="${c}" cx="${x}" cy="${y}" r="${r}"/>`;
  const P = (d,c='k')=>`<path class="${c}" d="${d}"/>`;

  /* A person: shoulders first, then the head resting on them, so the
     head always joins the body. (x, y) is the centre of the head. */
  function person(x, y, o){
    o = o || {};
    const h = o.h || 42, body = o.dark ? 'k d' : 'k w';
    return P(`M${x-18} ${y+h} C${x-18} ${y+17} ${x-10} ${y+8} ${x} ${y+8} C${x+10} ${y+8} ${x+18} ${y+17} ${x+18} ${y+h} Z`, body)
         + P(`M${x-6} ${y+9} L${x} ${y+16} L${x+6} ${y+9}`, 'k thin')
         + C(x, y, 10, 'k w');
  }
  function doc(x, y, w, h, o){
    o = o || {};
    const f = 8, edge = o.brass ? 'k b' : 'k', fill = o.fill || 'w';
    let s = P(`M${x} ${y} H${x+w-f} L${x+w} ${y+f} V${y+h} H${x} Z`, `${edge} ${fill}${o.dash?' dash':''}`)
          + P(`M${x+w-f} ${y} V${y+f} H${x+w}`, edge);
    const widths = [1, .78, .94, .66, .88, .58, .8];
    for(let i=0;i<(o.lines||0);i++){
      const ly = y + 14 + i*9; if(ly > y + h - 6) break;
      const lw = Math.round((w - 14) * widths[i % widths.length]);
      s += L(x+7, ly, x+7+lw, ly, (o.hi||[]).includes(i) ? 'k b t' : 'k m');
    }
    return s;
  }
  const desk = (x1, x2, y)=>L(x1, y, x2, y, 'k t');
  const ground = (y)=>L(10, y, 150, y, 'k m dots');
  const tick = (x, y)=>P(`M${x-6} ${y} L${x-2} ${y+4} L${x+6} ${y-5}`, 'k gk t');
  const item = (x, y, s, brass)=>R(x, y, s||14, s||14, brass ? 'k b bf' : 'k w', 3);
  const flow = (d)=>P(d, 'k b dash');
  const svg = (label, body)=>`<svg class="illus" viewBox="0 0 160 120" role="img" aria-label="${label}">${body}</svg>`;

  /* ---------- departments ---------- */
  const dept = {
    econ: svg('Economists at work with a rising chart',
      R(88,16,60,46) + P('M96 54 V24 M96 54 H142','k m') + P('M99 49 L109 41 L119 45 L129 31 L139 26','k b t') + C(139,26,3,'bs')
      + person(50,46) + desk(14,148,88) + R(58,80,26,8,'k w',2)),
    research: svg('Researchers reading through stacked documents',
      R(14,22,40,66) + L(14,44,54,44) + L(14,66,54,66) + L(22,28,22,42,'k m') + L(28,30,28,42,'k m') + L(34,27,34,42,'k m') + L(24,50,24,64,'k m') + L(31,52,31,64,'k m')
      + person(96,44) + desk(68,152,86) + doc(114,58,28,28,{lines:2}) + C(136,66,9,'k b') + L(142,72,148,78,'k b t')),
    facilities: svg('A building and a facilities engineer',
      P('M18 98 V50 L48 30 L78 50 V98 Z','k w') + R(30,58,11,11) + R(55,58,11,11) + R(42,80,12,18,'k w',2)
      + person(118,56) + P('M106 54 C106 40 130 40 130 54 Z','k b bf') + L(104,54,132,54,'k b') + ground(98)),
    events: svg('A speaker at a podium under a banner',
      R(42,14,76,16,'k b bf',2) + L(54,22,106,22,'k b')
      + person(80,48) + L(88,64,92,56) + P('M62 98 L67 66 H93 L98 98 Z','k w') + L(66,76,94,76,'k m') + ground(98)),
    police: svg('A security officer beside a barrier gate',
      R(20,58,9,40,'k w',2) + L(29,64,80,64,'k b t') + L(40,61,40,67,'k b') + L(54,61,54,67,'k b') + L(68,61,68,67,'k b')
      + person(112,56,{dark:true}) + P('M108 72 h8 v5 c0 4 -4 6 -4 6 c0 0 -4 -2 -4 -6 Z','k b bs') + ground(98)),
    it: svg('A service desk analyst with a headset at a screen',
      R(70,24,66,46) + L(78,36,108,36,'k m') + L(84,44,122,44,'k b t') + L(84,52,112,52,'k m') + L(78,60,100,60,'k m')
      + L(103,70,103,80) + L(90,80,116,80)
      + person(40,46) + P('M28 47 C28 29 52 29 52 47','k b') + R(24,42,7,11,'k b bf',2) + R(49,42,7,11,'k b bf',2) + L(28,53,36,59,'k b') + desk(14,148,88)),
    hr: svg('Two people across a table with a CV between them',
      person(36,44) + person(124,44,{dark:true}) + desk(12,148,86)
      + doc(66,52,28,34,{lines:3,hi:[0]})),
    benefits: svg('A benefits counsellor helping someone at a counter',
      person(46,48) + person(122,50,{dark:true}) + R(14,88,132,22,'k w',2) + desk(12,148,88)
      + R(70,22,40,26,'k b bf',6) + P('M80 48 L76 57 L88 48','k b bf') + L(78,31,102,31,'k b') + L(78,39,94,39,'k b')
      + R(78,74,8,14,'k w',1) + R(87,70,8,18,'k b bs',1) + R(96,76,8,12,'k w',1)),
  };

  /* ---------- kinds of work ---------- */
  const shape = {
    extract: svg('Facts lifted out of a document into a structured card',
      doc(18,18,48,74,{lines:6,hi:[1,3]}) + C(52,50,13,'k') + L(61,60,70,69,'k t')
      + flow('M74 46 C86 46 90 40 100 34')
      + R(100,24,46,58) + C(110,38,3,'bs') + L(117,38,138,38) + C(110,52,3,'bs') + L(117,52,134,52) + C(110,66,3,'ms') + L(117,66,136,66,'k m')),
    route: svg('Items sorted into the right tray',
      item(14,52) + item(32,52) + flow('M50 59 C74 59 80 34 104 34') + P('M50 59 H104','k m') + P('M50 59 C74 59 80 84 104 84','k m')
      + P('M108 24 v16 h38 v-16','k') + item(120,26,12,true) + P('M108 50 v16 h38 v-16','k') + P('M108 74 v16 h38 v-16','k')),
    lookup: svg('A question answered from the documents',
      person(30,58) + R(12,14,46,24,'k w',6) + C(25,26,2,'sk') + C(35,26,2,'sk') + C(45,26,2,'sk') + P('M28 38 L26 46 L36 38','k w')
      + R(66,72,34,8,'k w',2) + R(70,64,30,8,'k b bf',2) + R(66,56,34,8,'k w',2) + ground(100)
      + flow('M100 60 C112 56 114 46 112 42') + R(100,18,48,26,'k b bf',6) + L(108,27,140,27,'k b') + L(108,35,130,35,'k b')),
    draft: svg('A new document being written from a pattern',
      doc(54,24,52,72,{dash:true,fill:'none'}) + doc(40,16,52,74,{lines:5,hi:[4]})
      + P('M98 92 L124 64 L131 71 L105 99 Z','k w') + P('M98 92 L95 102 L105 99','k b bf') + L(118,70,125,77,'k')),
    summarize: svg('A tall stack reduced to a short summary',
      doc(28,30,40,54,{}) + doc(22,24,40,54,{}) + doc(16,18,40,54,{lines:4})
      + flow('M64 52 C80 52 86 52 98 52') + P('M94 47 L100 52 L94 57','k b')
      + R(104,36,40,32,'k b bf',4) + L(112,47,136,47,'k b t') + L(112,57,128,57,'k b')),
    predict: svg('A trend projected forward',
      P('M20 96 V20 M20 96 H148','k m') + P('M88 50 L146 26 L146 54 Z','bf')
      + P('M24 84 L40 78 L54 80 L70 64 L88 58','k t') + C(88,58,3,'k w') + P('M88 58 L146 40','k b dash t') + C(146,40,4,'bs')),
    check: svg('Items checked, one flagged',
      doc(36,14,70,90,{}) + tick(52,32) + L(64,32,94,32,'k m') + tick(52,52) + L(64,52,90,52,'k m')
      + P('M48 66 V80 M48 66 H58 L55 70 L58 74 H48','k b bf') + L(64,72,94,72,'k b t') + tick(52,92) + L(64,92,86,92,'k m')),
    suggest: svg('Options ranked, best first',
      R(30,18,100,22,'k b bf',5) + C(42,29,6,'bs') + L(54,29,112,29,'k b t')
      + R(30,48,86,22) + C(42,59,6,'k w') + L(54,59,98,59,'k m')
      + R(30,78,72,22) + C(42,89,6,'k w') + L(54,89,86,89,'k m')),
    allocate: svg('Time slots allocated on a calendar',
      R(22,18,116,84) + L(22,34,138,34) + L(51,34,51,102,'k m') + L(80,34,80,102,'k m') + L(109,34,109,102,'k m') + L(22,56,138,56,'k m') + L(22,79,138,79,'k m')
      + R(26,38,21,14,'k d',2) + R(55,60,21,15,'k b bs',2) + R(84,38,21,14,'k d',2) + R(113,82,21,16,'k b bs',2) + R(55,82,21,16,'k d',2)),
    decide: svg('A person weighing a decision',
      person(42,46) + desk(12,80,88)
      + L(118,28,118,88) + L(104,88,132,88,'k t') + L(96,34,140,44,'k b t') + C(118,38,3,'bs')
      + L(96,34,90,52,'k m') + L(96,34,102,52,'k m') + P('M86 52 H106 C104 60 88 60 86 52 Z','k w')
      + L(140,44,134,62,'k m') + L(140,44,146,62,'k m') + P('M130 62 H150 C148 70 132 70 130 62 Z','k b bf')),
    coordinate: svg('Requests chased between a person, a document and a system',
      person(36,40) + L(10,82,64,82,'k t') + doc(108,14,30,38,{lines:2}) + R(100,74,46,30) + L(110,84,130,84,'k m') + L(110,92,124,92,'k m')
      + flow('M58 52 C78 34 92 30 104 30') + flow('M124 54 C126 62 126 66 124 72') + flow('M98 92 C78 96 64 92 54 84')),
    physical: svg('A parcel inspected against a checklist',
      person(40,52) + R(76,62,48,32) + P('M76 62 L84 52 H132 L124 62','k w') + L(124,94,132,84) + L(132,52,132,84) + L(100,62,100,94,'k m')
      + R(128,22,22,30,'k b bf',2) + L(133,32,145,32,'k b') + L(133,40,143,40,'k b') + ground(94)),
  };

  /* ---------- autonomy ---------- */
  const auto = {
    assist: svg('The tool prepares; a person decides every case',
      person(46,44) + desk(12,148,86) + doc(78,44,34,42,{brass:true,fill:'bf',lines:3})
      + P('M118 84 L136 58 L142 62 L124 88 Z','k w') + tick(100,30)),
    review: svg('Routine items pass; one flagged item goes to a person',
      L(14,92,146,92,'k t') + item(18,76) + item(40,76) + item(62,76) + item(106,76) + item(128,76)
      + flow('M86 76 C86 60 90 52 96 48') + item(92,34,16,true) + L(100,38,100,43,'k b') + C(100,46,1,'bs')
      + person(126,30,{dark:true,h:34}) + L(104,64,150,64,'k t')),
    auto: svg('Items flow on their own while a person watches the numbers',
      L(14,92,124,92,'k t') + item(18,76) + item(40,76) + item(62,76) + item(84,76) + P('M126 78 v16 h24 v-16','k') + item(131,79,14)
      + person(40,26,{h:34}) + L(14,60,72,60,'k t') + P('M92 52 A22 22 0 0 1 136 52','k b t') + L(114,52,124,38,'k') + C(114,52,3,'bs') + L(92,52,136,52,'k m')),
  };
  return {dept, shape, auto};
})();
