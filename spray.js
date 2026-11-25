/* Spray paint, drawn on as if by hand.
   Each pass of the can builds up paint (a soft, uneven density); the paint shows where the density beats a grain texture,
   so the middle of a line is thick and nearly solid and its edges break up into speckle and overspray.
   - <canvas class="spray" data-spray="re|ps|lta">: placeholder pictures, bright paper with sprayed marks
   - <canvas class="spray-over"> inside .ca-wrap: letters sprayed over the statement, and a ring round its .ca-nv word
   Each draws itself the first time it comes into view. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FAT = 1.8;   // how fat every line is, over the widths set below
  const ART = {
    re: { bg: '#1f2a4d', strokes: [
      { c: '#ff6a1f', rim: '#ff2f7a', soft: true, w: 520, speed: 14, pts: [[680, 250], [760, 200], [820, 290], [740, 340], [700, 300]] },
      { c: '#ff6a1f', rim: '#ff2f7a', drops: '#f1eee7', w: 150, pts: [[170, 260], [430, 170], [700, 250], [770, 500], [580, 700], [330, 650], [290, 460], [470, 370], [640, 460], [610, 600], [470, 620], [560, 760], [870, 860]] },
      { c: '#f1eee7', w: 70, pts: [[110, 850], [300, 790], [520, 830], [780, 770]] } ] },
    ps: { bg: '#97d6ef', strokes: [
      { c: '#ff8a1f', rim: '#ffd23f', soft: true, w: 480, speed: 14, pts: [[220, 760], [300, 700], [360, 790], [280, 830], [250, 780]] },
      { c: '#ffd23f', rim: '#ff8a1f', drops: '#1f3fd1', w: 170, pts: [[260, 110], [720, 190], [300, 340], [720, 440], [280, 580], [700, 680], [330, 820], [660, 920]] },
      { c: '#ffffff', w: 80, pts: [[800, 170], [880, 250], [820, 350], [720, 300], [740, 190], [820, 170]] } ] },
    lta: { bg: '#141414', strokes: [
      { c: '#ff3a1a', rim: '#ff2f7a', soft: true, w: 460, speed: 14, pts: [[740, 260], [820, 210], [870, 300], [790, 350], [760, 300]] },
      { c: '#ff3a1a', rim: '#ff2f7a', drops: '#f1eee7', w: 150, pts: [[110, 760], [450, 680], [900, 730]] },
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
  const wob = () => { const a = Math.random() * 6, b = Math.random() * 6, c = Math.random() * 6;
    // the hand's pressure: slow swells plus the odd dip where the paint thins right out, so a line is never even
    return t => Math.max(0.04, Math.min(1, 0.55 + 0.32 * Math.sin(t * 0.011 + a) + 0.22 * Math.sin(t * 0.037 + b) - 0.45 * Math.max(0, Math.sin(t * 0.006 + c)) ** 6)); };
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

    // a chunkier, smooth roughness for brush edges (torn rather than speckled): two scales of blended noise
    const rough = new Float32Array(W * H), mk = q => { const w = Math.ceil(W / q) + 2; return [q, w, Array.from({ length: w * (Math.ceil(H / q) + 2) }, Math.random)]; };
    const L1 = mk(7), L2 = mk(19), smp = ([q, w, a], x, y) => { const fx = x / q, ix = fx | 0, tx = fx - ix, fy = y / q, iy = fy | 0, ty = fy - iy, i = iy * w + ix;
      return (a[i] * (1 - tx) + a[i + 1] * tx) * (1 - ty) + (a[i + w] * (1 - tx) + a[i + w + 1] * tx) * ty; };
    if (strokes.some(s => s.brush)) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) rough[y * W + x] = smp(L1, x, y) * 0.55 + smp(L2, x, y) * 0.45;
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
      const dd = dg.getImageData(x0, y0, w, h).data, out = lg.createImageData(w, h), o = out.data, [r, gg, b] = s.rgb, rim = s.rimRgb;
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const i = (yy * w + xx) * 4, dv = dd[i + 3] / 255; if (!dv) continue;
        const n = grain[(y0 + yy) * W + x0 + xx];
        let a;
        if (s.brush) { const t = dv + (rough[(y0 + yy) * W + x0 + xx] - 0.5) * 0.5 + (n - 0.5) * 0.04; a = t > 0.44 ? 1 : t > 0.4 ? (t - 0.4) / 0.04 : 0; }   // dry brush: flat paint with a hard, ragged edge
        else if (s.soft) { a = (dv * 1.1 - n * 0.2) * 1.2; if (a > 0.97) a = 0.97; }   // airbrush: a smooth soft form with fine grain, no hard core
        else { a = (dv * (s.solid ? 1.9 : 1.25) - n * 0.62) * 2.4; if (a > 1) a = 1;
          const mist = (dv - n * 0.32) * 0.42; if (mist > a) a = mist; }   // the blowout: thin paint carried wide of the line
        if (a <= 0) continue;
        const sh = s.brush ? 1 : 0.9 + n * 0.2;
        if (rim) {   // two-tone: the edge of the paint shifts to a second colour, the dense middle keeps the first
          const t = Math.min(1, dv * (s.soft ? 1.25 : 1.6)) ** 1.6;
          o[i] = (rim[0] + (r - rim[0]) * t) * sh; o[i + 1] = (rim[1] + (gg - rim[1]) * t) * sh; o[i + 2] = (rim[2] + (b - rim[2]) * t) * sh;
        } else { o[i] = r * sh; o[i + 1] = gg * sh; o[i + 2] = b * sh; } o[i + 3] = a * (s.solid || s.brush ? 255 : 222);   // never quite opaque, so passes that cross build up on each other
      }
      lg.putImageData(out, x0, y0);
    };
    const step = () => {
      const s = strokes[si]; if (!s) return done && done();
      if (!s.rgb) { s.rgb = rgb(s.c); if (s.rim) s.rimRgb = rgb(s.rim); }
      const n = s.path.length, u = at / n, ease = 0.3 + 2.2 * u * u;   // each pass starts slow and finishes quick, like a confident hand
      const adv = RM ? n : Math.max(3, Math.round(s.speed * ease * (0.6 + 0.8 * sp(at))));
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let e = Math.min(n - 1, at + adv); at <= e; at += 3) {
        const [x, y] = s.path[at], f = Math.min(1, at / 24, (n - at) / 24), p = pr(at) * (0.35 + 0.65 * f) * Math.min(1, 1.25 / Math.sqrt(0.3 + 2.2 * (at / n) ** 2));   // and thins out as it speeds up
        const R = s.w * FAT * 0.5 * (s.brush ? Math.max(0.12, Math.min(1, (n - at) / (n * 0.4), 0.7 + at / (n * 0.3))) : 0.8 + 0.45 * (1 - p));   // a brush stroke lands blunt and flicks off to a point
        dg.globalAlpha = s.soft ? Math.min(0.6, (1 - Math.pow(0.04, 3 / n)) * (0.7 + 0.5 * p)) : Math.min(0.5, (1 - Math.pow(0.08, 3 / R)) * (0.4 + p) * 1.05);
        dg.drawImage(PUFF, x - R, y - R, 2 * R, 2 * R);   // (an airbrushed form builds to a full core over its few turns)
        const B = R * (2 + 0.8 * p); if (!s.brush) { dg.globalAlpha = Math.min(0.08, (1 - Math.pow(0.6, 3 / B)) * (0.3 + p)); dg.drawImage(PUFF, x - B, y - B, 2 * B, 2 * B); }   // the wider mist round the nozzle; build to the same body
        if (!s.brush && Math.random() < 0.12) {   // stray spits of paint, some well clear of the line
          dg.globalAlpha = 0.1 + Math.random() * 0.25; const a = Math.random() * 6.283, d = R * (0.8 + Math.random() * Math.random() * 3.5), rr = R * (0.08 + Math.random() * 0.3);
          dg.drawImage(PUFF, x + Math.cos(a) * d - rr, y + Math.sin(a) * d - rr, 2 * rr, 2 * rr);
        }
        x0 = Math.min(x0, x - 3.2 * R); y0 = Math.min(y0, y - 3.2 * R); x1 = Math.max(x1, x + 3.2 * R); y1 = Math.max(y1, y + 3.2 * R);
      }
      ink(s, x0, y0, x1, y1); show();
      if (at >= n - 1) {   // this pass is done: fix it into the base and start the next on a clean density layer
        bgc.drawImage(lay, 0, 0); lg.clearRect(0, 0, W, H); dg.clearRect(0, 0, W, H); dg.globalAlpha = 1;
        if (s.drops) {   // a few hard droplets of a second colour, flicked off the can
          bgc.fillStyle = s.drops; const nd = 8 + (Math.random() * 18 | 0), sz = Math.max(1.2, s.w / 60);
          for (let d = 0; d < nd; d++) {
            const [px, py] = s.path[Math.random() * s.path.length | 0], an = Math.random() * 6.283, dist = s.w * (0.2 + Math.random() * 1.4);
            bgc.globalAlpha = 0.6 + Math.random() * 0.4; bgc.beginPath(); bgc.arc(px + Math.cos(an) * dist, py + Math.sin(an) * dist, sz * (0.5 + Math.random() * 1.8), 0, 6.283); bgc.fill();
          }
          bgc.globalAlpha = 1; show();
        }
        si++; at = 0; pr = wob(); sp = wob();
        if (RM) return step();
        return setTimeout(() => requestAnimationFrame(step), gap + Math.random() * 160);
      }
      RM ? step() : requestAnimationFrame(step);
    };
    step();
  }

  // the second colour each paint shifts to at its edge (after the references: orange into pink, blue into green, red into pink)
  const RIM = { '#ff6a1f': '#ff2f7a', '#ff7a2b': '#ff2f7a', '#ffd23f': '#ff8a1f', '#ff3a1a': '#ff2f7a', '#2f63ff': '#22c55e', '#1f3fd1': '#3ad06a',
                '#5bb8e6': '#1f3fd1', '#2b6a3e': '#9be15d', '#1f2a4d': '#5b6cff', '#f6c9de': '#ffffff', '#ff8a1f': '#ff2f7a' };
  // an airbrushed soft form: a few slow turns of the can on one spot (x, y, size in the art's 0-1000 units)
  const blob = (c, x, y, size) => ({ c, rim: RIM[c], soft: true, w: size, speed: 14, pts: [[x - size * 0.12, y], [x, y - size * 0.1], [x + size * 0.12, y + size * 0.02], [x, y + size * 0.1], [x - size * 0.06, y + size * 0.02]] });

  // placeholder pictures
  function picture(cv) {
    const art = ART[cv.dataset.spray]; if (!art) return;
    const r = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.max(2, Math.round(cv.clientWidth * r)), H = cv.height = Math.max(2, Math.round(cv.clientHeight * r));
    const SY = Math.max(H, W / 1.6), k = Math.min(W, SY) / 1000;   // wide boxes crop into the middle of the piece rather than squashing it
    const map = ([x, y]) => [x / 1000 * W, H / 2 + (0.76 * y / 1000 - 0.38) * SY];
    run(cv, W, H, art.bg, art.strokes.map(s => ({ ...s, w: s.w * k, speed: (s.speed || 30) * Math.max(1, k * 1.5), path: curve(s.pts.map(map)) })));
  }

  // letters sprayed over the statement, and a ring round one word
  function over(cv) {
    const wrap = cv.parentElement, txt = wrap.querySelector('.ca-state'), word = wrap.querySelector('.ca-nv');
    const r = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.round(cv.clientWidth * r), H = cv.height = Math.round(cv.clientHeight * r);
    const box = cv.getBoundingClientRect(), C = (x, y) => [(x - box.left) * r, (y - box.top) * r];
    const tb = txt.getBoundingClientRect(), h = Math.min(tb.height * 1.45, tb.width * 0.62) * r, [cx, cy] = C(tb.left + tb.width / 2, tb.top + tb.height / 2);
    // one big squiggle across the whole statement
    // fat flat brush strokes scrubbed back and forth across it, each landing at the top and flicking off at the bottom
    const tw = Math.min(tb.width * r, W * 0.8), th = tb.height * r, strokes = [], nS = 5 + (Math.random() * 2 | 0), J = v => (Math.random() - 0.5) * v;
    for (let k = 0; k < nS; k++) {
      const x0 = cx - tw * 0.42 + k * tw * 0.8 / (nS - 1) + J(tw * 0.05), top = cy - th * (0.55 + Math.random() * 0.25), bot = cy + th * (0.55 + Math.random() * 0.35);
      const lean = tw * (0.03 + Math.random() * 0.09) * (Math.random() < 0.25 ? -1 : 1);
      strokes.push({ brush: true, c: '#4a86e8', w: th * (0.27 + Math.random() * 0.1), speed: 46 * r, path: curve([[x0 - lean, top], [x0 + J(th * 0.1), cy + J(th * 0.1)], [x0 + lean, bot]]) });
    }
    strokes.unshift({ brush: true, c: '#4a86e8', w: th * 0.2, speed: 30 * r, path: curve([[cx - tw * 0.52, cy - th * 0.1], [cx - tw * 0.49, cy + th * 0.25], [cx - tw * 0.46, cy + th * 0.4]]) });
    let strike = null;
    if (word) {   // and a bold strike through "never"
      const b = word.getBoundingClientRect(), [x0, y0] = C(b.left - b.width * 0.12, b.top + b.height * 0.62), [x1, y1] = C(b.right + b.width * 0.12, b.top + b.height * 0.48);
      strike = { solid: true, c: '#ff2f7a', w: b.height * r * 0.3, speed: 18 * r, path: curve([[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 + b.height * r * 0.04], [x1, y1]]) };
    }
    // the squiggle sits into the type; the strike goes over the word, on a layer of its own
    run(cv, W, H, null, strokes, 120, strike && (() => { const c2 = cv.cloneNode(); c2.className = 'spray-over spray-strike'; cv.after(c2); c2.width = W; c2.height = H; setTimeout(() => run(c2, W, H, null, [strike], 0), 200); }));
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
    // cropped in and tilted a different way each time, with a little wobble in the hand, so no two sit square
    const rot = (Math.random() - 0.5) * 0.5, zoom = 1.15 + Math.random() * 0.2, ox = (Math.random() - 0.5) * 120, oy = (Math.random() - 0.5) * 120;
    const map = ([x0, y0]) => {
      const dx = (x0 - 500) * zoom, dy = (y0 - 500) * zoom, x = 500 + ox + dx * Math.cos(rot) - dy * Math.sin(rot), y = 500 + oy + dx * Math.sin(rot) + dy * Math.cos(rot);
      return [x / 1000 * W, y / 1000 * H];   // over the whole picture box, whatever band of the drawing shows
    };
    const jig = pts => pts.map(([x, y]) => [x + (Math.random() - 0.5) * 50, y + (Math.random() - 0.5) * 50]);
    // mixed technique, as on the Work thumbnails: the first pass fat and slow, the rest a mix of medium and thin quick ones,
    // and a thin cream tag scrawled across a corner to finish
    const k = m.a * r * zoom * 0.8, strokes = art.map(([c, w, pts], i) => {
      const t = (i === 0 ? 1.25 : [0.95, 0.7, 0.42][Math.random() * 3 | 0]) * Math.min(1.1, 900 / vH);
      return { c, w: w * t * k, speed: (i === 0 ? 26 : 32 + (1.5 - t) * 30) * r, path: curve(jig(pts).map(map)) };
    });
    const n = 3 + (Math.random() * 4 | 0), a = Math.random() * 6.283, step = 40 + Math.random() * 50, amp = 30 + Math.random() * 80, tag = [];
    let tx = 150 + Math.random() * 700, ty = 150 + Math.random() * 700;
    for (let j = 0; j < n; j++) { const side = (j % 2 ? -1 : 1) * amp * (0.5 + Math.random()); tag.push([tx - Math.sin(a) * side, ty + Math.cos(a) * side]); tx += Math.cos(a) * step; ty += Math.sin(a) * step; }
    strokes.push({ c: art.tag || '#f1eee7', w: (16 + Math.random() * 14) * k, speed: 60 * r, path: curve(tag.map(map)) });
    // after the references: sometimes a soft airbrushed form behind, the main pass shifting colour at its edge, droplets
    const c0 = art[0][0];
    if (RIM[c0] && Math.random() < 0.7) strokes[0].rim = RIM[c0];
    if (Math.random() < 0.6) strokes[0].drops = ['#1f2a4d', '#ff2f7a', '#f1eee7', '#1f3fd1'].filter(c => c !== c0)[Math.random() * 3 | 0];
    if (Math.random() < 0.6) { const b = blob(c0, 200 + Math.random() * 600, 200 + Math.random() * 600, 380 + Math.random() * 200);
      strokes.unshift({ ...b, w: b.w * k, speed: 14 * r, path: curve(b.pts.map(map)) }); }
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

  /* ---------- Craft | AI (Information): Craft gets graphic spray over its blue, AI an airbrushed gradient. Each sprays the
     first time its side is picked (the panel shows a side's pattern by giving it .dim) ---------- */
  const CRAFT = [['#ff3a1a', 150, [[120, 260], [480, 140], [820, 330], [600, 520], [260, 420], [420, 260]]], ['#ff3a1a', 90, [[160, 760], [380, 640], [560, 820], [780, 660], [900, 840]]],
                 ['#f1eee7', 40, [[620, 880], [700, 800], [760, 900], [840, 810]]], ['#ff3a1a', 70, ring(820, 560, 70, 70)]];
  const onPick = (half, fn) => {
    const go = () => { if (half.classList.contains('dim') && !half.dataset.sprayed) { half.dataset.sprayed = '1'; fn(); } };
    new MutationObserver(go).observe(half, { attributes: true, attributeFilter: ['class'] }); go();
  };
  const craft = document.querySelector('.hv-half[data-k=craft]');
  if (craft) {
    const svg = craft.querySelector('svg.hv-pat'), cv = document.createElement('canvas'); cv.className = 'hv-spray'; cv.setAttribute('aria-hidden', 'true');
    if (svg) { svg.after(cv); svg.classList.add('sprayed'); onPick(craft, () => setTimeout(() => overSvg(svg, cv, CRAFT), 150)); }
  }
  const aiPat = document.querySelector('.hv-half[data-k=ai] .hv-grad');
  if (aiPat) {
    const cv = document.createElement('canvas'); cv.className = 'hv-air'; cv.setAttribute('aria-hidden', 'true'); aiPat.appendChild(cv); aiPat.classList.add('sprayed');
    onPick(aiPat.closest('.hv-half'), () => setTimeout(() => {
      const r = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.round(cv.clientWidth * r), H = cv.height = Math.round(cv.clientHeight * r), u = Math.min(W, H);
      const at = (x, y, size, c, rim) => ({ c, rim, soft: true, w: size * u, speed: 10 * r, path: curve([[x * W - size * u * 0.1, y * H], [x * W, y * H - size * u * 0.08], [x * W + size * u * 0.1, y * H + size * u * 0.02], [x * W - size * u * 0.04, y * H + size * u * 0.06]]) });
      run(cv, W, H, null, [at(0.36, 0.4, 0.42, '#ff5200', '#ff2f7a'), at(0.52, 0.24, 0.26, '#ff6e32', '#ffb000'), at(0.7, 0.5, 0.24, '#fa5c8c', '#ffc2d4'), at(0.6, 0.76, 0.3, '#ffb3c4', '#fff0f3'), at(0.3, 0.72, 0.14, '#2f63ff', '#22c55e')], 60);
    }, 150));
  }

  /* ---------- odd bits of photography get a sprayed mark over them: a few at random on each visit, the 620 picture always
     (its lime shapes now go on as spray). Only pictures that fill a positioned box, so the paint can sit over them. ---------- */
  const MARKS = {
    loop: (w, h) => [[0.15 * w, 0.55 * h], [0.45 * w, 0.2 * h], [0.8 * w, 0.35 * h], [0.6 * w, 0.75 * h], [0.3 * w, 0.6 * h], [0.5 * w, 0.4 * h], [0.85 * w, 0.85 * h]],
    squiggle: (w, h) => Array.from({ length: 7 }, (_, i) => [w * (0.08 + i * 0.14), h * (0.5 + (i % 2 ? -0.22 : 0.22))]),
    smile: (w, h) => [[0.2 * w, 0.62 * h], [0.5 * w, 0.82 * h], [0.82 * w, 0.58 * h]],
    strike: (w, h) => [[0.06 * w, 0.66 * h], [0.5 * w, 0.58 * h], [0.95 * w, 0.4 * h]],
    eyes: null,
  };
  const BRIGHT = ['#ff2f7a', '#ff6a1f', '#2f63ff', '#ff3a1a', '#c6ff4d', '#ffd23f'];
  function photo(img, cv, lime) {
    const r = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.round(cv.clientWidth * r), H = cv.height = Math.round(cv.clientHeight * r), u = Math.min(W, H);
    const pick = a => a[Math.random() * a.length | 0], strokes = [];
    if (lime) {   // 620: the lime shapes, sprayed
      const L = '#d6ffa3';
      [[0.15, 0.3, 0.2], [0.5, 0.6, 0.42], [0.82, 0.55, 0.24], [0.18, 0.85, 0.3]].forEach(([x, y, z]) => strokes.push({ c: L, rim: '#b5f06a', soft: true, w: z * u, speed: 12 * r, path: curve([[x * W - z * u * 0.12, y * H], [x * W, y * H - z * u * 0.12], [x * W + z * u * 0.12, y * H + z * u * 0.03], [x * W - z * u * 0.05, y * H + z * u * 0.08]]) }));
      strokes.push({ c: L, rim: '#b5f06a', w: 0.1 * u, speed: 30 * r, drops: '#ff2f7a', path: curve(MARKS.loop(W, H)) });
    } else {
      const c = pick(BRIGHT), kind = pick(['loop', 'squiggle', 'smile', 'strike', 'eyes']);
      if (kind === 'eyes') {   // two dabs and a mouth, after the Eike Koenig poster
        strokes.push({ c, w: 0.09 * u, speed: 22 * r, path: curve([[0.38 * W, 0.24 * H], [0.385 * W, 0.42 * H]]) }, { c, w: 0.09 * u, speed: 22 * r, path: curve([[0.6 * W, 0.24 * H], [0.605 * W, 0.42 * H]]) }, { c, w: 0.09 * u, speed: 26 * r, path: curve(MARKS.smile(W, H)) });
      } else strokes.push({ c, rim: RIM[c], w: (kind === 'strike' ? 0.08 : 0.1) * u, speed: 30 * r, drops: Math.random() < 0.5 ? pick(BRIGHT.filter(x => x !== c)) : null, path: curve(MARKS[kind](W, H)) });
    }
    run(cv, W, H, null, strokes, 140);
  }
  const imgs = [...document.querySelectorAll('img')].filter(img => {
    if (img.closest('.logo, #intro, .wc-slot, .wd-pic, header, nav') || /swallow|portrait|cow/.test(img.src)) return false;
    const p = img.parentElement, ps = p && getComputedStyle(p).position;
    return p && ps !== 'static' && (getComputedStyle(img).position === 'absolute' || (img.offsetWidth >= p.clientWidth - 2 && img.offsetHeight >= p.clientHeight - 2));
  });
  imgs.forEach(img => {
    const lime = /620-clean/.test(img.src);
    if (!lime && Math.random() > 0.22) return;
    const cv = document.createElement('canvas'); cv.className = 'photo-spray'; cv.setAttribute('aria-hidden', 'true'); img.after(cv);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && cv.clientWidth > 60) { io.disconnect(); setTimeout(() => photo(img, cv, lime), 300); } }), { threshold: 0.4 });
    io.observe(cv);
  });

  watch('canvas.spray', picture, 0);
  watch('canvas.spray-over', over, 900);
})();
