/* Information page: What We Do, after santalarch.com's services.
   The section pins; as you scroll, the row of service names slides left through a window column (sharp inside it,
   faint outside), each service's picture wipes in from the right in that same column, and the line beside it swaps. */
(() => {
  const run = document.getElementById('wd');
  if (!run) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = [...run.querySelectorAll('.wd-list li')].map(li => ({ name: li.querySelector('b').textContent, desc: li.querySelector('span').textContent }));
  const N = items.length, PER = 0.6;          // screens of scrolling per service
  const INTRO = 0.9;                          // screens of scrolling while everything slides in from the right
  run.style.height = (100 + (INTRO + (N - 1) * PER) * 100 + 40) + 'vh';

  const stick = run.querySelector('.wd-stick');
  const tracks = [...run.querySelectorAll('.wd-track')];
  tracks.forEach(t => t.replaceChildren(...items.map(it => { const s = document.createElement('span'); s.textContent = it.name; return s; })));
  const pics = [...run.querySelectorAll('.wd-pic')];
  const winEl = run.querySelector('.wd-win'), rule = run.querySelector('.wd-rule'), picsBox = run.querySelector('.wd-pics'), countEl = run.querySelector('.wd-count');
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
    if (r.bottom < 0 || r.top > innerHeight) return;
    const s = -r.top / innerHeight;                                   // screens scrolled into the section
    const q = Math.max(0, Math.min(1, (s + 0.35) / (INTRO + 0.35)));   // entry: starts just before it pins
    const p = Math.max(0, Math.min(N - 1, (s - INTRO) / PER));
    const key = q * 100 + p;
    if (key === last) return;
    last = key;
    // entry: the names, the window's lines, the picture and the copy all arrive from the right
    const e = RM ? 1 : 1 - Math.pow(1 - q, 3), off = (1 - e) * innerWidth;
    const x = win - gap / 2 - p * gap + off;
    winEl.style.transform = `translate3d(${(off * 0.8).toFixed(1)}px,0,0)`;
    rule.style.transform = `scaleX(${e.toFixed(4)})`;
    picsBox.style.clipPath = `inset(0 0 0 ${((1 - e) * 100).toFixed(2)}%)`;
    picsBox.style.transform = `translate3d(${(off * 0.35).toFixed(1)}px,0,0)`;
    [desc, countEl].forEach((el, k) => { el.style.translate = `${(off * (0.6 + k * 0.2)).toFixed(1)}px 0`; el.style.opacity = e.toFixed(3); });
    tracks.forEach(t => t.style.transform = `translate3d(${x.toFixed(1)}px,0,0)`);
    // picture i wipes in from the right over picture i-1 as p goes from i-1 to i
    pics.forEach((im, i) => { const f = i === 0 ? 1 : Math.max(0, Math.min(1, p - (i - 1))); im.style.clipPath = `inset(0 0 0 ${((1 - f) * 100).toFixed(2)}%)`; });
    const i = Math.round(p);
    if (i !== shown) show(i);
  };
  show(0);
  requestAnimationFrame(frame);
})();
