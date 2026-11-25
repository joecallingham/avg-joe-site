/* Information page: What We Do, then its hand-off into the first step (Listen).
   The section pins; as you scroll, the row of service names slides left through a window column (sharp inside it,
   soft outside), each service's pattern wipes in, and the line beside it swaps. After the last service its pattern
   carries straight on as Listen's (the same image, never scaled):
   - desktop: the frame's top line rises with the grey grid line while the pattern drifts up at 30% of that speed,
     finishing as Listen settles;
   - phones: the pattern scrolls up with the page to the title, and Listen's text rises in underneath on the same scroll.
   Built to stay smooth on phones: one update, run only when you scroll; only moving parts are written each frame
   (transforms and clips, never layout); everything else is measured once and on resize. */
(() => {
  const run = document.getElementById('wd');
  if (!run) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MQ = matchMedia('(max-width: 760px)'), phone = () => MQ.matches;
  const items = [...run.querySelectorAll('.wd-list li')].map(li => ({ name: li.querySelector('b').textContent, desc: li.querySelector('span').textContent }));
  const N = items.length, PER = 0.6;          // screens of scrolling per service
  run.style.height = (100 + (N - 0.75) * PER * 100) + 'vh';   // lets go as Digital starts sliding into the blur, so its image starts to drop then

  const stick = run.querySelector('.wd-stick');
  const tracks = [...run.querySelectorAll('.wd-track')];
  tracks.forEach(t => t.replaceChildren(...items.map(it => { const s = document.createElement('span'); s.textContent = it.name; return s; })));
  const pics = [...run.querySelectorAll('.wd-pic')];
  const winEl = run.querySelector('.wd-win'), box = run.querySelector('.wd-pics'), countEl = run.querySelector('.wd-count');
  const vline = document.createElement('div'); vline.className = 'wd-vline'; stick.appendChild(vline);   // desktop: the window's full-height left line
  const desc = run.querySelector('.wd-desc'), cName = run.querySelector('.wd-cname'), cNum = run.querySelector('.wd-cnum');
  const pad = n => String(n).padStart(2, '0');

  // the hand-off into Listen: a screen-high copy of the last pattern, revealed by a clip
  const dest = document.querySelector('.wd-sec .st .st-pat');
  const list = document.querySelector('.wd-sec .steps4'), firstStep = dest && dest.closest('.st');
  const fly = document.createElement('div'), flySvg = pics[N - 1].querySelector('svg').cloneNode(true), flyLine = document.createElement('i');
  fly.className = 'wd-fly'; fly.setAttribute('aria-hidden', 'true'); flyLine.className = 'wd-fly-line';
  fly.append(flySvg, flyLine); document.body.appendChild(fly);

  // write a style only when it changes, so each frame touches only what actually moves
  const put = (el, k, v) => { const c = el._c || (el._c = {}); if (c[k] !== v) { c[k] = v; el.style[k] = v; } };
  const flag = (el, c, on) => { if (el.classList.contains(c) !== on) el.classList.toggle(c, on); };

  // ---- measured once, and again on resize / when fonts land
  let gap = 0, win = 0, anchor = [], pin = 50, unit = 1, vy = 0, vH = 1000, rise = 0, flyH = 0, boxTop = 0, last = null, raf = 0;
  const measure = () => {
    gap = winEl.offsetWidth; win = winEl.offsetLeft + gap / 2;
    // the names sit one after another with the same gap between every pair; anchor[i] is where name i lines up with the window
    const spans = [...tracks[0].children], fs = parseFloat(getComputedStyle(tracks[0]).fontSize) || 16, G = 1.1 * fs;
    let x = 0; const lefts = [], widths = [];
    spans.forEach(sp => { sp.style.width = 'auto'; sp.style.left = '0px'; });
    spans.forEach((sp, i) => { const w = sp.getBoundingClientRect().width; lefts.push(x); widths.push(w); x += w + G; });
    tracks.forEach(t => [...t.children].forEach((sp, i) => { sp.style.left = lefts[i] + 'px'; sp.style.width = widths[i] + 'px'; }));
    const padL = phone() ? parseFloat(getComputedStyle(spans[0]).paddingLeft) || 0 : 0;
    anchor = lefts.map((l, i) => phone() ? l - (winEl.offsetLeft + padL) + padL : l + widths[i] / 2 - win);   // desktop: centred in the window; phones: on its left line
    if (dest) {
      pin = parseFloat(getComputedStyle(list).getPropertyValue('--st-js')) || 50;
      // phones: Steps is pulled up by Listen's graphic height, so Listen's text rises on the same scroll as the image
      run.style.marginBottom = phone() ? -dest.getBoundingClientRect().height + 'px' : '';
      // one crop for every pattern here: sized by width, so a taller frame shows more of it rather than a bigger one
      const w = box.offsetWidth || 1, dh = dest.getBoundingClientRect().height, h = Math.min(box.offsetHeight || w, dh || w);
      unit = 1000 / w; vH = 1000 * h / w; vy = (1000 - vH) / 2; boxTop = box.offsetTop;
      rise = phone() ? 0 : 0.3 * Math.max(0, boxTop - pin);         // desktop: how far the pattern drifts up on the way
      const vb = up => `0 ${(vy + up * unit).toFixed(1)} 1000 ${vH.toFixed(1)}`;
      const fitTo = phone() ? 'xMidYMin meet' : 'xMidYMax meet';   // desktop: pinned to the shared bottom edge; phones: to the top
      pics.forEach(p => { const v = p.querySelector('svg'); v.setAttribute('viewBox', vb(0)); v.setAttribute('preserveAspectRatio', fitTo); });
      for (const v of [dest, flySvg]) { v.setAttribute('viewBox', vb(rise)); v.setAttribute('preserveAspectRatio', fitTo); }
      flyH = Math.max(box.offsetHeight, dh) + rise;                    // desktop: taller by the drift, so the picture always reaches the frame's top line
      fly.style.width = (dest.clientWidth - (phone() ? 0 : 1)) + 'px';   // stops short of the divider line, which draws up beside it
      flySvg.style.height = flyH + 'px';
    }
    for (const el of [...pics, ...tracks, winEl, vline, box, countEl, fly, flySvg, flyLine]) el._c = {};
    last = null; queue();
  };

  let shown = -1, swapT = 0;
  const show = i => {
    shown = i;
    pics.forEach((im, k) => flag(im, 'on', k <= i));                 // each pattern ripples in as its service comes up, and stays under the next
    cName.textContent = items[i].name; cNum.textContent = pad(i + 1) + ' | ' + pad(N);
    clearTimeout(swapT);
    desc.classList.add('out');
    swapT = setTimeout(() => { desc.textContent = items[i].desc; desc.classList.remove('out'); }, RM ? 0 : 220);
  };

  const tick = () => {
    raf = 0;
    const H = innerHeight, r = run.getBoundingClientRect();
    // ---- What We Do itself
    if (r.bottom > -H && r.top < H * 1.5) {
      const s = -r.top / H, run_ = s / PER;
      if (run_ !== last) {
        last = run_;
        const p = Math.max(0, Math.min(N - 1, run_));
        const e = RM ? 1 : Math.max(0, Math.min(1, (s + 0.85) / 0.85));   // how far the section has arrived
        const eL = Math.min(1, e * 1.8), eP = Math.max(0, Math.min(1, (e - 0.45) / 0.55));   // lines draw up first, then the picture opens
        put(winEl, 'clipPath', `inset(${((1 - eL) * 100).toFixed(1)}% 0 0 0)`);
        put(vline, 'clipPath', `inset(${((1 - eL) * 100).toFixed(1)}% 0 0 0)`);
        put(box, 'clipPath', `inset(0 0 0 ${((1 - eP) * 100).toFixed(1)}%)`);
        put(countEl, 'opacity', e.toFixed(2));
        // glide between the anchors (and on past either end at the last spacing), so it still moves straight off the scroll
        const k = Math.floor(run_), f = run_ - k, A = j => j < 0 ? anchor[0] + j * (anchor[1] - anchor[0]) : j > N - 1 ? anchor[N - 1] + (j - N + 1) * (anchor[N - 1] - anchor[N - 2]) : anchor[j];
        const x = `translate3d(${(-(A(k) + (A(k + 1) - A(k)) * f)).toFixed(1)}px,0,0)`;
        tracks.forEach(t => put(t, 'transform', x));
        // picture i wipes in over picture i-1 as p goes from i-1 to i (only the ones in play change)
        pics.forEach((im, i) => { const f = i === 0 ? 1 : Math.max(0, Math.min(1, p - (i - 1))); put(im, 'clipPath', f >= 1 ? 'none' : `inset(0 0 0 ${((1 - f) * 100).toFixed(1)}%)`); });
        const i = Math.round(p);
        if (i !== shown) show(i);
      }
    }
    // ---- the hand-off into Listen
    if (!dest) return;
    const st = stick.getBoundingClientRect().top;                      // 0 while the section holds, negative as it leaves
    const d = dest.getBoundingClientRect();
    const going = st < 0 && d.top > pin + 0.5 && d.top < H;             // What We Do is leaving and Listen hasn't settled
    flag(run, 'flying', going);
    flag(run, 'gone', st < 0 && !going && d.top <= pin + 0.5);          // after landing, the rest of What We Do stays out of sight
    flag(fly, 'on', going); flag(box, 'off', going); flag(dest, 'off', going);
    if (!going) return;
    firstStep.classList.add('in');
    // the frame: from the grey grid line (read live, so it always follows it) or the title, down to Listen's text.
    // It's placed in page coordinates, so its edges that follow the page (the grid line, Listen) move with the page itself.
    const sy = scrollY, top = Math.max(box.getBoundingClientRect().top, pin), bottom = d.bottom;
    const topD = (top + sy).toFixed(1), hD = Math.max(0, bottom - top).toFixed(1);
    put(fly, 'transform', `translate3d(${d.left.toFixed(1)}px,${topD}px,0)`);
    put(fly, 'height', hD + 'px');
    // phones: the pattern rides with the frame's top; desktop: it sits on the bottom edge, lower by the drift still to come
    const y = phone() ? top : H - flyH + rise * (1 - Math.max(0, Math.min(1, (H - d.top) / Math.max(1, H - pin))));
    put(flySvg, 'transform', `translate3d(0,${(y - top).toFixed(1)}px,0)`);
    put(flyLine, 'transform', `translate3d(0,${(hD - 1).toFixed(1)}px,0)`);   // phones: the divider above "01 Listen"
  };

  const queue = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('scroll', queue, { passive: true });
  // phones fire resize as the browser bar shows and hides while you scroll: only re-measure when the width really changes
  addEventListener('resize', (f => { let w = innerWidth; return () => { if (innerWidth === w && matchMedia('(pointer: coarse)').matches) return; w = innerWidth; f(); }; })(measure));
  MQ.addEventListener('change', measure);
  document.fonts && document.fonts.ready.then(measure);
  show(0); measure(); tick();
})();
