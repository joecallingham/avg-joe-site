/* Work: the line's picture opens into the first project, the others come in from the sides.
   The strip bends out towards the screen's edges (more while it moves), after pivenilya.com/portfolio.
   Wheel, drag, swipe, arrow keys or a click on a side project move it; the centre project opens its case study. */
(() => {
  const wc = document.getElementById('wc');
  if (!wc) return;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const all = $$('.wc-card', wc), track = $('.wc-track', wc), slot = $('.wc-slot', wc);
  const fil = $('.wc-filters', wc), cap = $('.wc-cap', wc), edges = $$('.wc-edge', wc);
  const mkFrame = c => { const v = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); v.setAttribute('class', 'wc-frame ' + c); v.setAttribute('aria-hidden', 'true'); v.setAttribute('preserveAspectRatio', 'none');
    v.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path')); wc.appendChild(v); return v; };
  const frT = mkFrame('t'), frB = mkFrame('b');
  const reel = $('.wc-reel', wc), srEl = $('.wc-sr', wc), typeEl = $('.wc-type', wc), list = $('.wl', wc);
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    fil.style.top = (G.T - (m ? 4.6 : 4.5) * rem) + 'px';
    cap.style.top = (G.T + G.H + (m ? 3 : 4) * rem) + 'px';
    list.style.top = (G.T - (m ? 4.6 : 4.5) * rem + fil.offsetHeight + (m ? 1.6 : 1.5) * rem) + 'px';
    measureNames();
    edges.forEach(e => { e.style.top = (G.T - G.Bmax) + 'px'; e.style.height = (G.H + 2 * G.Bmax) + 'px'; });
    // the two cream notches that frame the strip: flat across the middle, curving away at the screen's edges along the strip's own bend
    const top = [], bot = [];
    for (let x = 0; x <= vw + 0.5; x += 6) { const b = bulge(x, G.B0); top.push(x.toFixed(1) + ' ' + (G.T - b).toFixed(1)); bot.push(x.toFixed(1) + ' ' + (G.T + G.H + b).toFixed(1)); }
    frT.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh); frB.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);
    frT.firstChild.setAttribute('d', 'M0 -40 L' + vw + ' -40 L' + top.slice().reverse().join(' L') + ' Z');
    frB.firstChild.setAttribute('d', 'M0 ' + (vh + 40) + ' L' + vw + ' ' + (vh + 40) + ' L' + bot.slice().reverse().join(' L') + ' Z');
    frame.eF = -1;
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
      srEl.textContent = cur.dataset.name;
      typeEl.textContent = [cur.dataset.ind, cur.hasAttribute('data-soon') && 'Coming soon'].filter(Boolean).join(' · ');
      cap.classList.remove('flip');
    };
    if (!opened) return set();
    cap.classList.add('flip'); clearTimeout(caption.t); caption.t = setTimeout(set, 160);
  }

  /* ---- the names: one line that slides with the strip. The one in the middle is sharp; the ones either side sit in the blur.
     Each name's place is worked out for whole steps (packed by their real widths) and blended between them as the strip moves. ---- */
  const names = all.map(c => { const s = document.createElement('span'); s.className = 'wc-nm'; s.textContent = c.dataset.name; reel.appendChild(s); return s; });
  let widths = [], gapPx = 0, lay = new Map();
  function measureNames() {
    widths = names.map(s => s.offsetWidth); gapPx = parseFloat(getComputedStyle(reel).fontSize) * 1.1; lay.clear();
  }
  function layout(c) {                       // x of each visible name's centre when name c is in the middle
    if (lay.has(c)) return lay.get(c);
    const n = vis.length, x = new Array(n).fill(0), w = k => widths[all.indexOf(vis[k])];
    const ci = ((c % n) + n) % n;
    let r = w(ci) / 2, l = -w(ci) / 2;
    for (let j = 1; j <= n / 2; j++) {
      const kr = (ci + j) % n; x[kr] = r + gapPx + w(kr) / 2; r = x[kr] + w(kr) / 2;
      const kl = (ci - j + n) % n; if (j < n / 2 || n % 2) { x[kl] = l - gapPx - w(kl) / 2; l = x[kl] - w(kl) / 2; }
    }
    lay.set(c, x); return x;
  }
  let stepPx = 200;
  function names_() {
    const n = vis.length; if (!n || !widths.length) return;
    const fl = Math.floor(pos), f = pos - fl, A = layout(fl), Bx = layout(fl + 1), mid = reel.clientWidth / 2;
    stepPx = Math.max(60, Math.abs(Bx[((fl % n) + n) % n] - A[((fl % n) + n) % n]) || 200);
    all.forEach((c, i) => {
      const s = names[i], k = vis.indexOf(c);
      if (k < 0) { s.style.visibility = 'hidden'; return; }
      const a = Math.abs(wrapD(k));
      if (a > 1.9) { s.style.visibility = 'hidden'; return; }
      const x = A[k] + (Bx[k] - A[k]) * f;
      const op = a <= 1 ? 1 - 0.65 * a : Math.max(0, 0.35 * (1 - (a - 1) / 0.8));
      s.style.visibility = '';
      s.style.transform = `translate3d(${(mid + x - widths[i] / 2).toFixed(1)}px,0,0)`;
      s.style.opacity = op.toFixed(3);
      s.style.filter = RM ? '' : `blur(${(2.6 * Math.min(a, 1.4)).toFixed(2)}px)`;
    });
  }

  let last = performance.now(), prevPos = 0;
  function frame(now) {
    const dt = Math.max(0.25, Math.min(64, now - last) / 16.67); last = now;
    // intro: 0 → 1 over 1.5s once started
    if (introT0 && intro < 1) { intro = clamp((now - introT0) / 2600, 0, 1); if (intro === 1 && !opened) { opened = true; wc.classList.add('open'); centre = -1; } }   // unhurried
    const eC = ease(clamp(intro / 0.8, 0, 1));               // the first project opening out
    const eS = out(clamp((intro - 0.3) / 0.7, 0, 1));         // the others arriving from the sides

    if (!dragging) pos += (target - pos) * (1 - Math.pow(1 - 0.14, dt));
    const vel = (pos - prevPos) / dt; prevPos = pos;
    const want = 0;   // the frame is fixed now, so the strip no longer bends as it moves
    bend += (want - bend) * 0.12 * dt;
    const B = G.B0 * eC + bend;
    const mv = Math.min(1, bend / (G.B0 * 1.4)) * eS;   // how hard it's moving: the edge blur strengthens with it
    if (Math.abs(mv - (frame.mv || 0)) > 0.01) { frame.mv = mv; wc.style.setProperty('--wc-move', mv.toFixed(2)); }
    edges.forEach(e => { e.style.visibility = 'hidden'; });
    // the frame: the nav's notch grows sideways and up into the bottom shape while a matching notch comes down from the top
    const eF = ease(clamp((intro - 0.3) / 0.7, 0, 1));
    if (frT && eF !== frame.eF && (Math.abs(eF - (frame.eF ?? -1)) > 0.0005 || eF === 1 || eF === 0)) {
      frame.eF = eF;
      frT.style.transform = 'translate3d(0,' + (-(G.T + G.Bmax + 20) * (1 - eF)).toFixed(1) + 'px,0)';
      const n = document.getElementById('nav'), nb = n ? n.getBoundingClientRect() : { width: G.vw * 0.25, height: 50 }, bh = G.vh - (G.T + G.H);
      const fx = nb.width / G.vw, fy = Math.min(1, nb.height / bh);
      frB.style.transform = 'scale(' + (fx + (1 - fx) * eF).toFixed(4) + ',' + (fy + (1 - fy) * eF).toFixed(4) + ')';
      frT.style.visibility = frB.style.visibility = eF > 0 ? 'visible' : 'hidden';
    }

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
      let clip;
      if (frame.eF > 0 && frame.eF < 1) {   // the pictures grow taller, then the two notches crop them into the frame
        const g = ease(clamp(frame.eF * 2.5, 0, 1)), ins = (G.Bmax - 2) * (1 - g);
        clip = 'inset(' + ins.toFixed(1) + 'px 0 ' + ins.toFixed(1) + 'px 0 round ' + r.toFixed(1) + 'px)';
      } else clip = shape(sx, B, r, sc);
      c.style.clipPath = c.style.webkitClipPath = clip;
      c.style.zIndex = Math.abs(d) < 0.5 ? 2 : 1;
    });
    if (intro >= 1 || !introT0) caption();
    names_();
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
    if (listOn) return;                  // the list scrolls as a page does
    e.preventDefault();
    if (!opened) return start();
    const dlt = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    target += dlt * (e.deltaMode === 1 ? 16 : 1) / (G.W + G.gap) * 0.9;
    clearTimeout(wheelT); wheelT = setTimeout(() => { target = Math.round(target); }, 140);
  }, { passive: false });

  // listen on the window rather than capturing the pointer, so a plain click still reaches the card under it
  let dragging = false, downX = 0, downT = 0, moved = false, hist = [], per = 1, listOn = false;
  track.addEventListener('dragstart', e => e.preventDefault());     // links and pictures would otherwise start a native drag
  const down = from => e => {
    if (!opened) { start(); return; }
    if (e.button > 0 || listOn) return;
    per = from === reel ? stepPx : G.W + G.gap;                      // the names follow the thumb as the pictures do
    dragging = true; moved = false; downX = e.clientX; downT = target = pos; hist = [[e.clientX, performance.now()]];
  };
  track.addEventListener('pointerdown', down(track));
  reel.addEventListener('pointerdown', down(reel));
  addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - downX;
    if (Math.abs(dx) > 6) moved = true;
    pos = target = downT - dx / per;
    hist.push([e.clientX, performance.now()]); if (hist.length > 6) hist.shift();
  });
  const up = () => {
    if (!dragging) return; dragging = false;
    if (moved) {
      const [a, b] = [hist[0], hist[hist.length - 1]];
      const v = (b[0] - a[0]) / Math.max(16, b[1] - a[1]);          // px per ms
      const proj = (v * 1000 / 1000) * 0.998 / (1 - 0.998) * 0.35;   // where the flick would carry it
      target = Math.round(pos - proj / per);
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
  reel.addEventListener('click', e => {
    const s = e.target.closest('.wc-nm'); if (!s || moved || !opened) return;
    const c = all[names.indexOf(s)], d = wrapD(vis.indexOf(c));
    if (Math.abs(d) > 0.5) target = Math.round(pos + d);
    else if (c.href) location.href = c.href;
  });
  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,[contenteditable]')) return;
    if (listOn) return;
    if (!opened) { if (/Arrow|Enter| /.test(e.key)) start(); return; }
    if (e.key === 'ArrowRight') target = Math.round(target) + 1;
    if (e.key === 'ArrowLeft') target = Math.round(target) - 1;
    if (e.key === 'Enter') { const c = vis[centre]; if (c && c.href) location.href = c.href; }
  });
  addEventListener('touchstart', () => { if (!opened) start(); }, { passive: true });

  // ---- Grid / List: the list is every project as a row, like the clients on Information ----
  list.innerHTML = all.map((c, i) => {
    const soon = c.hasAttribute('data-soon'), tag = soon ? 'div' : 'a', href = soon ? '' : ` href="${c.getAttribute('href')}"`;
    return `<${tag} class="wl-row${soon ? ' soon' : ''}"${href}><span class="wl-name"><span class="wl-no">${String(i + 1).padStart(2, '0')}</span>${c.dataset.name}</span>`
      + `<span class="wl-ind">${c.dataset.ind || ''}</span><span class="wl-more">${soon ? 'Coming soon' : '↘'}</span></${tag}>`;
  }).join('');
  fil.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || b.classList.contains('on')) return;
    $$('button', fil).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    listOn = b.dataset.v === 'list';
    if (listOn) { list.hidden = false; list.scrollTop = 0; requestAnimationFrame(() => wc.classList.add('list')); }
    else { wc.classList.remove('list'); setTimeout(() => { if (!listOn) list.hidden = true; }, 450); }
  });

  // ---- go ----
  measure();
  let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(measure, 80); });
  document.fonts?.ready.then(measureNames);
  slot.style.visibility = 'hidden';                 // the first project stands in for the line's picture from here
  if (RM) wc.classList.add('open');
  requestAnimationFrame(t => { last = t; frame(t); });
  // play the opening after a beat; any scroll, swipe, click or key plays it straight away
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(start, 2200));
})();
