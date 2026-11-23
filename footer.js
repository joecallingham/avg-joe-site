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
/* The closing image (Information page): full width and a third of the screen tall; as the footer comes up its frame
   shrinks and travels into the box between Extra and Ordinary. As on the home page, the picture partly scales with
   its frame and is partly cropped by it mid-move, and the corners round off as it leaves full width. Driven straight
   off the scroll, so it never runs ahead of it. */
(() => {
  const sec = document.querySelector('.end-img'), foot = document.getElementById('foot'), slot = foot && foot.querySelector('.fm-slot');
  if (!sec || !slot) return;
  const src = sec.querySelector('img');
  const still = src.cloneNode(); still.loading = 'eager'; slot.appendChild(still);   // loaded up front, so it's there the moment the image lands
  const fly = document.createElement('div'), img = src.cloneNode(); img.loading = 'eager';
  fly.className = 'ei-fly'; fly.setAttribute('aria-hidden', 'true'); fly.appendChild(img); document.body.appendChild(fly);
  const CROP = 0.5;
  const ease = t => t * t * (3 - 2 * t);
  let raf = 0, state = '';
  const tick = () => {
    raf = 0;
    const H = innerHeight, f = foot.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (H - f.top) / H));               // 0 as the footer starts to come up, 1 once it's in
    const mode = t <= 0 ? 'rest' : t >= 0.995 ? 'in' : 'moving';
    if (mode !== state) {
      state = mode;
      sec.classList.toggle('away', mode !== 'rest');
      slot.classList.toggle('full', mode === 'in');
      fly.classList.toggle('on', mode === 'moving');
    }
    if (mode !== 'moving') return;
    const a = sec.getBoundingClientRect(), b = slot.getBoundingClientRect(), e = ease(t);
    const L = (p, q) => p + (q - p) * e;
    const x = L(a.left, b.left), y = L(a.top, b.top), w = L(a.width, b.width), h = L(a.height, b.height);
    fly.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    fly.style.width = w.toFixed(1) + 'px'; fly.style.height = h.toFixed(1) + 'px';
    fly.style.borderRadius = (0.16 * Math.min(w, h) * e).toFixed(1) + 'px';
    // the picture: sized for the full frame, scaled part of the way with the frame and cropped the rest
    const crop = CROP * Math.sin(Math.PI * e), iw = w + (a.width - w) * crop, ih = h + (a.height - h) * crop;
    const k = Math.max(iw / a.width, ih / a.height);
    img.style.width = a.width + 'px'; img.style.height = a.height + 'px';
    img.style.transform = `translate3d(${((w - a.width * k) / 2).toFixed(1)}px,${((h - a.height * k) / 2).toFixed(1)}px,0) scale(${k.toFixed(4)})`;
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); tick();
})();
