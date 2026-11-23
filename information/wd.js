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
/* After the last service, its image carries straight on as Listen's image (the same picture).
   The drawing never scales. As What We Do scrolls away, the frame's top line moves up with the grey grid line until it meets the title.
   On desktop the drawing stays still while the frame line moves (both frames end at the bottom of the screen);
   on phones the image scrolls up with the page and the Listen copy comes in underneath. */
(() => {
  const box = document.querySelector('.wd-pics'), pics = document.querySelectorAll('.wd-pic'), dest = document.querySelector('.wd-sec .st .st-pat');
  if (!box || !pics.length || !dest) return;
  const stage = box.closest('.wd'), list = document.querySelector('.wd-sec .steps4'), firstStep = dest.closest('.st');
  const phone = () => matchMedia('(max-width: 760px)').matches;
  const fly = document.createElement('div');
  fly.className = 'wd-fly'; fly.setAttribute('aria-hidden', 'true');
  fly.innerHTML = pics[pics.length - 1].innerHTML;
  document.body.appendChild(fly);
  // every graphic here is drawn to the same crop, sized by width and anchored to its box's bottom edge
  const fit = () => {
    const w = box.offsetWidth || 1, h = Math.min(box.offsetHeight || w, dest.clientHeight || w), vh = 1000 * h / w;
    const vb = `0 ${((1000 - vh) / 2).toFixed(1)} 1000 ${vh.toFixed(1)}`;
    // desktop: the drawing is pinned to the shared bottom edge, so it stays put while the frame's top line moves;
    // phones: pinned to the top edge, so the image scrolls with the page
    const anchor = phone() ? 'xMidYMin meet' : 'xMidYMax meet';
    [...document.querySelectorAll('.wd-pic svg, .wd-fly svg'), dest].forEach(v => { v.setAttribute('viewBox', vb); v.setAttribute('preserveAspectRatio', anchor); });
  };
  let raf = 0, y0 = 0;
  const tick = () => {
    raf = 0;
    const H = innerHeight, d = dest.getBoundingClientRect(), b = box.getBoundingClientRect(), st = stage.querySelector('.wd-stick').getBoundingClientRect();
    const pin = parseFloat(getComputedStyle(list).getPropertyValue('--st-js')) || 50;
    if (st.top >= 0) y0 = b.top;                                            // where the image sits while the section holds
    const going = st.top < 0 && d.top > pin + 0.5 && d.top < H;              // What We Do is leaving and Listen hasn't pinned yet
    stage.classList.toggle('flying', going);
    if (!going) { fly.style.visibility = 'hidden'; box.style.visibility = ''; dest.style.visibility = ''; return; }
    fly.style.visibility = 'visible';
    fly.style.left = d.left + 'px'; fly.style.width = dest.clientWidth + 'px';     // stops short of the divider line
    // the frame's top line moves up with the section's grey grid line as the page scrolls, until it meets the title
    fly.style.top = Math.max(b.top, pin) + 'px';
    fly.style.bottom = Math.max(0, H - d.bottom) + 'px';
    box.style.visibility = 'hidden'; dest.style.visibility = 'hidden';
    firstStep.classList.add('in');
  };
  const ask = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', () => { fit(); ask(); });
  matchMedia('(max-width: 760px)').addEventListener('change', () => { fit(); ask(); });
  document.fonts && document.fonts.ready.then(() => { fit(); ask(); });
  fit(); tick();
})();
