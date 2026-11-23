/* The footer on every page: a fresh line each visit (as Mother does) and the UK time. */
(() => {
  const foot = document.getElementById('foot');
  if (!foot) return;
  const LINES = [
    'Avg Joe runs on tea and second drafts.',
    'Avg Joe smells like fresh ink and flat whites.',
    'Avg Joe has strong opinions about kerning.',
    'Avg Joe is ordinary, done properly.',
    'Avg Joe is probably making something right now.',
    'Avg Joe never lets the robot have the last word.',
  ];
  const tag = foot.querySelector('.foot-tag');
  // the footer line is fixed to Joe's pick for now (LINES kept for a rotation later)
  // the notch drops away while the footer is in view (on the home page main.js does this, as its footer is a layer)
  if (!foot.classList.contains('layer'))
    new IntersectionObserver(([e]) => document.documentElement.classList.toggle('foot-in', e.isIntersecting), { rootMargin: '0px 0px -35% 0px' }).observe(foot);
  // inner pages: the footer slides in from underneath (as on Malvah); its contents start a quarter of its height up, clipped by its top edge, and settle as it scrolls in
  if (!foot.classList.contains('layer') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    foot.classList.add('foot-under');
    let raf = 0;
    const move = () => {
      raf = 0;
      const r = foot.getBoundingClientRect(), h = innerHeight;
      if (r.top > h) return;
      const p = Math.min(1, Math.max(0, (h - r.top) / Math.min(h, r.height)));
      foot.style.setProperty('--fy', (-(1 - p) * 0.25 * r.height).toFixed(1) + 'px');
    };
    const ask = () => { if (!raf) raf = requestAnimationFrame(move); };
    addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); move();
  }
  const t = foot.querySelector('.foot-time');
  if (!t) return;
  const tick = () => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
    t.textContent = p.find(x => x.type === 'hour').value + ':' + p.find(x => x.type === 'minute').value;
    t.dateTime = t.textContent;
  };
  tick(); setInterval(tick, 20000);
})();
