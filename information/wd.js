/* Information page: What We Do, after santalarch.com's services.
   The section pins; as you scroll, the row of service names slides left through a window column (sharp inside it,
   faint outside), each service's picture wipes in from the right in that same column, and the line beside it swaps. */
(() => {
  const run = document.getElementById('wd');
  if (!run) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = [...run.querySelectorAll('.wd-list li')].map(li => ({ name: li.querySelector('b').textContent, desc: li.querySelector('span').textContent }));
  const N = items.length, PER = 0.6;          // screens of scrolling per service
  // everything slides in from the right while the section is still coming up the screen, so once it holds,
  // every bit of scrolling turns a service, and it lets go as soon as the last one is in (no dead scroll either end)
  run.style.height = (100 + (N - 0.75) * PER * 100) + 'vh';   // lets go as Digital starts sliding out of the window into the blur, so its image starts to drop then

  const stick = run.querySelector('.wd-stick');
  const tracks = [...run.querySelectorAll('.wd-track')];
  tracks.forEach(t => t.replaceChildren(...items.map(it => { const s = document.createElement('span'); s.textContent = it.name; return s; })));
  const pics = [...run.querySelectorAll('.wd-pic')];
  const winEl = run.querySelector('.wd-win'), rule = run.querySelector('.wd-rule'), picsBox = run.querySelector('.wd-pics'), countEl = run.querySelector('.wd-count');
  // desktop: the window's left line runs the full height (from the bottom line up); the pictures open out of it
  const vline = document.createElement('div'); vline.className = 'wd-vline'; stick.appendChild(vline);
  const desc = run.querySelector('.wd-desc'), cName = run.querySelector('.wd-cname'), cNum = run.querySelector('.wd-cnum');
  const pad = n => String(n).padStart(2, '0');

  // names sit one window-width apart; the track moves so the current name is centred in the window
  let gap = 0, win = 0, last = null;
  const measure = () => { const w = run.querySelector('.wd-win'); gap = w.offsetWidth; win = w.offsetLeft + w.offsetWidth / 2; tracks.forEach(t => [...t.children].forEach((s, i) => { s.style.left = (i * gap) + 'px'; s.style.width = gap + 'px'; })); last = null; };
  addEventListener('resize', measure); document.fonts && document.fonts.ready.then(measure); measure();

  let shown = -1, swapT = 0;
  const show = i => {
    shown = i;
    cName.textContent = items[i].name; cNum.textContent = pad(i + 1) + ' | ' + pad(N);
    clearTimeout(swapT);
    desc.classList.add('out');
    swapT = setTimeout(() => { desc.textContent = items[i].desc; desc.classList.remove('out'); }, RM ? 0 : 220);
  };

  const frame = () => {
    requestAnimationFrame(frame);
    const r = run.getBoundingClientRect();
    if (r.bottom < -innerHeight || r.top > innerHeight * 1.5) return;
    const s = -r.top / innerHeight;                                   // screens scrolled into the section
    // the names run straight off the scroll at one pace the whole way: in from the right as the section arrives,
    // through the window while it holds, and on off to the left as it leaves (no easing, no hold, no clamp)
    const run_ = s / PER;
    const p = Math.max(0, Math.min(N - 1, run_));                    // which service is in: pictures, line, counter
    const q = Math.max(0, Math.min(1, (s + 0.85) / 0.85));            // how far the window, picture and counter have arrived
    if (run_ === last) return;
    last = run_;
    const e = RM ? 1 : q, off = (1 - e) * innerWidth;                 // linear, so it moves with the scroll, not ahead of it
    const x = win - gap / 2 - run_ * gap;
    const eL = Math.min(1, e * 1.8), eP = Math.max(0, Math.min(1, (e - 0.45) / 0.55));   // lines first, then the picture
    winEl.style.clipPath = `inset(${((1 - eL) * 100).toFixed(2)}% 0 0 0)`;          // the window's lines draw up from their base as the section arrives
    vline.style.clipPath = `inset(${((1 - eL) * 100).toFixed(2)}% 0 0 0)`;
    picsBox.style.clipPath = `inset(0 0 0 ${((1 - eP) * 100).toFixed(2)}%)`;         // then the picture opens out of the left line, right to left
    countEl.style.opacity = e.toFixed(3);                                              // the counter fades in where it sits (no slide across the description)
    tracks.forEach(t => t.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`);
    // picture i wipes in from the right over picture i-1 as p goes from i-1 to i
    pics.forEach((im, i) => { const f = i === 0 ? 1 : Math.max(0, Math.min(1, p - (i - 1))); im.style.clipPath = `inset(0 0 0 ${((1 - f) * 100).toFixed(2)}%)`; });
    const i = Math.round(p);
    if (i !== shown) show(i);
  };
  show(0);
  requestAnimationFrame(frame);
})();
/* After the last service (Digital), its graphic drops down and grows into the first step's graphic space (Listen),
   its bottom edge moving down to show more of the drawing (which keeps its size), and lands as Listen's graphic, the same image. Scrolling back reverses it. */
(() => {
  const box = document.querySelector('.wd-pics'), pics = document.querySelectorAll('.wd-pic'), dest = document.querySelector('.wd-sec .st .st-pat');
  if (!box || !pics.length || !dest || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  // desktop: the graphics are sized by the box's width (not its height), so a taller box shows more of the drawing below
  // rather than a bigger drawing. The Digital box and the Listen panel are the same width, so the image keeps its size and place.
  const svgs = () => [...document.querySelectorAll('.wd-pic svg, .wd-fly svg'), dest];   // the services, the travelling copy and Listen only (not the other steps)
  const fit = () => {
    // the crop matches the picture box's own shape on this screen, so the drawing is always sized by width (never by height)
    // (on phones too: the box and the Listen panel are both full width there, so the image keeps its size and place)
    const bw = box.offsetWidth || 1, bh = box.offsetHeight || 1, vh = 1000 * bh / bw, vb = `0 ${((1000 - vh) / 2).toFixed(1)} 1000 ${vh.toFixed(1)}`;
    svgs().forEach(v => {
      if (!v.dataset.vb) v.dataset.vb = v.getAttribute('viewBox');
      v.setAttribute('viewBox', vb);
      v.setAttribute('preserveAspectRatio', 'xMidYMin meet');
    });
  };
  const fly = document.createElement('div');
  fly.className = 'wd-fly'; fly.setAttribute('aria-hidden', 'true');
  fly.innerHTML = pics[pics.length - 1].innerHTML;
  const firstStep = dest.closest('.st');
  document.body.appendChild(fly);
  fit(); addEventListener('resize', fit);
  const list = document.querySelector('.wd-sec .steps4'), stage = box.closest('.wd');
  let raf = 0, y0 = null, h0 = 0;
  const tick = () => {
    raf = 0;
    const H = innerHeight, d = dest.getBoundingClientRect();
    const pin = parseFloat(getComputedStyle(list).getPropertyValue('--st-js')) || 50;
    const t = Math.max(0, Math.min(1, (H - d.top) / Math.max(1, H - pin)));      // 0 as Listen arrives at the bottom, 1 once it has pinned
    const b = box.getBoundingClientRect();
    if (t <= 0 || t >= 1 || b.width === 0) { stage.classList.remove('flying'); fly.style.visibility = 'hidden'; box.style.visibility = ''; dest.style.visibility = ''; if (t <= 0) { y0 = null; h0 = b.height; } return; }
    // a simple drop: the image holds where it was (at the split) while the page moves on, so it drops down into the next section;
    // once Listen's graphic space reaches it, it rides up with that panel and settles in. The drawing never scales:
    // only the frame's bottom edge moves down, uncovering more of the image.
    if (y0 === null) y0 = b.top - box.closest('.wd-stick').getBoundingClientRect().top;   // where the image sat while the section held (fast scrolls can't shift it)
    const top = Math.min(y0, d.top), L = (a, z) => a + (z - a) * t;
    fly.style.visibility = 'visible';
    fly.style.left = L(b.left, d.left) + 'px'; fly.style.top = top + 'px';
    fly.style.width = L(b.width - 1, dest.clientWidth) + 'px';             // stops short of the divider lines, so they stay on top fly.style.height = L(h0 || b.height, d.height) + 'px';
    stage.classList.add('flying');                                         // the section's bottom divider doesn't cut across the image as it drops
    box.style.visibility = 'hidden'; dest.style.visibility = 'hidden';     // the original and Listen's own graphic stay out of sight while the copy travels (one image on screen)
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', ask, { passive: true }); addEventListener('resize', ask); tick();
})();
