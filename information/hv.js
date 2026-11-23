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
  // phones: the sides switch on their own as you scroll past (Craft as the panel comes up, AI as its half reaches the middle); a tap still works
  let auto;
  const onScroll = () => {
    if (!MOB.matches) return;
    const H = innerHeight, p = hv.getBoundingClientRect();
    const want = p.top > H * 0.6 || p.bottom < H * 0.25 ? null : halves[1].getBoundingClientRect().top < H * 0.6 ? halves[1] : halves[0];
    if (want !== auto) { auto = want; set(want); }
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
/* how we work: each step's shapes grow in as its panel comes into view */
(() => {
  const steps = document.querySelectorAll('.wd-sec .st');
  if (!steps.length) return;
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .3 });
  steps.forEach(s => io.observe(s));
  // the panels pin exactly on the held title's bottom line, so its line and theirs are one line
  const list = document.querySelector('.wd-sec .steps4'), title = document.querySelector('.wd-sec > .sec-title');
  const pin = () => { if (!list || !title) return; const top = parseFloat(getComputedStyle(title).top) || 0; list.style.setProperty('--st-js', (top + title.getBoundingClientRect().height - 1).toFixed(2) + 'px'); };
  pin(); addEventListener('resize', pin); document.fonts && document.fonts.ready.then(pin);
})();
/* Clients: hovering a row shows that client's picture on the left (desktop); rows without a picture clear it */
(() => {
  const list = document.querySelector('.cl-list'), pic = document.querySelector('.cl-pic');
  if (!list || !pic) return;
  const img = pic.querySelector('img');
  list.querySelectorAll('.cl-row[data-img]').forEach(r => { const i = new Image(); i.src = r.dataset.img; });   // ready before the first hover
  list.addEventListener('pointerover', e => {
    const row = e.target.closest('.cl-row'); if (!row) return;
    const src = row.dataset.img;
    if (!src) { pic.classList.remove('on'); return; }
    if (img.getAttribute('src') !== src) { pic.classList.remove('on'); img.src = src; void pic.offsetWidth; }
    pic.classList.add('on');
  });
  list.addEventListener('pointerleave', () => pic.classList.remove('on'));
})();
