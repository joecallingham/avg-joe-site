/* Information page: the Craft | AI panel. Hover (or tap, or focus) a side: its copy rises in line by line,
   and the other side's word blurs out under the blue-and-red pattern. */
(() => {
  const hv = document.getElementById('hv');
  if (!hv) return;
  const halves = [...hv.querySelectorAll('.hv-half')];
  const HOVER = matchMedia('(hover: hover)').matches;

  // each line of copy is split into words; words on the same line share a delay so it reads as lines rising
  halves.forEach(h => {
    const t = h.querySelector('.hv-txt');
    const words = t.textContent.trim().split(/\s+/);
    t.replaceChildren(...words.flatMap((w, i) => { const s = document.createElement('span'); s.className = 'lw'; s.textContent = w; return i ? [document.createTextNode(' '), s] : [s]; }));
  });
  const lineDelays = h => { let top = null, line = -1; h.querySelectorAll('.hv-txt .lw').forEach(w => { if (w.offsetTop !== top) { top = w.offsetTop; line++; } w.style.transitionDelay = (0.12 + line * 0.09) + 's'; }); };

  let open = null;
  const set = h => {
    open = h;
    halves.forEach(x => {
      const on = x === h;
      if (on) lineDelays(x); else x.querySelectorAll('.hv-txt .lw').forEach(w => w.style.transitionDelay = '0s');
      x.classList.toggle('open', on);
      x.classList.toggle('dim', !!h && !on);
      x.setAttribute('aria-expanded', String(on));
    });
  };
  halves.forEach(h => {
    if (HOVER) h.addEventListener('mouseenter', () => set(h));
    h.addEventListener('click', () => set(open === h && !HOVER ? null : h));
    h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(open === h ? null : h); } if (e.key === 'Escape') set(null); });
  });
  if (HOVER) hv.addEventListener('mouseleave', () => set(null));
  // on a phone there is no hover: the panel holds under the About Us title and opens Craft, then AI, as you scroll
  if (!HOVER) {
    const wrap = hv.parentNode, title = document.querySelector('.ab-sec > .sec-title');
    const fit = () => { const top = parseFloat(getComputedStyle(title).top) + title.offsetHeight; hv.style.top = top + 'px'; hv.style.height = (innerHeight - top) + 'px'; };
    fit(); addEventListener('resize', fit);
    let last;
    const tick = () => {
      requestAnimationFrame(tick);
      // how far through its hold the panel is: 0 when it first sits under the title, 1 when it's about to move on
      const r = wrap.getBoundingClientRect(), m = parseFloat(getComputedStyle(hv).marginTop);
      const prog = (parseFloat(hv.style.top) - r.top - m) / Math.max(1, r.height - m - hv.offsetHeight);
      const k = prog < -0.05 || prog > 1.05 ? null : prog < 0.5 ? halves[0] : halves[1];
      if (k !== last) { last = k; set(k); }
    };
    requestAnimationFrame(tick);
  }
})();
