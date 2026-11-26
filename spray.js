/* Spray paint on the site.
   Every sprayed picture is a flat image baked once, offline, in the halation spray Joe signed off (img/spray/, made by
   the bake page in the session scratchpad): placeholders, What We Do, How we work, Craft, the AI gradient, the wheel's
   blue, and the marks on photo edges. The doodles over the statement and in the footer,
   and the strike through "never", are baked too, with their stroke paths (ft.json, nv.json), and spray on along those
   paths as you arrive. Nothing is painted in the page. */
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
  let FT = null; const doodles = () => FT || (FT = fetch('/img/spray/ft.json?v=3').then(r => r.json()).catch(() => null));
  const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const pickD = (() => { const used = []; return () => { let i; do i = Math.random() * 18 | 0; while (used.includes(i) && used.length < 18); used.push(i); return i; }; })();
  const pathsFor = (meta, w, h) => meta.strokes.map(({ r, p }) => ({ r: r * w, p: p.map(([x, y]) => [x * w, y * h]) }));
  const onView = (el, fn, thr = 0.35) => { if (!('IntersectionObserver' in window)) return fn(); const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold: thr }); io.observe(el); };

  /* ---------- the footer: a doodle between Extra and Ordinary, sprayed on as the footer comes up ---------- */
  document.querySelectorAll('.foot-mark, .fw-mark, .info-mark').forEach(fm => { const fa = fm.querySelector('.fm-avg'), fj = fm.querySelector('.fm-joe');   /* the footer and the Featured Work title */
  if (fa && fj) {
    const cv = document.createElement('canvas'); cv.className = 'foot-draw'; cv.setAttribute('aria-hidden', 'true'); fm.appendChild(cv);
    const di = pickD(); let pic = null, shown = false;
    const place = () => {   /* from the layout, so it holds while the footer slides in */
      const l = fa.offsetLeft + fa.offsetWidth, gap = Math.max(fj.offsetLeft - l, 0), w = Math.min(Math.max(gap * 1.6, fm.clientWidth * 0.36), fm.classList.contains('fw-mark') ? fm.clientWidth * 0.26 : fm.classList.contains('info-mark') ? fm.clientWidth * 0.2 : 1e9), h = w * 0.625, d = Math.min(devicePixelRatio || 1, 2);
      cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.style.left = (l + gap / 2 - w / 2) + 'px'; cv.style.top = (fa.offsetTop + fa.offsetHeight * 0.5 - h / 2) + 'px';
      const W = Math.round(w * d), H = Math.round(h * d); if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; if (shown && pic) cv.getContext('2d').drawImage(pic, 0, 0, W, H); }
    };
    place(); addEventListener('resize', place); if (document.fonts) document.fonts.ready.then(place);
    const near = new IntersectionObserver(es => { if (!es.some(e => e.isIntersecting)) return; near.disconnect();
      Promise.all([doodles(), loadImg('/img/spray/ft-' + di + '.webp?v=3')]).then(([meta, img]) => { pic = img;
        onView(cv, () => { const g = cv.getContext('2d'), go = () => sprayOn(img, meta ? pathsFor(meta[di], img.width, img.height) : [], f => { g.clearRect(0, 0, cv.width, cv.height); g.drawImage(f, 0, 0, cv.width, cv.height); }, () => { shown = true; });
          if (!meta) { g.drawImage(img, 0, 0, cv.width, cv.height); shown = true; } else go(); }, 0.5);
      }).catch(() => {}); }, { rootMargin: '60% 0px' });
    near.observe(fm);
  } });

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

  /* ---------- the statement: a doodle sprayed over it, then a baked strike through "never" in another colour family ---------- */
  let NVJ = null; const strikes = () => NVJ || (NVJ = fetch('/img/spray/nv.json?v=1').then(r => r.json()).catch(() => null));
  const hue = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), M = Math.max(r, g, b), n = Math.min(r, g, b), c = M - n; if (!c) return 0;
    const x = M === r ? ((g - b) / c) % 6 : M === g ? (b - r) / c + 2 : (r - g) / c + 4; return (x * 60 + 360) % 360; };
  document.querySelectorAll('canvas.spray-over').forEach(cv => {
    const wrap = cv.parentElement; if (!wrap.querySelector('.ca-state') || !('IntersectionObserver' in window)) return;
    const cv2 = cv.cloneNode(); cv.after(cv2);   /* the strike on its own layer, so it goes over the doodle without wiping it */
    const di = pickD();
    let parts = null, inView = false, ran = false;
    const run = () => { if (ran || !parts || !inView) return; ran = true;
      const [meta, img, nmeta, nimg, ni] = parts, box = cv.getBoundingClientRect(), tb = wrap.querySelector('.ca-state').getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 2);
      [cv, cv2].forEach(c => { c.width = Math.round(box.width * d); c.height = Math.round(box.height * d); });
      /* the doodle over the sentence: centred on it, about as tall as the text block */
      const w = Math.min(tb.width * 0.95, tb.height * 2.4), h = w * 0.625, x = (tb.left - box.left + tb.width / 2 - w / 2) * d, y = (tb.top - box.top + tb.height / 2 - h / 2) * d;
      const g = cv.getContext('2d'), g2 = cv2.getContext('2d');
      const strikeOn = () => {
        const nvEl = wrap.querySelector('.ca-nv'); if (!nvEl || !nimg) return;
        const rel = el => { let a = 0, b = 0; while (el && el !== wrap) { a += el.offsetLeft; b += el.offsetTop; el = el.offsetParent; } return [a, b]; };   /* from the layout: the lines may still be sliding in */
        const [ex, ey] = rel(nvEl), [cx0, cy0] = rel(cv), nW = nvEl.offsetWidth, nH = nvEl.offsetHeight;
        const sw = nW * 1.85, sh = sw * 0.4, sx = (ex - cx0 + nW / 2 - sw / 2) * d, sy = (ey - cy0 + nH * 0.52 - sh * 0.5) * d;   /* the stroke runs a little past each end of the word */
        sprayOn(nimg, nmeta ? pathsFor(nmeta[ni], nimg.width, nimg.height) : [], f => { g2.clearRect(0, 0, cv2.width, cv2.height); g2.drawImage(f, sx, sy, sw * d, sh * d); });
      };
      sprayOn(img, meta ? pathsFor(meta[di], img.width, img.height) : [], f => { g.clearRect(0, 0, cv.width, cv.height); g.drawImage(f, x, y, w * d, h * d); }, () => setTimeout(strikeOn, 120));
    };
    const near = new IntersectionObserver(es => { if (!es.some(e => e.isIntersecting && cv.clientWidth)) return; near.disconnect();
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => Promise.all([doodles(), loadImg('/img/spray/ft-' + di + '.webp?v=3'), strikes()])).then(([meta, img, nmeta]) => {
        /* a strike from a colour family well away from the doodle's */
        const c = meta && meta[di] ? meta[di].c : '#000000', far = (nmeta || []).map((m, i) => [m, i]).filter(([m]) => { const dh = Math.abs(hue(m.c) - hue(c)); return Math.min(dh, 360 - dh) > 70; });
        const ni = far.length ? far[Math.random() * far.length | 0][1] : (Math.random() * 12 | 0);
        return loadImg('/img/spray/nv-' + ni + '.webp?v=1').then(nimg => { parts = [meta, img, nmeta, nimg, ni]; run(); });
      }).catch(() => {}); }, { rootMargin: '80% 0px' });
    const vis = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { vis.disconnect(); setTimeout(() => { inView = true; run(); }, RM ? 0 : 250); } }, { threshold: 0.4 });
    near.observe(cv); vis.observe(cv);
  });
})();

/* Big two-word titles (Featured / Work, Extra / Ordinary, Made by / Hand, Hand / Picked): the letters' own side spacing
   leaves the first word's ink inset from the text margin and the last word's ink past it. Measure the real ink and nudge
   each word so its ink sits exactly on the margin, like the small text around it. */
(() => {
  const ctx = document.createElement('canvas').getContext('2d');
  const ink = s => {
    const st = getComputedStyle(s);
    ctx.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`;
    try { ctx.letterSpacing = st.letterSpacing; } catch (e) {}
    const m = ctx.measureText(s.textContent), r = s.getBoundingClientRect();
    return { l: r.left - m.actualBoundingBoxLeft, r: r.left + m.actualBoundingBoxRight };
  };
  const align = () => document.querySelectorAll('.foot-mark, .fw-mark, .info-mark').forEach(mk => {
    const a = mk.querySelector('.fm-avg'), j = mk.querySelector('.fm-joe');
    if (!a || !j) return;
    a.style.translate = ''; j.style.translate = '';
    const box = mk.getBoundingClientRect(), cs = getComputedStyle(mk);
    const L = box.left + parseFloat(cs.paddingLeft), R = box.right - parseFloat(cs.paddingRight);
    const dl = L - ink(a).l, dr = R - ink(j).r;
    if (Math.abs(dl) > 0.3) a.style.translate = dl.toFixed(1) + 'px 0';
    if (Math.abs(dr) > 0.3) j.style.translate = dr.toFixed(1) + 'px 0';
  });
  const go = () => document.fonts.ready.then(align);
  go(); addEventListener('load', go);
  let t; addEventListener('resize', () => { clearTimeout(t); t = setTimeout(align, 150); });
})();
