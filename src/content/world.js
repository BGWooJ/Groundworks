/* =====================================================================
   THE WORLD (v8): Meridian as a place. Five regions on one island, each
   division a landmark, the mission at the centre. Coordinates are in a
   1600 x 1000 survey sheet; shapes are generated, so they stay the same
   on every visit and at every zoom.
   ===================================================================== */

export const SHEET = {w:1600, h:1000};

/* Regions follow MAP_GROUPS. tint names a colour family from tokens.css. */
export const REGIONS = [
  {id:'mission',     cx:800,  cy:330, rx:205, ry:150, tint:'brass',   seed:3},
  {id:'buildings',   cx:385,  cy:300, rx:215, ry:165, tint:'act',     seed:7},
  {id:'people',      cx:1225, cy:305, rx:215, ry:160, tint:'read',    seed:11},
  {id:'system',      cx:500,  cy:730, rx:220, ry:150, tint:'judge',   seed:17},
  {id:'institution', cx:1110, cy:735, rx:225, ry:160, tint:'none',    seed:23},
];

/* Where each division stands, and the short name the map prints beside it (the full name is on its card). */
export const LANDMARKS = {
  econ:{x:735, y:300, label:'Economists'}, research:{x:875, y:375, label:'Researchers'},
  facilities:{x:290, y:255, label:'Facilities'}, events:{x:470, y:225, label:'Events'}, police:{x:390, y:385, label:'Bank police'},
  it:{x:1140, y:240, label:'IT'}, hr:{x:1315, y:265, label:'HR'}, benefits:{x:1225, y:395, label:'Benefits'},
  supervision:{x:420, y:705, label:'Supervision'}, cashops:{x:585, y:790, label:'Cash & payments'},
  finance:{x:1020, y:690, label:'Finance'}, outreach:{x:1200, y:680, label:'Outreach'}, legal:{x:1105, y:820, label:'Legal & audit'},
};

/* A small seeded random, so the coastline is the same on every visit. */
function rand(seed){ let s = seed * 9301 + 49297; return ()=>{ s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

/* A smooth closed shape through points around an ellipse, with a gentle wobble. */
export function blobPath({cx, cy, rx, ry, seed, n=11, wobble=.16}){
  const r = rand(seed), pts = [];
  for(let i=0;i<n;i++){
    const a = (i/n) * Math.PI * 2, k = 1 - wobble/2 + r()*wobble;
    pts.push([cx + Math.cos(a)*rx*k, cy + Math.sin(a)*ry*k]);
  }
  // closed Catmull-Rom spline as cubic Beziers
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for(let i=0;i<n;i++){
    const p0 = pts[(i-1+n)%n], p1 = pts[i], p2 = pts[(i+1)%n], p3 = pts[(i+2)%n];
    const c1 = [p1[0] + (p2[0]-p0[0])/6, p1[1] + (p2[1]-p0[1])/6], c2 = [p2[0] - (p3[0]-p1[0])/6, p2[1] - (p3[1]-p1[1])/6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + 'Z';
}

/* The island: one coastline around every region, and contour lines inside it. */
export const ISLAND = {cx:800, cy:520, rx:760, ry:470, seed:5, n:17, wobble:.1};
export const CONTOURS = [.86, .72].map((s,i)=>({cx:800, cy:520, rx:760*s, ry:470*s, seed:31+i, n:15, wobble:.14}));

/* Roads: every region joins the mission; neighbours join each other. */
export const ROADS = [['mission','buildings'], ['mission','people'], ['mission','system'], ['mission','institution'], ['system','institution'], ['buildings','system'], ['people','institution']];
export function roadPath(a, b){
  const A = REGIONS.find(r=>r.id===a), B = REGIONS.find(r=>r.id===b);
  const mx = (A.cx + B.cx)/2, my = (A.cy + B.cy)/2, bend = (A.cx < B.cx ? -1 : 1) * 40;
  return `M${A.cx},${A.cy} Q${mx + bend},${my - bend} ${B.cx},${B.cy}`;
}
