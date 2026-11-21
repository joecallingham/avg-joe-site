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
  // phones: the halves are stacked, so each side carries its own copy over its own pattern and the other side stays tappable
  const MOB = matchMedia('(max-width: 760px)');
  halves.forEach((h, i) => {
    const mine = document.createElement('div'); mine.className = 'hv-mine'; mine.setAttribute('aria-hidden', 'true');
    mine.append(h.querySelector('.hv-say').cloneNode(true), halves[1 - i].querySelector('.hv-txt').cloneNode(true));
    mine.firstChild.className = 'hv-mine-say';
    h.append(mine);
  });
  const lineDelays = (h, sel = '.hv-copy .hv-txt .lw') => { let top = null, line = -1; h.querySelectorAll(sel).forEach(w => { if (w.offsetTop !== top) { top = w.offsetTop; line++; } w.style.transitionDelay = (0.12 + line * 0.09) + 's'; }); };

  let open = null;
  const set = h => {
    open = h;
    // the side you pick takes its own pattern and "What we mean by…"; the other side carries its copy
    halves.forEach(x => {
      const picked = x === h, copy = !!h && !picked && !MOB.matches;
      x.querySelectorAll('.hv-txt .lw').forEach(w => w.style.transitionDelay = '0s');
      if (copy) lineDelays(x);
      if (picked && MOB.matches) lineDelays(x, '.hv-mine .hv-txt .lw');
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
