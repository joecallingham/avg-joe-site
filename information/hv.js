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
    // the side you pick takes its own pattern and "What we mean by…"; the other side carries its copy
    halves.forEach(x => {
      const picked = x === h, copy = !!h && !picked;
      if (copy) lineDelays(x); else x.querySelectorAll('.hv-txt .lw').forEach(w => w.style.transitionDelay = '0s');
      x.classList.toggle('open', copy);
      x.classList.toggle('dim', picked);
      x.setAttribute('aria-expanded', String(picked));
    });
  };
  halves.forEach(h => {
    if (HOVER) h.addEventListener('mouseenter', () => set(h));
    h.addEventListener('click', () => set(open === h && !HOVER ? null : h));
    h.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(open === h ? null : h); } if (e.key === 'Escape') set(null); });
  });
  if (HOVER) hv.addEventListener('mouseleave', () => set(null));
})();
