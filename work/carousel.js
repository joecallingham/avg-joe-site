/* Work: the line's picture opens into the first project, the others come in from the sides.
   The strip bends out towards the screen's edges (more while it moves), after pivenilya.com/portfolio.
   Wheel, drag, swipe, arrow keys or a click on a side project move it; the centre project opens its case study. */
(() => {
  const wc = document.getElementById('wc');
  if (!wc) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const all = $$('.wc-card', wc), track = $('.wc-track', wc), slot = $('.wc-slot', wc);
  const fil = $('.wc-filters', wc), cap = $('.wc-cap', wc), edges = $$('.wc-edge', wc);
  const nowEl = $('.wc-now', wc), prevEl = $('.wc-prev', wc), nextEl = $('.wc-next', wc), typeEl = $('.wc-type', wc);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FILTERS = { All: /./, Branding: /Branding/, Web: /Website|App Build|Web/, Motion: /Motion|Film|Direction/ };

  let vis = all.slice();
  let G = {};          // layout numbers
  let pos = 0, target = 0, bend = 0;
  let intro = RM ? 1 : 0, introT0 = 0, opened = RM;
  let centre = -1;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // in-out cubic
  const out = t => 1 - Math.pow(1 - t, 3);

  function measure() {
    const vw = innerWidth, vh = innerHeight, m = vw <= 760;
    const W = m ? vw * 0.78 : Math.min(vw * 0.3875, vh * 0.46 * 1.53);
    const H = m ? W / 1.25 : W / 1.53;
    const cy = m ? vh * 0.48 : vh / 2;
    const B0 = m ? vw * 0.05 : vw * 0.05;            // how far the strip bends out at the screen's edge, at rest
    G = { vw, vh, m, W, H, gap: m ? 12 : Math.max(12, vw * 0.0104), cx: vw / 2, cy, T: cy - H / 2,
          B0, Bmax: B0 * 2.4, R: m ? vw * 0.1 : vw * 0.06, r: Math.max(8, W * 0.03) };
    all.forEach(c => { c.style.width = G.W + 'px'; c.style.height = (G.H + 2 * G.Bmax) + 'px'; });
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    fil.style.top = (G.T - (m ? 3.2 : 3.15) * rem) + 'px';
    cap.style.top = (G.T + G.H + (m ? 1.8 : 2.7) * rem) + 'px';
    edges.forEach(e => { e.style.top = (G.T - G.Bmax) + 'px'; e.style.height = (G.H + 2 * G.Bmax) + 'px'; });
  }

  // how far the strip's top (and bottom) edge bends out at screen x: flat in the middle, a quarter-ellipse into each edge
  const bulge = (x, B) => { const u = clamp((Math.abs(x - G.cx) - (G.cx - G.R)) / G.R, 0, 1); return B * (1 - Math.sqrt(1 - u * u)); };

  // the card's outline in its own box: top and bottom follow the bend, rounded corners
  function shape(X, B, r, sc) {
    const { W, H, Bmax } = G, n = 18, f = [];
    const e = xl => bulge(X + xl * sc, B) / sc;       // screen-space bend, in the card's (unscaled) units
    const top = xl => Bmax - e(xl), bot = xl => Bmax + H + e(xl);
    f.push(`M0 ${top(0) + r}`, `Q0 ${top(0)} ${r} ${top(r)}`);
    for (let i = 1; i < n; i++) { const x = r + (W - 2 * r) * i / n; f.push(`L${x.toFixed(1)} ${top(x).toFixed(1)}`); }
    f.push(`L${W - r} ${top(W - r)}`, `Q${W} ${top(W)} ${W} ${top(W) + r}`, `L${W} ${bot(W) - r}`, `Q${W} ${bot(W)} ${W - r} ${bot(W - r)}`);
    for (let i = n - 1; i > 0; i--) { const x = r + (W - 2 * r) * i / n; f.push(`L${x.toFixed(1)} ${bot(x).toFixed(1)}`); }
    f.push(`L${r} ${bot(r)}`, `Q0 ${bot(0)} 0 ${bot(0) - r}`, 'Z');
    return `path('${f.join(' ').replace(/(\d+\.\d{2})\d+/g, '$1')}')`;
  }

  function wrapD(k) { const n = vis.length; let d = ((k - pos) % n + n) % n; if (d > n / 2) d -= n; return d; }

  function caption() {
    const n = vis.length; if (!n) return;
    const c = ((Math.round(pos) % n) + n) % n;
    if (c === centre) return;
    centre = c;
    const set = () => {
      const cur = vis[c];
      nowEl.textContent = cur.dataset.name;
      prevEl.textContent = n > 1 ? vis[(c - 1 + n) % n].dataset.name : '';
      nextEl.textContent = n > 1 ? vis[(c + 1) % n].dataset.name : '';
      typeEl.textContent = [cur.dataset.ind, cur.hasAttribute('data-soon') ? 'Coming soon' : 'View case study ↘'].filter(Boolean).join(' · ');
      cap.classList.remove('flip');
    };
    if (!opened) return set();
    cap.classList.add('flip'); clearTimeout(caption.t); caption.t = setTimeout(set, 160);
  }

  let last = performance.now(), prevPos = 0;
  function frame(now) {
    const dt = Math.max(0.25, Math.min(64, now - last) / 16.67); last = now;
    // intro: 0 → 1 over 1.5s once started
    if (introT0 && intro < 1) { intro = clamp((now - introT0) / 1500, 0, 1); if (intro === 1 && !opened) { opened = true; wc.classList.add('open'); centre = -1; } }
    const eC = ease(clamp(intro / 0.8, 0, 1));               // the first project opening out
    const eS = out(clamp((intro - 0.3) / 0.7, 0, 1));         // the others arriving from the sides

    if (!dragging) pos += (target - pos) * (1 - Math.pow(1 - 0.14, dt));
    const vel = (pos - prevPos) / dt; prevPos = pos;
    const want = RM ? 0 : Math.min(Math.abs(vel) * 9, 1.4) * G.B0;
    bend += (want - bend) * 0.12 * dt;
    const B = G.B0 * eC + bend;
    const mv = Math.min(1, bend / (G.B0 * 1.4)) * eS;   // how hard it's moving: the edge blur strengthens with it
    if (Math.abs(mv - (frame.mv || 0)) > 0.01) { frame.mv = mv; wc.style.setProperty('--wc-move', mv.toFixed(2)); }
    edges.forEach(e => { e.style.visibility = eS > 0 ? '' : 'hidden'; });

    const s = slot.getBoundingClientRect();
    vis.forEach((c, k) => {
      const d = wrapD(k);
      let X = G.cx - G.W / 2 + d * (G.W + G.gap), sc = 1, Y = G.T - G.Bmax, r = G.r;
      if (intro < 1) {
        if (Math.abs(d) < 0.5) {         // the first project grows out of the line's picture
          const s0 = s.width / G.W;
          sc = s0 + (1 - s0) * eC;
          const fx = s.left + s.width / 2, fy = s.top + s.height / 2;
          X = (fx + (G.cx - fx) * eC) - G.W / 2;
          Y = (fy + (G.cy - fy) * eC) - G.H / 2 - G.Bmax;
          r = Math.max(G.r, (s.height * 0.12) / sc * (1 - eC) + G.r * eC);
        } else X += Math.sign(d) * (1 - eS) * G.vw * 0.75;
      }
      const sx = X + G.W / 2 - (G.W / 2) * sc;       // left edge on screen once scaled about the centre
      const onScreen = sx < G.vw + 40 && sx + G.W * sc > -40 && (intro > 0 || Math.abs(d) < 0.5);
      c.classList.toggle('on', onScreen);
      if (!onScreen) return;
      c.style.transform = `translate3d(${X.toFixed(1)}px,${Y.toFixed(1)}px,0) scale(${sc.toFixed(4)})`;
      c.style.clipPath = c.style.webkitClipPath = shape(sx, B, r, sc);
      c.style.zIndex = Math.abs(d) < 0.5 ? 2 : 1;
    });
    if (intro >= 1 || !introT0) caption();
    requestAnimationFrame(frame);
  }

  function start() {
    if (introT0 || RM) return;
    introT0 = performance.now();
    wc.classList.add('go');
  }

  // ---- input ----
  let wheelT = 0;
  addEventListener('wheel', e => {
    e.preventDefault();
    if (!opened) return start();
    const dlt = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    target += dlt * (e.deltaMode === 1 ? 16 : 1) / (G.W + G.gap) * 0.9;
    clearTimeout(wheelT); wheelT = setTimeout(() => { target = Math.round(target); }, 140);
  }, { passive: false });

  // listen on the window rather than capturing the pointer, so a plain click still reaches the card under it
  let dragging = false, downX = 0, downT = 0, moved = false, hist = [];
  track.addEventListener('dragstart', e => e.preventDefault());     // links and pictures would otherwise start a native drag
  track.addEventListener('pointerdown', e => {
    if (!opened) { start(); return; }
    if (e.button > 0) return;
    dragging = true; moved = false; downX = e.clientX; downT = target = pos; hist = [[e.clientX, performance.now()]];
  });
  addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - downX;
    if (Math.abs(dx) > 6) moved = true;
    pos = target = downT - dx / (G.W + G.gap);
    hist.push([e.clientX, performance.now()]); if (hist.length > 6) hist.shift();
  });
  const up = () => {
    if (!dragging) return; dragging = false;
    if (moved) {
      const [a, b] = [hist[0], hist[hist.length - 1]];
      const v = (b[0] - a[0]) / Math.max(16, b[1] - a[1]);          // px per ms
      const proj = (v * 1000 / 1000) * 0.998 / (1 - 0.998) * 0.35;   // where the flick would carry it
      target = Math.round(pos - proj / (G.W + G.gap));
    } else target = Math.round(target);
  };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
  track.addEventListener('click', e => {
    const c = e.target.closest('.wc-card'); if (!c) return;
    if (moved || !opened) { e.preventDefault(); return; }
    const d = wrapD(vis.indexOf(c));
    if (Math.abs(d) > 0.5) { e.preventDefault(); target = Math.round(pos + d); }
    else if (c.hasAttribute('data-soon')) e.preventDefault();
  });
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,[contenteditable]')) return;
    if (!opened) { if (/Arrow|Enter| /.test(e.key)) start(); return; }
    if (e.key === 'ArrowRight') target = Math.round(target) + 1;
    if (e.key === 'ArrowLeft') target = Math.round(target) - 1;
    if (e.key === 'Enter') { const c = vis[centre]; if (c && c.href) location.href = c.href; }
  });
  addEventListener('touchstart', () => { if (!opened) start(); }, { passive: true });

  fil.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.classList.contains('on')) return;
    $$('button', fil).forEach(x => x.classList.toggle('on', x === b));
    wc.classList.add('swap');
    setTimeout(() => {
      const re = FILTERS[b.dataset.f];
      vis = all.filter(c => re.test(c.dataset.cats));
      all.forEach(c => { c.hidden = !vis.includes(c); c.classList.remove('on'); });
      pos = target = prevPos = 0; centre = -1; caption();
      wc.classList.remove('swap');
    }, 200);
  });

  // ---- go ----
  measure();
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(measure, 80); });
  slot.style.visibility = 'hidden';                 // the first project stands in for the line's picture from here
  if (RM) wc.classList.add('open');
  requestAnimationFrame(t => { last = t; frame(t); });
  // play the opening after a beat; any scroll, swipe, click or key plays it straight away
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(start, 2200));
})();
