/* Spray paint on the site.
   Every sprayed picture is a flat image baked once, offline, in the halation spray Joe signed off (img/spray/, made by
   the bake page in the session scratchpad): placeholders, What We Do, How we work, Craft, the AI gradient, the wheel's
   blue, and the marks on photo edges. The doodles over the statement and in the footer
   are baked too, with their stroke paths (ft.json), and spray on along those paths as you arrive; only the strike
   through "never" is worked out in the page. */
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

  /* ---------- spraying on: a finished picture revealed along its strokes, built up as paint is: a wide mist first, then
     denser, narrower coats through a soft round nozzle, so there is never a hard edge. ready: the finished picture;
     strokes: [{r, p:[[x,y]...]}] in its pixels; blit(picture): draws a frame where it belongs. ---------- */
  const NZ = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.45, 'rgba(0,0,0,.65)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return c; })();
  const PASS = [[3.8, 0.55, 0.38], [2.7, 0.7, 0.32], [1.8, 0.92, 0.3]];   /* wide enough that the glow round each stroke builds with it, not after */   /* [nozzle width x stroke, coverage the pass adds, share of the time] */
  function sprayOn(ready, strokes, blit, done) {
    if (RM) { blit(ready); return done && done(); }
    const W = ready.width, H = ready.height, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const m = mk(), mg = m.getContext('2d'), tmp = mk(), tg = tmp.getContext('2d');
    /* each stroke as dabs a quarter of its width apart */
    const S = strokes.map(({ r, p }) => { const out = [], step = Math.max(1, r * 0.25);
      for (let i = 0; i < p.length - 1; i++) { const [ax, ay] = p[i], [bx, by] = p[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / step)); for (let k = 0; k < n; k++) out.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n]); }
      out.push(p[p.length - 1]); return { r, p: out, t: Math.min(620, Math.max(220, out.length * step / W * 1500)) }; });
    let si = 0, pi = 0, st = 0, done2 = 0, fade = 0, m0 = null;
    const frame = () => { tg.globalCompositeOperation = 'copy'; tg.drawImage(ready, 0, 0); tg.globalCompositeOperation = 'destination-in'; tg.drawImage(m, 0, 0); blit(tmp); };
    const step = now => {
      if (si >= S.length) {   /* last, settle into the finished picture */
        if (!fade) { fade = now; m0 = mk(); m0.getContext('2d').drawImage(m, 0, 0); }
        const f = Math.min(1, (now - fade) / 200);   /* the last of the mask fills in: never more paint than the finished picture */
        mg.globalAlpha = 1; mg.globalCompositeOperation = 'copy'; mg.drawImage(m0, 0, 0); mg.globalCompositeOperation = 'source-over'; mg.globalAlpha = f; mg.fillStyle = '#000'; mg.fillRect(0, 0, W, H); mg.globalAlpha = 1;
        frame();
        if (f < 1) return requestAnimationFrame(step);
        blit(ready); return done && done();
      }
      if (!st) st = now;
      const s = S[si], [wx, cover, share] = PASS[pi], p = Math.min(1, (now - st) / (s.t * share)), e = p * p * (1.6 - 0.6 * p);
      const back = pi % 2 === 1, n = s.p.length - 1, upto = Math.round(e * n), rad = s.r * wx, size = rad * 2;
      mg.globalAlpha = 1 - Math.pow(1 - cover, 1 / Math.max(1, size / (s.r * 0.25) * 0.6));   /* so each pass adds about its coverage, however many dabs overlap */
      for (; done2 <= upto; done2++) { const [x, y] = s.p[back ? n - done2 : done2]; mg.drawImage(NZ, x - rad, y - rad, size, size); }
      frame();
      if (p < 1) return requestAnimationFrame(step);
      st = 0; done2 = 0; pi++;
      if (pi < PASS.length) return requestAnimationFrame(step);
      pi = 0; si++;
      if (si < S.length) return setTimeout(() => requestAnimationFrame(step), 50 + Math.random() * 60);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  /* the doodles: 18 baked pictures (1200 x 750) and their stroke paths, as fractions of the picture */
  let FT = null; const doodles = () => FT || (FT = fetch('/img/spray/ft.json?v=2').then(r => r.json()).catch(() => null));
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const pickD = (() => { const used = []; return () => { let i; do i = Math.random() * 18 | 0; while (used.includes(i) && used.length < 18); used.push(i); return i; }; })();
  const pathsFor = (meta, w, h) => meta.strokes.map(({ r, p }) => ({ r: r * w, p: p.map(([x, y]) => [x * w, y * h]) }));
  const onView = (el, fn, thr = 0.35) => { if (!('IntersectionObserver' in window)) return fn(); const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold: thr }); io.observe(el); };

  /* ---------- the footer: a doodle between Extra and Ordinary, sprayed on as the footer comes up ---------- */
  const fm = document.querySelector('.foot-mark'), fa = fm && fm.querySelector('.fm-avg'), fj = fm && fm.querySelector('.fm-joe');
  if (fa && fj) {
    const cv = document.createElement('canvas'); cv.className = 'foot-draw'; cv.setAttribute('aria-hidden', 'true'); fm.appendChild(cv);
    const di = pickD(); let pic = null, shown = false;
    const place = () => {   /* from the layout, so it holds while the footer slides in */
      const l = fa.offsetLeft + fa.offsetWidth, gap = Math.max(fj.offsetLeft - l, 0), w = Math.max(gap * 1.6, fm.clientWidth * 0.36), h = w * 0.625, d = Math.min(devicePixelRatio || 1, 2);
      cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.style.left = (l + gap / 2 - w / 2) + 'px'; cv.style.top = (fa.offsetTop + fa.offsetHeight * 0.5 - h / 2) + 'px';
      const W = Math.round(w * d), H = Math.round(h * d); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; if (shown && pic) cv.getContext('2d').drawImage(pic, 0, 0, W, H); }
    };
    place(); addEventListener('resize', place); if (document.fonts) document.fonts.ready.then(place);
    const near = new IntersectionObserver(es => { if (!es.some(e => e.isIntersecting)) return; near.disconnect();
      Promise.all([doodles(), loadImg('/img/spray/ft-' + di + '.webp?v=2')]).then(([meta, img]) => { pic = img;
        onView(cv, () => { const g = cv.getContext('2d'), go = () => sprayOn(img, meta ? pathsFor(meta[di], img.width, img.height) : [], f => { g.clearRect(0, 0, cv.width, cv.height); g.drawImage(f, 0, 0, cv.width, cv.height); }, () => { shown = true; });
          if (!meta) { g.drawImage(img, 0, 0, cv.width, cv.height); shown = true; } else go(); }, 0.5);
      }).catch(() => {}); }, { rootMargin: '60% 0px' });
    near.observe(fm);
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

  /* ---------- the statement: a doodle sprayed over it, then a strike through "never" in another colour ----------
     The strike is worked out in the page in the halation spray (signed off 25 Nov 2026): it thickens and thins, fades and
     goes in and out of focus, a close-colour glow blooms off it in short stretches, in particles finer than a pixel. */
  const PAIRS = [['#ff5a12', '#ffab85'], ['#ff3f8e', '#ffa3b8'], ['#1f3dff', '#7cc3ff'], ['#1f3dff', '#8a4dff'], ['#8fdc2a', '#2fae55'], ['#8b45ff', '#b0559e']];
  const hue = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), M = Math.max(r, g, b), n = Math.min(r, g, b), c = M - n; if (!c) return 0;
    const x = M === r ? ((g - b) / c) % 6 : M === g ? (b - r) / c + 2 : (r - g) / c + 4; return (x * 60 + 360) % 360; };
  /* the strike, worked out in idle slices: returns {ready, stroke, rect} via cb */
  function strike(cv, wrap, pair, cb) {
    const nvEl = wrap.querySelector('.ca-nv'); if (!nvEl || !nvEl.offsetWidth) return cb(null);
    const rel = el => { let x = 0, y = 0; while (el && el !== wrap) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return [x, y]; };   /* from the layout: the lines may still be sliding in */
    const [ex, ey] = rel(nvEl), [cx0, cy0] = rel(cv), nL = ex - cx0, nW = nvEl.offsetWidth, nH = nvEl.offsetHeight, nM = ey - cy0 + nH * 0.52;
    const d = Math.min(devicePixelRatio || 1, 2), q = d * 2, pad = nH * 1.1, x0 = nL - nW * 0.14 - pad, y0 = nM - pad, rw = nW * 1.28 + pad * 2, rh = pad * 2;
    const W = Math.round(rw * q), H = Math.round(rh * q), R = nH * 0.27 * q, K = R / 21.45;
    const P = (x, y) => [(x - x0) * q, (y - y0) * q], dy = (Math.random() - 0.5) * nH * 0.12;
    const key = [P(nL - nW * 0.14, nM + nH * 0.12 + dy), P(nL + nW * 0.3, nM + nH * 0.04), P(nL + nW * 0.7, nM - nH * 0.04 + dy), P(nL + nW * 1.14, nM - nH * 0.14)];
    const sm = pts => pts.map((b, k) => { const a = pts[Math.max(0, k - 1)], c = pts[Math.min(pts.length - 1, k + 1)]; return [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4]; });
    const path = []; { const k2 = sm(sm(key)); for (let i = 0; i < k2.length - 1; i++) { const [ax, ay] = k2[i], [bx, by] = k2[i + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay) / (1.5 * K)); for (let j = 0; j < n; j++) path.push([ax + (bx - ax) * j / n, ay + (by - ay) * j / n]); } }
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    const wob = () => { const a = Math.random() * 6, b = Math.random() * 6, c = Math.random() * 6; return t => 0.5 + 0.28 * Math.sin(t * 0.009 + a) + 0.16 * Math.sin(t * 0.027 + b) + 0.08 * Math.sin(t * 0.07 + c); };
    const sharp = mk(), soft = mk(), gm = mk(), sg = sharp.getContext('2d'), fg = soft.getContext('2d'), gg = gm.getContext('2d'), width = wob(), dense = wob(), glow = wob(), bloomAt = 0.2 + Math.random() * 0.6;
    [sg, fg, gg].forEach(x => x.fillStyle = '#000');
    path.forEach(([x, y], k) => {
      const t = k * 1.5, end = Math.min(1, k / 18, (path.length - k) / 18), r = 26 * K * (0.45 + 0.75 * width(t)) * (0.88 + 0.12 * end), a = Math.max(0.28, Math.min(1, 1.3 * dense(t) - 0.25)) * (0.7 + 0.3 * end);   /* as signed off, but never fading right out: thicker and thinner, denser and faded */
      for (const x2 of [sg, fg]) { x2.globalAlpha = a * 0.24; x2.beginPath(); x2.arc(x, y, r, 0, 6.283); x2.fill(); }
      const gw = Math.max(0, glow(t) * 1.7 - 0.85) ** 1.6 + 0.9 * Math.exp(-((((k / path.length) - bloomAt) / 0.12) ** 2));   /* blooms in a stretch or two, and always somewhere */
      if (gw > 0.01) { gg.globalAlpha = Math.min(1, gw) * 0.28; gg.beginPath(); gg.arc(x + (Math.random() - 0.5) * 6 * K, y + (Math.random() - 0.5) * 6 * K, r * 0.95, 0, 6.283); gg.fill(); }
    });
    const blur = (c, px) => { const o = mk(), x = o.getContext('2d'); x.filter = 'blur(' + px * K + 'px)'; x.drawImage(c, 0, 0); return o; };
    const core = [1, 3, 5].map(i => parseInt(pair[0].slice(i, i + 2), 16)), halo = [1, 3, 5].map(i => parseInt(pair[1].slice(i, i + 2), 16));
    let S, Sf, Gm, out, o, fv, fw, fq, row = 0;
    const focus = (x, y) => { const fx = x / fq, ix = fx | 0, tx = fx - ix, fy = y / fq, iy = fy | 0, ty = fy - iy, i = iy * fw + ix, a = tx * tx * (3 - 2 * tx), b = ty * ty * (3 - 2 * ty);
      return (fv[i] * (1 - a) + fv[i + 1] * a) * (1 - b) + (fv[i + fw] * (1 - a) + fv[i + fw + 1] * a) * b; };
    later(() => {
      S = blur(sharp, 1.5).getContext('2d').getImageData(0, 0, W, H).data; Sf = blur(soft, 13).getContext('2d').getImageData(0, 0, W, H).data;
      const ga = blur(gm, 16), gx = ga.getContext('2d'); gx.globalAlpha = 0.8; gx.drawImage(blur(gm, 7), 0, 0); Gm = gx.getImageData(0, 0, W, H).data;
      fq = 130 * K; fw = Math.ceil(W / fq) + 2; fv = Array.from({ length: fw * (Math.ceil(H / fq) + 2) }, Math.random); out = new ImageData(W, H); o = out.data;
      const slice = () => {
        const end = Math.min(H, row + Math.max(40, Math.round(320000 / W)));
        for (let y = row; y < end; y++) for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4; if (S[i + 3] < 2 && Sf[i + 3] < 2 && Gm[i + 3] < 2) continue;
          const f = focus(x, y) ** 1.3, body = Math.min(1, (S[i + 3] / 255 * f + Sf[i + 3] / 255 * (1 - f)) * 1.05), glw = Math.min(1, Gm[i + 3] / 255 * 1.2);
          const pb = Math.random() < body ** 1.15, pg = Math.random() < glw * 0.95; if (!pb && !pg) continue;
          let r, g2, b, a;
          if (pb) { const bl = Math.min(0.85, glw * (1 - body) * 1.6); r = core[0] + (halo[0] - core[0]) * bl; g2 = core[1] + (halo[1] - core[1]) * bl; b = core[2] + (halo[2] - core[2]) * bl; a = 0.9 + Math.random() * 0.1; }
          else { r = halo[0]; g2 = halo[1]; b = halo[2]; a = 0.55 + 0.45 * glw; }
          const sh = 0.9 + Math.random() * 0.2; o[i] = r * sh; o[i + 1] = g2 * sh; o[i + 2] = b * sh; o[i + 3] = a * 255;
        }
        row = end; if (row < H) return later(slice);
        const fin = mk(); fin.getContext('2d').putImageData(out, 0, 0); S = Sf = Gm = out = o = null;
        cb({ ready: fin, stroke: { r: 26 * K, p: path.filter((_, i) => i % 3 === 0) }, rect: [x0 * d, y0 * d, rw * d, rh * d] });
      };
      later(slice);
    });
  }
  document.querySelectorAll('canvas.spray-over').forEach(cv => {
    const wrap = cv.parentElement; if (!wrap.querySelector('.ca-state') || !('IntersectionObserver' in window)) return;
    const cv2 = cv.cloneNode(); cv.after(cv2);   /* the strike on its own layer, so it goes over the doodle without wiping it */
    const di = pickD();
    let parts = null, inView = false, ran = false;
    const run = () => { if (ran || !parts || !inView) return; ran = true;
      const [meta, img, sk] = parts, box = cv.getBoundingClientRect(), tb = wrap.querySelector('.ca-state').getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      [cv, cv2].forEach(c => { c.width = Math.round(box.width * d); c.height = Math.round(box.height * d); });
      /* the doodle over the sentence: centred on it, about as tall as the text block */
      const w = Math.min(tb.width * 0.95, tb.height * 2.4), h = w * 0.625, x = (tb.left - box.left + tb.width / 2 - w / 2) * d, y = (tb.top - box.top + tb.height / 2 - h / 2) * d;
      const g = cv.getContext('2d'), g2 = cv2.getContext('2d');
      const strikeOn = () => { if (!sk) return; const [rx, ry, rW, rH] = sk.rect; sprayOn(sk.ready, [sk.stroke], f => { g2.clearRect(0, 0, cv2.width, cv2.height); g2.imageSmoothingQuality = 'high'; g2.drawImage(f, rx, ry, rW, rH); }); };
      sprayOn(img, meta ? pathsFor(meta[di], img.width, img.height) : [], f => { g.clearRect(0, 0, cv.width, cv.height); g.drawImage(f, x, y, w * d, h * d); }, () => setTimeout(strikeOn, 120));
    };
    const near = new IntersectionObserver(es => { if (!es.some(e => e.isIntersecting && cv.clientWidth)) return; near.disconnect();
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => Promise.all([doodles(), loadImg('/img/spray/ft-' + di + '.webp?v=2')])).then(([meta, img]) => {
        const c = meta && meta[di] ? meta[di].c : '#000000', pool = PAIRS.filter(([k]) => { const dh = Math.abs(hue(k) - hue(c)); return Math.min(dh, 360 - dh) > 70; });
        const pair = (pool.length ? pool : PAIRS)[Math.random() * (pool.length || PAIRS.length) | 0];
        strike(cv2, wrap, pair, sk => { parts = [meta, img, sk]; run(); });
      }).catch(() => {}); }, { rootMargin: '80% 0px' });
    const vis = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { vis.disconnect(); setTimeout(() => { inView = true; run(); }, RM ? 0 : 250); } }, { threshold: 0.4 });
    near.observe(cv); vis.observe(cv);
  });
})();
