/* Spray paint, drawn on as if by hand.
   Each pass of the can builds up paint (a soft, uneven density); the paint shows where the density beats a grain texture,
   so the middle of a line is thick and nearly solid and its edges break up into speckle and overspray.
   - <canvas class="spray" data-spray="re|ps|lta">: placeholder pictures, bright paper with sprayed marks
   - <canvas class="spray-over"> inside .ca-wrap: letters sprayed over the statement, and a ring round its .ca-nv word
   Each draws itself the first time it comes into view. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ART = {
    re: { bg: '#1f2a4d', strokes: [
      { c: '#ff6a1f', w: 150, pts: [[170, 260], [430, 170], [700, 250], [770, 500], [580, 700], [330, 650], [290, 460], [470, 370], [640, 460], [610, 600], [470, 620], [560, 760], [870, 860]] },
      { c: '#f1eee7', w: 70, pts: [[110, 850], [300, 790], [520, 830], [780, 770]] } ] },
    ps: { bg: '#97d6ef', strokes: [
      { c: '#ffd23f', w: 170, pts: [[260, 110], [720, 190], [300, 340], [720, 440], [280, 580], [700, 680], [330, 820], [660, 920]] },
      { c: '#ffffff', w: 80, pts: [[800, 170], [880, 250], [820, 350], [720, 300], [740, 190], [820, 170]] } ] },
    lta: { bg: '#141414', strokes: [
      { c: '#ff3a1a', w: 150, pts: [[110, 760], [450, 680], [900, 730]] },
      { c: '#f1eee7', w: 64, pts: [[150, 400], [300, 300], [250, 580]] },
      { c: '#f1eee7', w: 64, pts: [[340, 320], [380, 610]] },
      { c: '#f1eee7', w: 64, pts: [[420, 470], [530, 380], [570, 570], [470, 610], [430, 520]] },
      { c: '#f1eee7', w: 64, pts: [[610, 340], [650, 640]] },
      { c: '#f1eee7', w: 40, pts: [[651, 640], [653, 770]] },
      { c: '#f1eee7', w: 64, pts: [[690, 430], [830, 380], [870, 610]] } ] },
  };

  // a smooth curve through the points (Catmull-Rom), as points about 2px apart
  const curve = pts => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.max(1, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2));
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  const wob = () => { const a = Math.random() * 6, b = Math.random() * 6; return t => 0.5 + 0.3 * Math.sin(t * 0.011 + a) + 0.2 * Math.sin(t * 0.037 + b); };
  const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  // one soft puff of paint (white = density)
  const PUFF = (() => { const b = document.createElement('canvas'); b.width = b.height = 128; const x = b.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return b; })();

  /* the engine: spray strokes [{c, w(px), speed, path:[[x,y]...]}] onto canvas cv, over an optional background */
  function run(cv, W, H, bg, strokes, gap = 220, done) {
    const g = cv.getContext('2d');
    // the grain the paint has to beat: fine speckle plus a coarser blotch, so coverage is uneven
    const grain = new Float32Array(W * H);
    const cq = 24, cw = Math.ceil(W / cq) + 1, coarse = Array.from({ length: cw * (Math.ceil(H / cq) + 1) }, Math.random);
    for (let y = 0; y < H; y++) { const fy = y / cq, iy = fy | 0, ty = fy - iy; for (let x = 0; x < W; x++) {   // the blotch is blended between its points, so it has no hard squares
      const fx = x / cq, ix = fx | 0, tx = fx - ix, i = iy * cw + ix;
      const c = (coarse[i] * (1 - tx) + coarse[i + 1] * tx) * (1 - ty) + (coarse[i + cw] * (1 - tx) + coarse[i + cw + 1] * tx) * ty;
      grain[y * W + x] = Math.random() * 0.7 + c * 0.3; } }

    const base = document.createElement('canvas'); base.width = W; base.height = H; const bgc = base.getContext('2d');
    if (bg) {   // bright paper, with grain
      bgc.fillStyle = bg; bgc.fillRect(0, 0, W, H);
      const im = bgc.getImageData(0, 0, W, H), d = im.data;
      for (let i = 0; i < d.length; i += 4) { const v = (Math.random() - 0.5) * 26; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
      bgc.putImageData(im, 0, 0);
    }
    const dens = document.createElement('canvas'); dens.width = W; dens.height = H; const dg = dens.getContext('2d', { willReadFrequently: true });
    const lay = document.createElement('canvas'); lay.width = W; lay.height = H; const lg = lay.getContext('2d');
    const show = () => { g.clearRect(0, 0, W, H); g.drawImage(base, 0, 0); g.drawImage(lay, 0, 0); };
    show();

    let si = 0, at = 0, pr = wob(), sp = wob();
    // turn the density in a box into paint of this stroke's colour
    const ink = (s, x0, y0, x1, y1) => {
      x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
      const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
      const dd = dg.getImageData(x0, y0, w, h).data, out = lg.createImageData(w, h), o = out.data, [r, gg, b] = s.rgb;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const i = (yy * w + xx) * 4, dv = dd[i + 3] / 255; if (!dv) continue;
        const n = grain[(y0 + yy) * W + x0 + xx];
        let a = (dv * 1.25 - n * 0.62) * 2.4; if (a <= 0) continue; if (a > 1) a = 1;
        const sh = 0.9 + n * 0.2;
        o[i] = r * sh; o[i + 1] = gg * sh; o[i + 2] = b * sh; o[i + 3] = a * 240;
      }
      lg.putImageData(out, x0, y0);
    };
    const step = () => {
      const s = strokes[si]; if (!s) return done && done();
      if (!s.rgb) s.rgb = rgb(s.c);
      const n = s.path.length, adv = RM ? n : Math.max(4, Math.round(s.speed * (0.45 + 1.1 * sp(at))));
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let e = Math.min(n - 1, at + adv); at <= e; at += 3) {
        const [x, y] = s.path[at], f = Math.min(1, at / 24, (n - at) / 24), p = pr(at) * (0.35 + 0.65 * f);
        const R = s.w * 0.5 * (0.8 + 0.45 * (1 - p));
        dg.globalAlpha = Math.min(0.5, (1 - Math.pow(0.08, 3 / R)) * (0.4 + p) * 1.05); dg.drawImage(PUFF, x - R, y - R, 2 * R, 2 * R);   // as strong per puff as it takes for any width of line to build to the same body
        if (Math.random() < 0.04) { dg.globalAlpha = 0.12; const a = Math.random() * 6.283, d = R * (0.9 + Math.random()), rr = R * 0.25; dg.drawImage(PUFF, x + Math.cos(a) * d - rr, y + Math.sin(a) * d - rr, 2 * rr, 2 * rr); }   // a stray spit of paint
        x0 = Math.min(x0, x - 2 * R); y0 = Math.min(y0, y - 2 * R); x1 = Math.max(x1, x + 2 * R); y1 = Math.max(y1, y + 2 * R);
      }
      ink(s, x0, y0, x1, y1); show();
      if (at >= n - 1) {   // this pass is done: fix it into the base and start the next on a clean density layer
        bgc.drawImage(lay, 0, 0); lg.clearRect(0, 0, W, H); dg.clearRect(0, 0, W, H); dg.globalAlpha = 1;
        si++; at = 0; pr = wob(); sp = wob();
        if (RM) return step();
        return setTimeout(() => requestAnimationFrame(step), gap + Math.random() * 160);
      }
      RM ? step() : requestAnimationFrame(step);
    };
    step();
  }

  // placeholder pictures
  function picture(cv) {
    const art = ART[cv.dataset.spray]; if (!art) return;
    const r = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.max(2, Math.round(cv.clientWidth * r)), H = cv.height = Math.max(2, Math.round(cv.clientHeight * r));
    const SY = Math.max(H, W / 1.6), k = Math.min(W, SY) / 1000;   // wide boxes crop into the middle of the piece rather than squashing it
    const map = ([x, y]) => [x / 1000 * W, H / 2 + (0.76 * y / 1000 - 0.38) * SY];
    run(cv, W, H, art.bg, art.strokes.map(s => ({ c: s.c, w: s.w * k, speed: 30 * Math.max(1, k * 1.5), path: curve(s.pts.map(map)) })));
  }

  // letters sprayed over the statement, and a ring round one word
  function over(cv) {
    const wrap = cv.parentElement, txt = wrap.querySelector('.ca-state'), word = wrap.querySelector('.ca-nv');
    const r = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.round(cv.clientWidth * r), H = cv.height = Math.round(cv.clientHeight * r);
    const box = cv.getBoundingClientRect(), C = (x, y) => [(x - box.left) * r, (y - box.top) * r];
    const tb = txt.getBoundingClientRect(), h = Math.min(tb.height * 1.45, tb.width * 0.62) * r, [cx, cy] = C(tb.left + tb.width / 2, tb.top + tb.height / 2);
    const rot = -0.08, place = ([u, v]) => { const x = (u - 0.62) * h, y = (v - 0.5) * h; return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; };
    const L = (c, w, pts) => ({ c, w: w * h, speed: 34 * r, path: curve(pts.map(place)) });
    const strokes = [   // "AI", by hand
      L('#2f63ff', 0.17, [[0.02, 1.02], [0.24, 0.5], [0.46, -0.02]]),
      L('#2f63ff', 0.17, [[0.46, -0.02], [0.66, 0.5], [0.9, 1.03]]),
      L('#2f63ff', 0.13, [[0.2, 0.66], [0.5, 0.63], [0.74, 0.62]]),
      L('#2f63ff', 0.17, [[1.2, -0.03], [1.21, 0.5], [1.23, 1.03]]),
    ];
    if (word) {
      const b = word.getBoundingClientRect(), [wx, wy] = C(b.left + b.width / 2, b.top + b.height * 0.55), rx = b.width * r * 0.66, ry = b.height * r * 0.7, pts = [];
      for (let t = -0.5; t <= 6.283 + 0.8; t += 0.3) pts.push([wx + Math.cos(t) * rx * (1 + 0.05 * Math.sin(t * 3)), wy + Math.sin(t) * ry * (1 + 0.05 * Math.sin(t * 3)) - t * ry * 0.04]);
      strokes.push({ c: '#ff2f7a', w: b.height * r * 0.32, speed: 22 * r, path: curve(pts) });
    }
    run(cv, W, H, null, strokes, 120);
  }

  const watch = (sel, fn, delay) => {
    const els = [...document.querySelectorAll(sel)]; if (!els.length) return;
    if (!('IntersectionObserver' in window)) return els.forEach(fn);
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting || !e.target.clientWidth) return;
      io.unobserve(e.target);
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => fn(e.target), RM ? 0 : delay));
    }), { threshold: 0.4 });
    els.forEach(c => io.observe(c));
  };
  /* ---------- What We Do (Information): each service's picture is sprayed over its colour the first time it comes up.
     The pictures are SVGs that wd.js crops and clones, so the paint goes on a canvas laid over each one, lined up with
     the SVG's own coordinates; the last picture's paint is then copied into the clone that flies down into step 01. ---------- */
  const ring = (cx, cy, rx, ry, a0 = -0.6, a1 = 5.9) => { const p = []; for (let t = a0; t <= a1; t += 0.32) p.push([cx + Math.cos(t) * rx, cy + Math.sin(t) * ry]); return p; };
  const WD = [
    [['#ffd23f', 110, ring(570, 470, 230, 230)], ['#ffd23f', 90, [[110, 840], [300, 700], [470, 560]]], ['#ffd23f', 80, [[350, 540], [480, 545], [470, 670]]]],   // Strategy: on target
    [['#f6c9de', 120, [[500, 140], [505, 500], [498, 860]]], ['#f6c9de', 120, [[190, 300], [500, 500], [810, 690]]], ['#f6c9de', 120, [[190, 700], [500, 500], [815, 300]]]],   // Branding: a mark
    [['#1f2a4d', 110, ring(330, 480, 170, 170)], ['#1f2a4d', 110, [[580, 300], [840, 320], [830, 650], [570, 640], [585, 310]]]],   // Visual Identity: shapes of a kit
    [['#2b6a3e', 80, [[300, 150], [305, 850]]], ['#2b6a3e', 80, [[500, 150], [502, 850]]], ['#2b6a3e', 80, [[700, 150], [698, 850]]], ['#2b6a3e', 80, [[130, 380], [870, 370]]], ['#2b6a3e', 80, [[130, 630], [870, 640]]]],   // Design: a grid
    [['#ff7a2b', 90, [[160, 380], [170, 220], [340, 210]]], ['#ff7a2b', 90, [[660, 210], [830, 220], [840, 380]]], ['#ff7a2b', 90, [[840, 620], [830, 780], [660, 790]]], ['#ff7a2b', 90, [[340, 790], [170, 780], [160, 620]]], ['#f1eee7', 70, ring(500, 500, 50, 50)]],   // Art Direction: in the frame
    [['#ff3a1a', 110, [[480, 120], [520, 420], [880, 500], [520, 580], [480, 880], [440, 580], [110, 500], [440, 420], [480, 120]]], ['#ff3a1a', 70, [[790, 160], [800, 330]]], ['#ff3a1a', 70, [[715, 245], [880, 245]]]],   // AI Content: a spark
    [['#ff3a1a', 100, [[220, 400], [620, 400], [620, 820], [220, 820], [225, 400]]], ['#ff3a1a', 100, [[230, 395], [400, 220], [800, 220], [620, 400]]], ['#ff3a1a', 100, [[800, 225], [800, 640], [625, 815]]]],   // Packaging: a box
    [['#1f3fd1', 90, [[130, 260], [870, 250], [880, 760], [120, 770], [135, 255]]], ['#1f3fd1', 60, [[140, 370], [860, 360]]], ['#1f3fd1', 110, [[450, 450], [460, 760], [540, 660], [660, 760]]]],   // Digital: a window and a pointer
  ];
  // spray an art list over an SVG picture, on a canvas the same size as the SVG, in the SVG's own coordinates
  const overSvg = (svg, cv, art, done) => {
    const box = cv.getBoundingClientRect(), m = svg.getScreenCTM(); if (!box.width || !m) return false;
    const r = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.round(box.width * r), H = cv.height = Math.round(box.height * r);
    const vb = svg.viewBox.baseVal, vy = vb.y, vH = vb.height || 1000;
    const map = ([x, y]) => { const uy = vy + (0.1 + 0.8 * y / 1000) * vH; return [(m.a * x + m.e - box.left) * r, (m.d * uy + m.f - box.top) * r]; };   // the art sits in the middle of whatever band of the picture shows
    const strokes = art.map(([c, w, pts]) => ({ c, w: w * m.a * r * Math.min(1, vH / 800), speed: 32 * r, path: curve(pts.map(map)) }));
    run(cv, W, H, null, strokes, 160, done && (() => done({ url: cv.toDataURL('image/png'), x: (box.left - m.e) / m.a, y: (box.top - m.f) / m.d, w: box.width / m.a, h: box.height / m.d })));
    return true;
  };
  const pics = [...document.querySelectorAll('.wd-pic')];
  const copies = [document.querySelector('.wd-fly svg'), document.querySelector('.wd-sec .st .st-pat')].filter(Boolean);
  if (pics.length) copies.forEach(t => t.classList.add('sprayed'));   // the copies of the last picture wait for its paint rather than showing the old shapes
  pics.forEach((pic, i) => {
    const art = WD[i], svg = pic.querySelector('svg'); if (!art || !svg) return;
    const cv = document.createElement('canvas'); cv.className = 'wd-spray'; cv.setAttribute('aria-hidden', 'true'); pic.appendChild(cv);
    pic.classList.add('sprayed');
    const go = () => {
      if (pic.dataset.sprayed) return;
      if (overSvg(svg, cv, art, i === pics.length - 1 ? ({ url, x, y, w, h }) => copies.forEach(t => {
        // the last picture's paint goes into the copy that flies into step 01, and into step 01 itself
        const im = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        im.setAttribute('class', 'wd-paint'); im.setAttribute('href', url); im.setAttribute('x', x); im.setAttribute('y', y); im.setAttribute('width', w); im.setAttribute('height', h); im.setAttribute('preserveAspectRatio', 'none');
        t.appendChild(im);
      }) : null)) pic.dataset.sprayed = '1';
    };
    new MutationObserver(() => { if (pic.classList.contains('on')) go(); }).observe(pic, { attributes: true, attributeFilter: ['class'] });
    if (pic.classList.contains('on')) go();
  });

  // How we work, steps 02-04 (01 carries the last What We Do picture)
  const STEPS = [
    [['#2b6a3e', 110, [[220, 800], [500, 790], [780, 805]]], ['#2b6a3e', 110, [[300, 610], [500, 600], [700, 615]]], ['#2b6a3e', 110, [[380, 420], [500, 415], [620, 425]]]],   // Make: built up
    [['#ff3a1a', 100, [[100, 900], [280, 250], [420, 900], [600, 150], [760, 900], [880, 330]]], ['#ff3a1a', 60, ring(830, 160, 60, 60)]],   // Sharpen: points
    [['#f1eee7', 90, ring(330, 380, 130, 130)], ['#ff7a2b', 100, [[140, 640], [500, 600], [860, 620]]], ['#ff7a2b', 90, [[720, 500], [865, 620], [720, 760]]]],   // Hand Over: passed on
  ];
  [...document.querySelectorAll('.wd-sec .st .st-pat')].slice(1).forEach((svg, i) => {
    const art = STEPS[i]; if (!art) return;
    const cv = document.createElement('canvas'); cv.className = 'st-spray'; cv.setAttribute('aria-hidden', 'true');
    svg.after(cv); svg.classList.add('sprayed');
    const place = () => { cv.style.gridColumn = getComputedStyle(svg).gridColumnStart; cv.style.gridRow = svg.style.gridRow = '1'; };   // the same cell as the picture
    place(); addEventListener('resize', place);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && overSvg(svg, cv, art)) io.disconnect(); }), { threshold: 0.4 });
    io.observe(cv);
  });

  watch('canvas.spray', picture, 0);
  watch('canvas.spray-over', over, 900);
})();
