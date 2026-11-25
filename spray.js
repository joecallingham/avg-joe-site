/* Spray paint on the site.
   Every sprayed picture is a flat image baked once, offline, in the halation spray Joe signed off (img/spray/, made by
   the bake page in the session scratchpad): placeholders, What We Do, How we work, Craft, the AI gradient, the wheel's
   blue, and the marks on photo edges. Only the statement's smiley is worked out in the page, because it sprays on over
   the text as you arrive. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* work queued for the browser's idle moments, one piece at a time, so it never freezes the page */
  const jobs = []; let pumping = false;
  const idle = window.requestIdleCallback ? f => requestIdleCallback(f, { timeout: 400 }) : f => setTimeout(f, 16);
  const later = fn => { jobs.push(fn); if (!pumping) { pumping = true; idle(pump); } };
  const pump = () => { const fn = jobs.shift(); if (fn) fn(); if (jobs.length) idle(pump); else pumping = false; };

  /* the pictures drawn in SVG (What We Do, How we work, Craft) hold their image as data-href until the section is near,
     so the page does not fetch them all up front; the copy of Digital that flies into step 01 is picked up too */
  const lazy = [...document.querySelectorAll('image[data-href]')].map(im => im.closest('.wd-sec, .hv, section') || im.ownerSVGElement);
  const load = () => document.querySelectorAll('image[data-href]').forEach(im => { im.setAttribute('href', im.dataset.href); im.removeAttribute('data-href'); });
  if (lazy.length) {
    if (!('IntersectionObserver' in window)) load();
    else { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '150% 0px' }); [...new Set(lazy)].forEach(el => el && io.observe(el)); }
  }

  /* the footer: one sprayed doodle, picked at random each visit, between Extra and Ordinary */
  const fm = document.querySelector('.foot-mark'), fa = fm && fm.querySelector('.fm-avg'), fj = fm && fm.querySelector('.fm-joe');
  if (fa && fj) {
    const im = document.createElement('img'); im.className = 'foot-draw'; im.alt = ''; im.setAttribute('aria-hidden', 'true'); im.loading = 'lazy'; im.decoding = 'async';
    im.src = '/img/spray/ft-' + (Math.random() * 18 | 0) + '.webp'; fm.appendChild(im);
    const place = () => {   /* from the layout, so it holds while the footer slides in */
      const l = fa.offsetLeft + fa.offsetWidth, gap = Math.max(fj.offsetLeft - l, 0), w = Math.max(gap * 1.6, fm.clientWidth * 0.36), h = w * 0.625;
      im.style.width = w + 'px'; im.style.height = h + 'px'; im.style.left = (l + gap / 2 - w / 2) + 'px'; im.style.top = (fa.offsetTop + fa.offsetHeight * 0.5 - h / 2) + 'px';
    };
    place(); addEventListener('resize', place); if (document.fonts) document.fonts.ready.then(place);
  }

  /* odd bits of photography get a sprayed mark off one corner: a few at random each visit, the 620 picture always in lime */
  const imgs = [...document.querySelectorAll('img')].filter(img => {
    if (img.closest('.logo, #intro, .wc-slot, .wd-pic, header, nav') || img.classList.contains('spray') || /swallow|portrait|cow|mushroom/.test(img.src)) return false;
    const p = img.parentElement, ps = p && getComputedStyle(p).position;
    return p && ps !== 'static' && (getComputedStyle(img).position === 'absolute' || (img.offsetWidth >= p.clientWidth - 2 && img.offsetHeight >= p.clientHeight - 2));
  });
  imgs.forEach(img => {
    const lime = /620-clean/.test(img.src);
    if (!lime && Math.random() > 0.28) return;
    const o = document.createElement('img'); o.className = 'photo-spray'; o.alt = ''; o.setAttribute('aria-hidden', 'true'); o.loading = 'lazy'; o.decoding = 'async';
    o.src = '/img/spray/ov-' + (lime ? 4 : Math.random() * 4 | 0) + '.webp';
    if (Math.random() < 0.5) o.style.transform = 'scaleX(-1)';
    img.after(o);
  });

  /* ---------- the statement: a smiley sprayed over it, with halation ----------
     Signed off by Joe in an off-site test (25 Nov 2026). Each stroke thickens and thins, fades and goes in and out of focus;
     a glow in a close colour blooms off it in a few short stretches and bleeds into its edge; all in particles finer than a
     screen pixel (worked out at twice the screen's resolution, then drawn down). Worked out in idle slices before it scrolls
     in, then revealed along each stroke in the order it was sprayed. */
  const PAIRS = [['#ff5a12', '#ffab85'], ['#ff3f8e', '#ffa3b8'], ['#1f3dff', '#7cc3ff'], ['#1f3dff', '#8a4dff'], ['#8fdc2a', '#2fae55'], ['#8b45ff', '#b0559e']];   /* orange/peach, pink/soft pink, blue/light blue, blue/purple, lime/green, purple/plum */
  function smile(cv) {
    const wrap = cv.parentElement, tb = wrap.querySelector('.ca-state').getBoundingClientRect(), box = cv.getBoundingClientRect();
    const d = Math.min(devicePixelRatio || 1, 2), q = d * 2;   /* d: the canvas's pixels per CSS pixel; q: the working resolution */
    cv.width = Math.round(box.width * d); cv.height = Math.round(box.height * d);
    const sz = Math.min(tb.height * 1.55, tb.width * 0.42), mx = tb.left + tb.width / 2 - box.left, my = tb.top + tb.height / 2 - box.top + sz * 0.07;
    let x0 = mx - sz * 1.25, y0 = my - sz * 1.0, rw = sz * 2.5, rh = sz * 2.05;   /* the patch the smiley and its glow sit in (CSS px) */
    const nvEl = wrap.querySelector('.ca-nv'), nv = nvEl && nvEl.getBoundingClientRect();   /* and a strike through "never", so the patch reaches it too */
    let nL, nR, nM, nH;
    if (nv && nv.width) {
      /* measured from the layout, not the screen: the lines may still be sliding in as this runs */
      const rel = el => { let x = 0, y = 0; while (el && el !== wrap) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return [x, y]; };
      const [ex, ey] = rel(nvEl), [cx0, cy0] = rel(cv);
      nL = ex - cx0; nR = nL + nvEl.offsetWidth; nH = nvEl.offsetHeight; nM = ey - cy0 + nH * 0.52;
      const p = nH * 1.1, ax = Math.max(0, Math.min(x0, nL - p)), ay = Math.max(0, Math.min(y0, nM - p)), bx = Math.min(box.width, Math.max(x0 + rw, nR + p)), by = Math.min(box.height, Math.max(y0 + rh, nM + p));
      x0 = ax; y0 = ay; rw = bx - ax; rh = by - ay;
    }
    const W = Math.round(rw * q), H = Math.round(rh * q), K = sz * q / 210;   /* K: working pixels per pixel of the test, where sz was 210 */
    const [coreHex, haloHex] = PAIRS[Math.random() * PAIRS.length | 0], tilt = (0.15 + Math.random() * 0.12) * (Math.random() < 0.5 ? -1 : 1);
    const co = Math.cos(tilt), si = Math.sin(tilt), cx = (mx - x0) * q, cy = (my - y0) * q, SZ = sz * q;
    const F = (u, v) => [cx + (u * co - v * si) * SZ, cy + (u * si + v * co) * SZ];
    const along = pts => { const P = pts.map(([u, v]) => F(u, v)), out = [];
      for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / (1.5 * K)); for (let j = 0; j < n; j++) out.push([ax + (bx - ax) * j / n, ay + (by - ay) * j / n]); }
      return out; };
    const sm = pts => pts.map((b, k) => { const a = pts[Math.max(0, k - 1)], c = pts[Math.min(pts.length - 1, k + 1)]; return [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4]; });
    const j = () => (Math.random() - 0.5) * 0.04;   /* no two smileys quite the same */
    const line = P => { const out = []; for (let k = 0; k < P.length - 1; k++) { const [ax, ay] = P[k], [bx, by] = P[k + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / (1.5 * K)); for (let i = 0; i < n; i++) out.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n]); } return out; };
    const strokes = [along([[-0.32 + j(), -0.52], [-0.31 + j(), -0.35], [-0.3 + j(), -0.17]]), along([[0.32 + j(), -0.52], [0.33 + j(), -0.35], [0.34 + j(), -0.17]]),
                     along(sm(sm([[-0.64, 0.04 + j()], [-0.48, 0.3], [-0.25, 0.5 + j()], [0.02, 0.58], [0.28, 0.5 + j()], [0.5, 0.3], [0.66, 0.0 + j()]])))];
    if (nL !== undefined) {   /* the strike: one bold pass through the word, a touch uphill, running past each end */
      const w = nR - nL, P = (x, y) => [(x - x0) * q, (y - y0) * q], dy = (Math.random() - 0.5) * nH * 0.12;
      const st = line(sm(sm([P(nL - w * 0.14, nM + nH * 0.12 + dy), P(nL + w * 0.3, nM + nH * 0.04), P(nL + w * 0.7, nM - nH * 0.04 + dy), P(nR + w * 0.14, nM - nH * 0.14)])));
      st.firm = true; st.scale = nH * 0.27 * q / (21.45 * K); strokes.push(st);
    }
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const wob = () => { const a = Math.random() * 6, b = Math.random() * 6, c = Math.random() * 6; return t => 0.5 + 0.28 * Math.sin(t * 0.009 + a) + 0.16 * Math.sin(t * 0.027 + b) + 0.08 * Math.sin(t * 0.07 + c); };
    const sharp = mk(), soft = mk(), gm = mk(), sg = sharp.getContext('2d'), fg = soft.getContext('2d'), gg = gm.getContext('2d'), reach = [];
    [sg, fg, gg].forEach(x => x.fillStyle = '#000');
    let t0 = 0;
    for (const s of strokes) {
      const width = wob(), dense = wob(), glow = wob(); let big = 0;
      s.forEach(([x, y], k) => {
        const t = t0 + k * 1.5, end = Math.min(1, k / 18, (s.length - k) / 18);
        const r = 26 * K * (s.firm ? 0.8 + 0.35 * width(t) : 0.45 + 0.75 * width(t)) * (0.88 + 0.12 * end) * (s.scale || 1);   /* thicker and thinner along it, round at the ends */
        const a = Math.max(s.firm ? 0.55 : 0.03, Math.min(1, 1.3 * dense(t) - 0.25)) * (0.7 + 0.3 * end);   /* denser and faded along it */
        for (const x2 of [sg, fg]) { x2.globalAlpha = a * 0.24; x2.beginPath(); x2.arc(x, y, r, 0, 6.283); x2.fill(); }
        const gw = Math.max(0, glow(t) * 1.7 - 0.85) ** 1.6;   /* the glow blooms in a few short stretches, not evenly */
        if (gw > 0.01) { gg.globalAlpha = Math.min(1, gw) * 0.28; gg.beginPath(); gg.arc(x + (Math.random() - 0.5) * 6 * K, y + (Math.random() - 0.5) * 6 * K, r * 0.95, 0, 6.283); gg.fill(); }
        if (r > big) big = r;
      });
      reach.push(big);
      t0 += s.length * 1.5 + 400;
    }
    const blur = (c, px) => { const o = mk(), x = o.getContext('2d'); x.filter = 'blur(' + px * K + 'px)'; x.drawImage(c, 0, 0); return o; };
    let S, Sf, Gm, out, o, fv, fw, fq, row = 0;
    const core = [1, 3, 5].map(i => parseInt(coreHex.slice(i, i + 2), 16)), halo = [1, 3, 5].map(i => parseInt(haloHex.slice(i, i + 2), 16));
    const prep = () => {
      S = blur(sharp, 1.5).getContext('2d').getImageData(0, 0, W, H).data;
      Sf = blur(soft, 13).getContext('2d').getImageData(0, 0, W, H).data;
      const ga = blur(gm, 16), gx = ga.getContext('2d'); gx.globalAlpha = 0.8; gx.drawImage(blur(gm, 7), 0, 0); Gm = gx.getImageData(0, 0, W, H).data;
      fq = 130 * K; fw = Math.ceil(W / fq) + 2; fv = Array.from({ length: fw * (Math.ceil(H / fq) + 2) }, Math.random);
      out = new ImageData(W, H); o = out.data;
      later(slice);
    };
    const focus = (x, y) => { const fx = x / fq, ix = fx | 0, tx = fx - ix, fy = y / fq, iy = fy | 0, ty = fy - iy, i = iy * fw + ix, a = tx * tx * (3 - 2 * tx), b = ty * ty * (3 - 2 * ty);
      return (fv[i] * (1 - a) + fv[i + 1] * a) * (1 - b) + (fv[i + fw] * (1 - a) + fv[i + fw + 1] * a) * b; };
    const slice = () => {   /* the particles, a band of rows per idle moment so the page never stalls */
      const end = Math.min(H, row + Math.max(40, Math.round(320000 / W)));
      for (let y = row; y < end; y++) for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4; if (S[i + 3] < 2 && Sf[i + 3] < 2 && Gm[i + 3] < 2) continue;
        const f = focus(x, y) ** 1.3, body = Math.min(1, (S[i + 3] / 255 * f + Sf[i + 3] / 255 * (1 - f)) * 1.05), glw = Math.min(1, Gm[i + 3] / 255 * 1.2);
        const pb = Math.random() < body ** 1.15, pg = Math.random() < glw * 0.95;   /* each particle: paint or not, by how much paint is there */
        if (!pb && !pg) continue;
        let r, g2, b, a;
        if (pb) { const bl = Math.min(0.85, glw * (1 - body) * 1.6);   /* the stroke's edge takes the glow's colour where the glow is strong */
          r = core[0] + (halo[0] - core[0]) * bl; g2 = core[1] + (halo[1] - core[1]) * bl; b = core[2] + (halo[2] - core[2]) * bl; a = 0.9 + Math.random() * 0.1;
        } else { r = halo[0]; g2 = halo[1]; b = halo[2]; a = 0.55 + 0.45 * glw; }
        const sh = 0.9 + Math.random() * 0.2;
        o[i] = r * sh; o[i + 1] = g2 * sh; o[i + 2] = b * sh; o[i + 3] = a * 255;
      }
      row = end;
      if (row < H) return later(slice);
      const fin = mk(), fx = fin.getContext('2d'); fx.putImageData(out, 0, 0);
      fx.fillStyle = '#fff'; for (let k = 0; k < 30; k++) { fx.globalAlpha = 0.4 + Math.random() * 0.5; fx.beginPath(); fx.arc(cx + (Math.random() - 0.5) * 450 * K, cy + (Math.random() - 0.5) * 300 * K, (0.4 + Math.random() * 0.7) * K, 0, 6.28); fx.fill(); }
      S = Sf = Gm = out = o = null;
      ready = fin; if (seen) reveal();
    };
    let ready = null, seen = false, shown = false;
    const g = cv.getContext('2d'), put = () => { g.imageSmoothingQuality = 'high'; g.drawImage(ready, x0 * d, y0 * d, rw * d, rh * d); };
    const reveal = () => {   /* built up as paint is: a few quick passes along each stroke, a wide mist first, then denser,
                                narrower coats, each through a soft round nozzle so there is never a hard edge; eyes first */
      if (shown) return; shown = true;
      if (RM) return put();
      const m = mk(), mg = m.getContext('2d'), tmp = mk(), tg = tmp.getContext('2d');
      const nz = document.createElement('canvas'); nz.width = nz.height = 64;   /* the nozzle: dense in the middle, fading to nothing */
      { const x = nz.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); }
      const PASS = [[2.7, 0.22, 0.4], [2.0, 0.5, 0.33], [1.55, 0.85, 0.27]];   /* [nozzle width x stroke, coverage the pass adds, share of the time] */
      const time = [560, 560, 1400], gap = 2;
      let si = 0, pi = 0, st = 0, done = 0, fade = 0;
      const draw = () => { tg.globalCompositeOperation = 'copy'; tg.drawImage(ready, 0, 0); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(m, 0, 0);
        g.clearRect(0, 0, cv.width, cv.height); g.imageSmoothingQuality = 'high'; g.drawImage(tmp, x0 * d, y0 * d, rw * d, rh * d); };
      const step = now => {
        if (si >= strokes.length) {   /* last, settle into the finished picture */
          if (!fade) fade = now; const f = Math.min(1, (now - fade) / 450);
          draw(); g.globalAlpha = f * f; g.drawImage(ready, x0 * d, y0 * d, rw * d, rh * d); g.globalAlpha = 1;
          return f < 1 ? requestAnimationFrame(step) : (g.clearRect(0, 0, cv.width, cv.height), put());
        }
        if (!st) st = now;
        const s = strokes[si], [wx, cover, share] = PASS[pi], dur = (time[si] || 700) * share, p = Math.min(1, (now - st) / dur), e = p * p * (1.6 - 0.6 * p);
        const back = pi % 2 === 1, n = s.length - 1, upto = Math.round(e * n), rad = reach[si] * wx, size = rad * 2;
        const over = Math.max(1, size / (gap * 1.5 * K) * 0.6), a = 1 - Math.pow(1 - cover, 1 / over);   /* so each pass adds about its coverage, however many dabs overlap */
        mg.globalAlpha = a;
        for (; done <= upto; done += gap) { const [x, y] = s[back ? n - done : done]; mg.drawImage(nz, x - rad, y - rad, size, size); }
        draw();
        if (p < 1) return requestAnimationFrame(step);
        st = 0; done = 0; pi++;
        if (pi < PASS.length) return requestAnimationFrame(step);
        pi = 0; si++;
        if (si < strokes.length) return setTimeout(() => requestAnimationFrame(step), 120 + Math.random() * 100);
        requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    later(prep);
    return () => { seen = true; if (ready) reveal(); };
  }
  document.querySelectorAll('canvas.spray-over').forEach(cv => {   /* worked out before it scrolls in; sprayed on once it is in view */
    if (!('IntersectionObserver' in window)) return;
    let go = null;
    const near = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting && cv.clientWidth)) { near.disconnect(); (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { go = smile(cv); if (inView) go(); }); } }, { rootMargin: '80% 0px' });
    let inView = false;
    const vis = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { vis.disconnect(); inView = true; setTimeout(() => go && go(), RM ? 0 : 500); } }, { threshold: 0.4 });
    near.observe(cv); vis.observe(cv);
  });

})();
