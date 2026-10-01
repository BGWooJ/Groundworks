/* Icons: 24x24 line icons, stroke = currentColor. icon(name, cls) returns an <svg>. */
const ICON_PATHS = {
  /* functions */
  econ:       '<polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/><path d="M4 4v16"/>',
  research:   '<circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/><path d="M8 10.5h5M10.5 8v5"/>',
  facilities: '<path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-5h6v5"/><path d="M9 11h2M13 11h2"/>',
  events:     '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4M16 3v4"/><path d="M12 13l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 19l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z"/>',
  police:     '<path d="M12 3l8 3v6c0 4.6-3.3 8.3-8 9.5C7.3 20.3 4 16.6 4 12V6z"/><path d="M12 8.5l1.1 2.2 2.4.3-1.8 1.7.5 2.4L12 14l-2.2 1.1.5-2.4-1.8-1.7 2.4-.3z"/>',
  it:         '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M7 9h4M7 12h7"/>',
  hr:         '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c3 .3 5.5 2.4 5.5 5.8"/>',
  benefits:   '<path d="M12 3l8 3v6c0 4.6-3.3 8.3-8 9.5C7.3 20.3 4 16.6 4 12V6z"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  /* capability families */
  read:       '<path d="M3 5.5A9 9 0 0 1 12 7a9 9 0 0 1 9-1.5v13A9 9 0 0 0 12 20a9 9 0 0 0-9-1.5z"/><path d="M12 7v13"/>',
  judge:      '<path d="M12 3v18M4 21h16"/><path d="M6 7h12"/><path d="M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z"/>',
  act:        '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  none:       '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L3 18l3 3 6.2-6.2a4 4 0 0 0 5.3-5.3L14 13l-3-3z"/>',
  /* autonomy */
  assist:     '<path d="M8 21v-6a4 4 0 0 1 4-4h0M8 15l-3.5-3.5a2 2 0 0 1 2.8-2.8L10 11.4V4a2 2 0 1 1 4 0v5M14 9a2 2 0 1 1 4 0v3M18 12a2 2 0 1 1 4 0v3a6 6 0 0 1-6 6h-2"/>',
  review:     '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  auto:       '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  /* standing */
  cred:       '<path d="M3 21h18"/><path d="M4 9.5h16"/><path d="M12 3l8.5 5H3.5z"/><path d="M6.5 10v8M10.2 10v8M13.8 10v8M17.5 10v8"/>',
  trust:      '<circle cx="8.5" cy="8" r="3"/><circle cx="16" cy="9" r="2.5"/><path d="M2.5 20c.3-3.3 2.8-5.5 6-5.5s5.7 2.2 6 5.5"/><path d="M15.2 14.6c3.1-.2 5.6 1.8 6.1 5.4"/>',
  rigor:      '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.2"/><path d="M12 1.5v4M12 18.5v4M1.5 12h4M18.5 12h4"/>',
  weeks:      '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M12 14h2M16 14h.01M8 17h2M12 17h2"/>',
  notes:      '<path d="M6.5 3H17a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6.5z"/><path d="M6.5 3v18M4 7h4.5M4 12h4.5M4 17h4.5M10.5 8h5.5M10.5 11.5h5.5"/>',
  flag:       '<path d="M5.5 21V3.5"/><path d="M5.5 4h12l-2.5 4.5 2.5 4.5h-12"/>',
  lock:       '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  mark:       '<circle cx="12" cy="9" r="6"/><path d="M8.6 13.8L7 22l5-2.8 5 2.8-1.6-8.2"/><path d="M12 6.2l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
  interview:  '<path d="M4 4.5h16v11H10l-5 4.5v-4.5H4z"/><path d="M8 9h8M8 12h5"/>',
  back:       '<path d="M15 18l-6-6 6-6"/>',
  replay:     '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/>',
  doc:        '<path d="M6 3h9l5 5v13H6z"/><path d="M14.5 3v5.5H20M9 13h8M9 16.5h6"/>',
  map:        '<path d="M9 4.5L3 6.5v13l6-2 6 2 6-2v-13l-6 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  near:       '<circle cx="12" cy="12" r="7.5"/><path d="M8.5 12h7"/>',
  up:         '<path d="M12 19V5M6 11l6-6 6 6"/>',
  down:       '<path d="M12 5v14M6 13l6 6 6-6"/>',
  close:      '<path d="M6 6l12 12M18 6L6 18"/>',
  plot:       '<path d="M4 3v17h17"/><circle cx="9" cy="14" r="1.6"/><circle cx="13.5" cy="9.5" r="1.6"/><circle cx="18" cy="6" r="1.6"/>',
  /* guardrails */
  threshold:  '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  logging:    '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".9" fill="currentColor"/><circle cx="4" cy="12" r=".9" fill="currentColor"/><circle cx="4" cy="18" r=".9" fill="currentColor"/>',
  privacy:    '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/><path d="M12 15v2.5"/>',
  escalation: '<circle cx="9" cy="7" r="3"/><path d="M3.5 20c.3-3.4 2.6-5.6 5.5-5.6 1.4 0 2.6.4 3.6 1.2"/><path d="M18 20v-7M15 15.5l3-3 3 3"/>',
  rollback:   '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/>',
  sampling:   '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  bias:       '<path d="M12 3v18M5 21h14"/><path d="M5.5 7h13"/><path d="M5.5 7l-3 6.5a3 3 0 0 0 6 0zM18.5 7l-3 6.5a3 3 0 0 0 6 0z"/>',
  /* ui */
  spark:      '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>',
  gear:       '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  check:      '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  print:      '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="9" rx="2"/><path d="M6 15v6h12v-6"/>',
  compass:    '<circle cx="12" cy="12" r="9.5"/><path d="M16 8l-2.6 5.4L8 16l2.6-5.4z"/>',
  send:       '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>',
  x:          '<path d="M6 6l12 12M18 6L6 18"/>',
  plug:       '<path d="M9 2v6M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v5"/>',
  route:      '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8 17.5c4-2 3-7 7-9.5"/>',
  arrow:      '<path d="M4 12h15M13 6l6 6-6 6"/>',
  chev:       '<path d="M9 5l7 7-7 7"/>',
  home:       '<path d="M3 11l9-7 9 7"/><path d="M5 9.5V20h14V9.5"/>',
  download:   '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 20h16"/>',
  copy:       '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  trash:      '<path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13"/>',
  plus:       '<path d="M12 5v14M5 12h14"/>',
};
function icon(name, cls){
  const d = ICON_PATHS[name] || ICON_PATHS.compass;
  return `<svg class="ico ${cls||''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
