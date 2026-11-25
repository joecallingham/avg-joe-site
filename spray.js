/* Spray paint, drawn on as if by hand.
   Each pass of the can builds up paint (a soft, uneven density); the paint shows where the density beats a grain texture,
   so the middle of a line is thick and nearly solid and its edges break up into speckle and overspray.
   - <canvas class="spray" data-spray="re|ps|lta">: placeholder pictures, bright paper with sprayed marks
   - <canvas class="spray-over"> inside .ca-wrap: letters sprayed over the statement, and a ring round its .ca-nv word
   Each draws itself the first time it comes into view. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ANIM = false;   // spray is simply there, painted just before it scrolls in; it only animates over text (the statement) or where Joe asks
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
  // a dot as a hand sprays it: starts in the middle and spirals out, drifting a little as it goes (points in the units given)
  const spiral = (x, y, rad) => { const p = [], T = 2 + Math.random() * 1.2, dir = Math.random() * 6.283, ph = Math.random() * 6;
    for (let t = 0; t <= T; t += 0.06) { const u = t / T, rr = rad * (0.12 + 0.88 * u) * (1 + 0.14 * Math.sin(t * 9 + ph)), a = t * 6.283 + ph;
      p.push([x + Math.cos(dir) * rad * 0.35 * u + Math.cos(a) * rr, y + Math.sin(dir) * rad * 0.35 * u + Math.sin(a) * rr]); }
    return p; };
  // a splat: a drop of paint that hit and spread a little unevenly, with a few tiny flecks thrown off it
  const splat = (g, x, y, size, col) => {   // a sparse scatter of spray grit: fine dots, the odd slightly bigger fleck
    g.fillStyle = col; const n = 14 + (Math.random() * 36 | 0), px = Math.max(1, Math.min(devicePixelRatio || 1, 1.5));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * 6.283, d = size * 3 * Math.abs((Math.random() + Math.random() + Math.random() - 1.5) / 1.5), big = Math.random() < 0.06;
      const z = (big ? 1.6 + Math.random() * 1.2 : 0.5 + Math.random() * 1.1) * px;
      g.globalAlpha = 0.35 + Math.random() * 0.55; g.fillRect(x + Math.cos(a) * d, y + Math.sin(a) * d, z, z);
    }
    g.globalAlpha = 1;
  };
  // a line as a hand sprays it: it settles at the start, drifts and wobbles off its course, and overshoots at the end
  const human = (path, w) => {
    if (path.length < 6) return path;
    const out = [], A = w * (0.12 + Math.random() * 0.12), f1 = 6.283 / (120 + Math.random() * 260), f2 = 6.283 / (40 + Math.random() * 60), p1 = Math.random() * 6, p2 = Math.random() * 6;
    for (let k = 0; k < 9; k++) out.push(path[0]);   // the can pauses as the paint starts
    path.forEach((pt, i) => {
      const a = path[Math.max(0, i - 3)], b = path[Math.min(path.length - 1, i + 3)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const o = A * (Math.sin(i * f1 + p1) + 0.4 * Math.sin(i * f2 + p2)) * Math.min(1, i / 30);
      out.push([pt[0] - dy / l * o, pt[1] + dx / l * o]);
    });
    const e = out[out.length - 1], q = out[Math.max(0, out.length - 8)], dx = e[0] - q[0], dy = e[1] - q[1], l = Math.hypot(dx, dy) || 1, ov = w * Math.random() * 0.9, bend = (Math.random() - 0.5) * 0.8;
    for (let d = 2; d < ov; d += 2) out.push([e[0] + dx / l * d - dy / l * d * bend * d / ov, e[1] + dy / l * d + dx / l * d * bend * d / ov]);   // overshoot, curling off
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
  function run(cv, W, H, bg, strokes, gap = 220, done, instant) {
    const Q = RM || instant;   // all at once, no animation
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
    const halo = document.createElement('canvas'); halo.width = W; halo.height = H; const hg = halo.getContext('2d', { willReadFrequently: true });   // where the paint blooms into a lighter tint off its edge
    const dens = document.createElement('canvas'); dens.width = W; dens.height = H; const dg = dens.getContext('2d', { willReadFrequently: true });
    const lay = document.createElement('canvas'); lay.width = W; lay.height = H; const lg = lay.getContext('2d');
    const show = () => { g.clearRect(0, 0, W, H); g.drawImage(base, 0, 0); g.drawImage(lay, 0, 0); };
    show();

    let si = 0, at = 0, pr = wob(), sp = wob();
    // turn the density in a box into paint of this stroke's colour
    const ink = (s, x0, y0, x1, y1) => {
      x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(W, Math.ceil(x1)); y1 = Math.min(H, Math.ceil(y1));
      const w = x1 - x0, h = y1 - y0; if (w <= 0 || h <= 0) return;
      const dd = dg.getImageData(x0, y0, w, h).data, hd = hg.getImageData(x0, y0, w, h).data, out = lg.createImageData(w, h), o = out.data, [r, gg, b] = s.rgb, rim = s.rimRgb;
      const tn = s.rgb.map(v => v + (255 - v) * 0.5);   // the lighter tint of the same colour
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const i = (yy * w + xx) * 4, dv = dd[i + 3] / 255, hv = hd[i + 3] / 255; if (!dv && !hv) continue;
        const n = grain[(y0 + yy) * W + x0 + xx];
        let a = 0;
        if (dv) {
          if (s.brush) { const t = dv + (rough[(y0 + yy) * W + x0 + xx] - 0.5) * 0.5 + (n - 0.5) * 0.04; a = t > 0.44 ? 1 : t > 0.4 ? (t - 0.4) / 0.04 : 0; }   // dry brush: flat paint with a hard, ragged edge
          else if (s.soft) { a = (dv * 1.1 - n * 0.2) * 1.2; if (a > 0.97) a = 0.97; }   // airbrush: a smooth soft form with fine grain, no hard core
          else { a = (dv * (s.solid ? 1.9 : 1.25) - n * 0.62) * 2.4; if (a > 1) a = 1;
            const mist = (dv - n * 0.32) * 0.42; if (mist > a) a = mist; }   // the blowout: thin paint carried wide of the line
          if (a < 0) a = 0;
        }
        let ha = (hv * 1.7 - n * 0.35) * 0.6; if (ha < 0) ha = 0; if (ha > 0.6) ha = 0.6;
        if (a <= 0 && ha <= 0) continue;
        const sh = s.brush ? 1 : 0.9 + n * 0.2;
        let cr = r, cg = gg, cb = b;
        if (rim) { const t = Math.min(1, dv * (s.soft ? 1.25 : 1.6)) ** 1.6; cr = rim[0] + (r - rim[0]) * t; cg = rim[1] + (gg - rim[1]) * t; cb = rim[2] + (b - rim[2]) * t; }
        const A = a + ha * (1 - a), wa = a / A, wh = 1 - wa;   // the paint over its lighter bloom
        o[i] = (cr * wa + tn[0] * wh) * sh; o[i + 1] = (cg * wa + tn[1] * wh) * sh; o[i + 2] = (cb * wa + tn[2] * wh) * sh;
        o[i + 3] = A * (s.solid || s.brush ? 255 : 222);   // never quite opaque, so passes that cross build up on each other
      }
      lg.putImageData(out, x0, y0);
    };
    const step = () => {
      const s = strokes[si]; if (!s) return done && done();
      if (!s.rgb) { s.rgb = rgb(s.c); if (s.rim) s.rimRgb = rgb(s.rim); if (!s.soft && !s.exact) s.path = human(s.path, s.w * FAT); }
      const n = s.path.length, u = at / n, ease = 0.3 + 2.2 * u * u;   // each pass starts slow and finishes quick, like a confident hand
      const adv = Q ? n : Math.max(3, Math.round(s.speed * ease * (0.6 + 0.8 * sp(at))));
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (let e = Math.min(n - 1, at + adv); at <= e; at += 3) {
        const [x, y] = s.path[at], f = Math.min(1, at / 24, (n - at) / 24), p = pr(at) * (0.35 + 0.65 * f) * Math.min(1, 1.25 / Math.sqrt(0.3 + 2.2 * (at / n) ** 2));   // and thins out as it speeds up
        const R = s.w * FAT * 0.5 * (s.brush || s.taper ? Math.max(0.12, Math.min(1, (n - at) / (n * 0.4), 0.7 + at / (n * 0.3))) : 0.8 + 0.45 * (1 - p));   // a brush stroke lands blunt and flicks off to a point
        dg.globalAlpha = s.soft ? Math.min(0.6, (1 - Math.pow(0.04, 3 / n)) * (0.7 + 0.5 * p)) : Math.min(0.5, (1 - Math.pow(0.08, 3 / R)) * (0.4 + p) * 1.05);
        dg.drawImage(PUFF, x - R, y - R, 2 * R, 2 * R);   // (an airbrushed form builds to a full core over its few turns)
        const B = R * (2 + 0.8 * p); if (!s.brush) { dg.globalAlpha = Math.min(0.08, (1 - Math.pow(0.6, 3 / B)) * (0.3 + p)); dg.drawImage(PUFF, x - B, y - B, 2 * B, 2 * B); }   // the wider mist round the nozzle; build to the same body
        if (!s.brush && Math.random() < 0.12) {   // stray spits of paint, some well clear of the line
          dg.globalAlpha = 0.1 + Math.random() * 0.25; const a = Math.random() * 6.283, d = R * (0.8 + Math.random() * Math.random() * 3.5), rr = R * (0.08 + Math.random() * 0.3);
          dg.drawImage(PUFF, x + Math.cos(a) * d - rr, y + Math.sin(a) * d - rr, 2 * rr, 2 * rr);
        }
        if (!s.soft && !s.brush && !s.solid) {   // the lighter bloom: where the hand turns a corner or moves fast, not all the way round
          const pa = s.path[Math.max(0, at - 8)], pb = s.path[Math.min(n - 1, at + 8)], ax = x - pa[0], ay = y - pa[1], bx = pb[0] - x, by = pb[1] - y;
          const turn = 1 - (ax * bx + ay * by) / ((Math.hypot(ax, ay) * Math.hypot(bx, by)) || 1), fast = Math.max(0, (0.3 + 2.2 * (at / n) ** 2) - 1.2);
          const wgt = Math.min(1, turn * 3 + fast * 0.6) * (0.6 + 0.4 * Math.sin(at * 0.05 + s.w));
          if (wgt > 0.05) { const HR = R * (1.55 + 0.4 * wgt); hg.globalAlpha = 0.09 * wgt; hg.drawImage(PUFF, x - HR, y - HR, 2 * HR, 2 * HR); }
        }
        x0 = Math.min(x0, x - 3.2 * R); y0 = Math.min(y0, y - 3.2 * R); x1 = Math.max(x1, x + 3.2 * R); y1 = Math.max(y1, y + 3.2 * R);
      }
      ink(s, x0, y0, x1, y1); show();
      if (at >= n - 1) {   // this pass is done: fix it into the base and start the next on a clean density layer
        bgc.drawImage(lay, 0, 0); lg.clearRect(0, 0, W, H); dg.clearRect(0, 0, W, H); hg.clearRect(0, 0, W, H); dg.globalAlpha = 1;
        if (s.drops) {   // a few hard droplets of a second colour, flicked off the can
          bgc.fillStyle = s.drops; const nd = 8 + (Math.random() * 18 | 0), sz = Math.max(1.2, s.w / 60);
          for (let d = 0; d < nd; d++) {
            const [px, py] = s.path[Math.random() * s.path.length | 0], an = Math.random() * 6.283, dist = s.w * (0.2 + Math.random() * 1.4);
            bgc.globalAlpha = 0.6 + Math.random() * 0.4; bgc.beginPath(); bgc.arc(px + Math.cos(an) * dist, py + Math.sin(an) * dist, sz * (0.5 + Math.random() * 1.8), 0, 6.283); bgc.fill();
          }
          bgc.globalAlpha = 1; show();
        }
        si++; at = 0; pr = wob(); sp = wob();
        if (Q) return step();
        return setTimeout(() => requestAnimationFrame(step), gap + Math.random() * 160);
      }
      Q ? step() : requestAnimationFrame(step);
    };
    step();
  }

  // the second colour each paint shifts to at its edge (after the references: orange into pink, blue into green, red into pink)
  const RIM = { '#ff6a1f': '#ff2f7a', '#ff7a2b': '#ff2f7a', '#ffd23f': '#ff8a1f', '#ff3a1a': '#ff2f7a', '#2f63ff': '#22c55e', '#1f3fd1': '#3ad06a',
                '#5bb8e6': '#1f3fd1', '#2b6a3e': '#9be15d', '#1f2a4d': '#5b6cff', '#f6c9de': '#ffffff', '#ff8a1f': '#ff2f7a' };
  // an airbrushed soft form: a few slow turns of the can on one spot (x, y, size in the art's 0-1000 units)
  const blob = (c, x, y, size) => ({ c, rim: RIM[c], soft: true, w: size, speed: 14, pts: spiral(x, y, size * 0.16) });

  // placeholder pictures
  function picture(cv) {
    const art = ART[cv.dataset.spray]; if (!art) return;
    const r = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.max(2, Math.round(cv.clientWidth * r)), H = cv.height = Math.max(2, Math.round(cv.clientHeight * r));
    const SY = Math.max(H, W / 1.6), k = Math.min(W, SY) / 1000;   // wide boxes crop into the middle of the piece rather than squashing it
    const map = ([x, y]) => [x / 1000 * W, H / 2 + (0.76 * y / 1000 - 0.38) * SY];
    const J = () => (Math.random() - 0.5) * 80;
    run(cv, W, H, art.bg, art.strokes.map(s => {
      const pts = s.soft ? spiral(s.pts.reduce((a, p) => a + p[0], 0) / s.pts.length + J(), s.pts.reduce((a, p) => a + p[1], 0) / s.pts.length + J(), s.w * 0.16) : s.pts.map(([x, y]) => [x + J(), y + J()]);
      return { ...s, w: s.w * k * (0.85 + Math.random() * 0.3), speed: (s.speed || 30) * Math.max(1, k * 1.5), path: curve(pts.map(map)) };
    }), 220, null, !ANIM);   // painted as it is, except on Information
  }



  const watch = (sel, fn, delay, margin) => {
    const els = [...document.querySelectorAll(sel)]; if (!els.length) return;
    if (!('IntersectionObserver' in window)) return els.forEach(fn);
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting || !e.target.clientWidth) return;
      io.unobserve(e.target);
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => setTimeout(() => fn(e.target), RM ? 0 : delay));
    }), margin ? { rootMargin: margin } : { threshold: 0.4 });
    els.forEach(c => io.observe(c));
  };
  /* ---------- What We Do (Information): each service's picture is sprayed over its colour the first time it comes up.
     The pictures are SVGs that wd.js crops and clones, so the paint goes on a canvas laid over each one, lined up with
     the SVG's own coordinates; the last picture's paint is then copied into the clone that flies down into step 01. ---------- */
  const ring = (cx, cy, rx, ry) => {   // never a true circle: the radius breathes, the centre drifts, the ends don't meet neatly
    const p = [], a0 = Math.random() * 6.283, a1 = a0 + 6.283 + (Math.random() - 0.4) * 1.2, ph = Math.random() * 6, dx = (Math.random() - 0.5) * rx * 0.4, dy = (Math.random() - 0.5) * ry * 0.4;
    for (let t = a0; t <= a1; t += 0.26) { const u = (t - a0) / (a1 - a0), k = 1 + 0.12 * Math.sin(t * 2 + ph) + 0.06 * Math.sin(t * 5 + ph); p.push([cx + dx * u + Math.cos(t) * rx * k, cy + dy * u + Math.sin(t) * ry * k]); }
    return p; };
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
  const overSvg = (svg, cv, art, done, instant, area) => {
    const box = area || cv.getBoundingClientRect(), m = svg.getScreenCTM();   // area: paint a given screen rectangle instead of the canvas's own if (!box.width || !m) return false;
    const r = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.round(box.width * r), H = cv.height = Math.round(box.height * r);
    const vb = svg.viewBox.baseVal, vy = vb.y, vH = vb.height || 1000;
    // cropped in and tilted a different way each time, with a little wobble in the hand, so no two sit square
    const rot = (Math.random() - 0.5) * 0.5, zoom = 1.15 + Math.random() * 0.2, sxg = Math.random() < 0.5 ? -1 : 1, syg = Math.random() < 0.5 ? -1 : 1, ox = sxg * (120 + Math.random() * 90), oy = syg * (100 + Math.random() * 90);   // asymmetric: the mass sits on a thirds point, not the middle
    const map = ([x0, y0]) => {
      const dx = (x0 - 500) * zoom, dy = (y0 - 500) * zoom, x = 500 + ox + dx * Math.cos(rot) - dy * Math.sin(rot), y = 500 + oy + dx * Math.sin(rot) + dy * Math.cos(rot);
      return [x / 1000 * W, y / 1000 * H];   // over the whole picture box, whatever band of the drawing shows
    };
    const jig = pts => pts.map(([x, y]) => [x + (Math.random() - 0.5) * 110, y + (Math.random() - 0.5) * 110]);
    // mixed technique, as on the Work thumbnails: the first pass fat and slow, the rest a mix of medium and thin quick ones,
    // and a thin cream tag scrawled across a corner to finish
    const k = m.a * r * zoom * 0.8, strokes = art.map(([c, w, pts], i) => {
      const t = (i === 0 ? 1.25 : [0.95, 0.7, 0.42][Math.random() * 3 | 0]) * Math.min(1.1, 900 / vH);
      return { c, w: w * t * k, speed: (i === 0 ? 26 : 32 + (1.5 - t) * 30) * r, path: curve(jig(pts).map(map)) };
    });
    const n = 3 + (Math.random() * 4 | 0), a = Math.random() * 6.283, step = 40 + Math.random() * 50, amp = 30 + Math.random() * 80, tag = [];
    let tx = 500 - sxg * (230 + Math.random() * 120) - ox, ty = 500 - syg * (200 + Math.random() * 120) - oy;   // and the tag is its counterweight, in the opposite corner
    for (let j = 0; j < n; j++) { const side = (j % 2 ? -1 : 1) * amp * (0.5 + Math.random()); tag.push([tx - Math.sin(a) * side, ty + Math.cos(a) * side]); tx += Math.cos(a) * step; ty += Math.sin(a) * step; }
    strokes.push({ c: art.tag || '#f1eee7', w: (16 + Math.random() * 14) * k, speed: 60 * r, path: curve(tag.map(map)) });
    // after the references: sometimes a soft airbrushed form behind, the main pass shifting colour at its edge, droplets
    const c0 = art[0][0];
    if (RIM[c0] && Math.random() < 0.7) strokes[0].rim = RIM[c0];
    if (Math.random() < 0.6) strokes[0].drops = ['#1f2a4d', '#ff2f7a', '#f1eee7', '#1f3fd1'].filter(c => c !== c0)[Math.random() * 3 | 0];
    if (Math.random() < 0.85) { const b = blob(c0, 200 + Math.random() * 600, 200 + Math.random() * 600, 380 + Math.random() * 200);
      strokes.unshift({ ...b, w: b.w * k, speed: 14 * r, path: curve(b.pts.map(map)) }); }
    run(cv, W, H, null, strokes, 160, done && (() => done({ url: cv.toDataURL('image/png'), x: (box.left - m.e) / m.a, y: (box.top - m.f) / m.d, w: box.width / m.a, h: box.height / m.d })), instant);
    return true;
  };
  const pics = [...document.querySelectorAll('.wd-pic')];
  const copies = [document.querySelector('.wd-fly svg'), document.querySelector('.wd-sec .st .st-pat')].filter(Boolean);
  if (pics.length) copies.forEach(t => t.classList.add('sprayed'));   // the copies of the last picture wait for its paint rather than showing the old shapes
  pics.forEach((pic, i) => {
    const art = WD[i], svg = pic.querySelector('svg'); if (!art || !svg) return;
    const cv = document.createElement('canvas'); cv.className = 'wd-spray'; cv.setAttribute('aria-hidden', 'true'); pic.appendChild(cv);
    pic.classList.add('sprayed');
    const last = i === pics.length - 1, fly = copies.find(t => t.closest('.wd-fly')), dest = copies.find(t => !t.closest('.wd-fly'));
    const go = () => {
      if (pic.dataset.sprayed) return;
      if (last) {
        // Digital: one painting, placed in the drawing's own coordinates (as the old flat shapes were), so this picture, the copy
        // that flies down and step 01 all look through their frames at the same image and nothing jumps between them
        const m = svg.getScreenCTM(), b1 = pic.getBoundingClientRect(); if (!m || !b1.width) return;
        const U = [b1], md = dest && dest.getScreenCTM(); if (md) U.push(dest.getBoundingClientRect());
        const us = U.map((b, j) => { const q = j ? md : m; return [(b.left - q.e) / q.a, (b.top - q.f) / q.d, (b.right - q.e) / q.a, (b.bottom - q.f) / q.d]; });
        let x0 = Math.min(...us.map(v => v[0])), y0 = Math.min(...us.map(v => v[1])), x1 = Math.max(...us.map(v => v[2])), y1 = Math.max(...us.map(v => v[3]));
        const pad = (y1 - y0) * 0.25; y0 -= pad; y1 += pad;   // room for the drift as it flies
        const area = { left: m.a * x0 + m.e, top: m.d * y0 + m.f, width: (x1 - x0) * m.a, height: (y1 - y0) * m.d };
        area.right = area.left + area.width; area.bottom = area.top + area.height;
        const off = document.createElement('canvas');
        if (overSvg(svg, off, art, ({ url, x, y, w, h }) => [svg, fly, dest].forEach(t => {
          if (!t || t.querySelector('image.wd-paint')) return;
          const im = document.createElementNS('http://www.w3.org/2000/svg', 'image');
          im.setAttribute('class', 'wd-paint'); im.setAttribute('href', url); im.setAttribute('x', x); im.setAttribute('y', y); im.setAttribute('width', w); im.setAttribute('height', h); im.setAttribute('preserveAspectRatio', 'none');
          t.appendChild(im); t.classList.add('sprayed');
        }), true, area)) { pic.dataset.sprayed = '1'; cv.remove(); }
        return;
      }
      if (overSvg(svg, cv, art, null, !ANIM)) pic.dataset.sprayed = '1';
    };
    if (!ANIM || i === pics.length - 1) {   // painted already (all at once, before you get there), so its hand-off into Listen is smooth
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { go(); if (pic.dataset.sprayed) io.disconnect(); } }, { rootMargin: '100% 0px' });
      io.observe(pic.closest('.wd') || pic);
      return;
    }
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
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && overSvg(svg, cv, art, null, !ANIM)) io.disconnect(); }), ANIM ? { threshold: 0.4 } : { rootMargin: '60% 0px' });
    io.observe(cv);
  });

  /* ---------- Craft | AI (Information): Craft gets graphic spray over its blue, AI an airbrushed gradient. Each sprays the
     first time its side is picked (the panel shows a side's pattern by giving it .dim) ---------- */
  const CRAFT = [['#ff3a1a', 150, [[120, 260], [480, 140], [820, 330], [600, 520], [260, 420], [420, 260]]], ['#ff3a1a', 90, [[160, 760], [380, 640], [560, 820], [780, 660], [900, 840]]],
                 ['#f1eee7', 40, [[620, 880], [700, 800], [760, 900], [840, 810]]], ['#ff3a1a', 70, ring(820, 560, 70, 70)]];
  const onPick = (half, fn) => {
    if (!ANIM) { const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting) && !half.dataset.sprayed) { half.dataset.sprayed = '1'; io.disconnect(); fn(); } }, { rootMargin: '60% 0px' }); io.observe(half); return; }
    const go = () => { if (half.classList.contains('dim') && !half.dataset.sprayed) { half.dataset.sprayed = '1'; fn(); } };
    new MutationObserver(go).observe(half, { attributes: true, attributeFilter: ['class'] }); go();
  };
  const craft = document.querySelector('.hv-half[data-k=craft]');
  if (craft) {
    const svg = craft.querySelector('svg.hv-pat'), cv = document.createElement('canvas'); cv.className = 'hv-spray'; cv.setAttribute('aria-hidden', 'true');
    if (svg) { svg.after(cv); svg.classList.add('sprayed'); onPick(craft, () => setTimeout(() => overSvg(svg, cv, CRAFT, null, !ANIM), ANIM ? 150 : 0)); }
  }
  // AI: full bleed, two airbrushed gradients overlapping (navy into green, magenta into orange), each with a couple of small
  // hotter glows in it, after Joe's references. Still.
  function aiGlow(cv) {
    const px = cv.clientWidth * cv.clientHeight, sc = Math.min(Math.min(devicePixelRatio || 1, 1.5), Math.sqrt(2.6e6 / Math.max(1, px)));
    const W = cv.width = Math.max(2, Math.round(cv.clientWidth * sc)), H = cv.height = Math.max(2, Math.round(cv.clientHeight * sc));
    const g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data, R1 = (a, b) => a + Math.random() * (b - a), U = Math.max(W, H);
    const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
    const form = (x, y, s, a, r = R1(0.55, 1)) => { const t = Math.random() * 3.14; return { x, y, sx: s, sy: s * r, c: Math.cos(t), sn: Math.sin(t), a }; };
    const groups = [
      { core: '#ff4a12', rim: '#ffc21f', heat: '#e8204f', x: R1(0.22, 0.34), y: R1(0.22, 0.38), pinch: true },
      { core: '#ff3d7f', rim: '#ffa17a', heat: '#ff7a1f', x: R1(0.66, 0.8), y: R1(0.62, 0.8) },
    ].map(G => {
      const s0 = U * R1(0.13, 0.17), cx = G.x * W, cy = G.y * H, forms = [], heats = [];
      if (G.pinch) { const a = R1(0.75, 1.05), dd = s0 * 1.9; forms.push(form(cx - Math.cos(a) * dd / 2, cy - Math.sin(a) * dd / 2, s0 * 0.85, 1), form(cx + Math.cos(a) * dd / 2, cy + Math.sin(a) * dd / 2, s0 * 0.8, 1)); }
      else { forms.push(form(cx, cy, s0, 1)); for (let k = 0; k < 2; k++) { const a = Math.random() * 6.283; forms.push(form(cx + Math.cos(a) * s0 * 1.4, cy + Math.sin(a) * s0 * 1.4, s0 * R1(0.45, 0.65), 0.85)); } }
      forms.forEach(f => { if (heats.length < 2) heats.push(form(f.x + R1(-0.35, 0.35) * f.sx, f.y + R1(-0.35, 0.35) * f.sy, f.sx * R1(0.5, 0.75), 1, R1(0.7, 1))); });
      return { core: rgb(G.core), rim: rgb(G.rim), heat: rgb(G.heat), forms, heats, f: new Float32Array(W * H), F: new Float32Array(W * H), h: new Float32Array(W * H), m1: 0, m2: 0, m3: 0 };
    });
    const wa = U * R1(0.03, 0.06), f1 = R1(2, 4) / U, f2 = R1(2, 4) / U, p1 = Math.random() * 6, p2 = Math.random() * 6;
    const field = (o, X, Y, div) => { const dx = X - o.x, dy = Y - o.y, rx = dx * o.c + dy * o.sn, ry = -dx * o.sn + dy * o.c; return o.a * Math.exp(-(rx * rx / (o.sx * o.sx) + ry * ry / (o.sy * o.sy)) / div); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = x + wa * Math.sin(y * f1 + p1), Y = y + wa * Math.sin(x * f2 + p2), i = y * W + x;
      for (const G of groups) {
        let f = 0, F = 0, h = 0; for (const o of G.forms) { f += field(o, X, Y, 2); F += field(o, X, Y, 16); } for (const o of G.heats) h += field(o, X, Y, 3);
        G.f[i] = f; G.F[i] = F; G.h[i] = h; if (f > G.m1) G.m1 = f; if (F > G.m2) G.m2 = F; if (h > G.m3) G.m3 = h;
      }
    }
    for (let i = 0, j = 0; i < W * H; i++, j += 4) {
      const n = Math.random(); let A = 0, R = 0, Gc = 0, B = 0;
      for (let gi = groups.length - 1; gi >= 0; gi--) {   // the second gradient under the first
        const G = groups[gi], t = G.f[i] / G.m1, T = G.F[i] / G.m2, hh = ss(0.1, 1, G.h[i] / G.m3) * 0.5;   // a soft, low-key heat
        let a = Math.max(Math.pow(ss(0, 0.95, T + (n - 0.5) * 0.08), 1.3) * 0.8, ss(0.05, 0.6, t) * 0.92);   // soft and a little see-through, like the first gradient
        const m = ss(0.08, 0.95, t + (n - 0.5) * 0.05);
        let r = G.rim[0] + (G.core[0] - G.rim[0]) * m, gg = G.rim[1] + (G.core[1] - G.rim[1]) * m, b = G.rim[2] + (G.core[2] - G.rim[2]) * m;
        r += (G.heat[0] - r) * hh; gg += (G.heat[1] - gg) * hh; b += (G.heat[2] - b) * hh;   // the hotter glow inside it
        const na = a + A * (1 - a); if (na > 0) { R = (r * a + R * A * (1 - a)) / na; Gc = (gg * a + Gc * A * (1 - a)) / na; B = (b * a + B * A * (1 - a)) / na; } A = na;
      }
      const sh = 0.94 + n * 0.12;
      d[j] = R * sh; d[j + 1] = Gc * sh; d[j + 2] = B * sh; d[j + 3] = A * 255;
    }
    g.putImageData(img, 0, 0);
  }
  const aiPat = document.querySelector('.hv-half[data-k=ai] .hv-grad');
  if (aiPat) {
    const cv = document.createElement('canvas'); cv.className = 'hv-air'; cv.setAttribute('aria-hidden', 'true'); aiPat.appendChild(cv); aiPat.classList.add('sprayed');
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); aiGlow(cv); } }, { rootMargin: '60% 0px' });
    io.observe(aiPat);
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
    // light touch: the paint keeps to the edges and corners and runs off them, so the picture still reads
    const r = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.round(cv.clientWidth * r), H = cv.height = Math.round(cv.clientHeight * r), u = Math.min(W, H);
    const pick = a => a[Math.random() * a.length | 0], R1 = (a, b) => a + Math.random() * (b - a), strokes = [];
    const c = lime ? '#d6ffa3' : pick(BRIGHT), c2 = pick(BRIGHT.filter(x => x !== c));
    const corner = () => [Math.random() < 0.5 ? 0 : 1, Math.random() < 0.5 ? 0 : 1], after = [];
    const sweep = () => {   // in from one edge, round the corner, out through the other
      const [cx, cy] = corner(), X = v => (cx ? 1 - v : v) * W, Y = v => (cy ? 1 - v : v) * H;
      strokes.push({ c, rim: RIM[c], w: u * R1(0.04, 0.07), speed: 40 * r, drops: Math.random() < 0.5 ? c2 : null,
        path: curve([[X(-0.06), Y(R1(0.25, 0.45))], [X(R1(0.08, 0.16)), Y(R1(0.08, 0.16))], [X(R1(0.25, 0.45)), Y(-0.06)]]) });
    };
    const puff = () => { const [cx, cy] = corner(); strokes.push({ c, rim: RIM[c], soft: true, w: u * R1(0.2, 0.32), speed: 12 * r, path: curve(spiral(cx * W + R1(-0.04, 0.04) * W, cy * H + R1(-0.04, 0.04) * H, u * R1(0.03, 0.05))) }); };
    const splats = () => {   // a few small splats flicked along one edge
      const side = Math.random() * 4 | 0, n = 3 + (Math.random() * 6 | 0), t0 = R1(0.1, 0.7), col = Math.random() < 0.6 ? c : c2;
      for (let k = 0; k < n; k++) {
        const t = t0 + R1(0, 0.25), d = R1(0, 0.08), x = side === 0 ? t * W : side === 1 ? W - d * W : side === 2 ? t * W : d * W, y = side === 0 ? d * H : side === 1 ? t * H : side === 2 ? H - d * H : t * H;
        after.push([x, y, u * R1(0.004, 0.013), col]);
      }
    };
    const kinds = [sweep, puff, splats]; kinds.sort(() => Math.random() - 0.5);
    kinds[0](); if (Math.random() < 0.55) kinds[1]();
    run(cv, W, H, null, strokes, 140, () => { const g = cv.getContext('2d'); after.forEach(([x, y, z, col]) => splat(g, x, y, z, col)); }, true);   // on photography the paint is simply there
  }
  const imgs = [...document.querySelectorAll('img')].filter(img => {
    if (img.closest('.logo, #intro, .wc-slot, .wd-pic, header, nav') || /swallow|portrait|cow/.test(img.src)) return false;
    const p = img.parentElement, ps = p && getComputedStyle(p).position;
    return p && ps !== 'static' && (getComputedStyle(img).position === 'absolute' || (img.offsetWidth >= p.clientWidth - 2 && img.offsetHeight >= p.clientHeight - 2));
  });
  imgs.forEach(img => {
    const lime = /620-clean/.test(img.src);
    if (!lime && Math.random() > 0.28) return;
    const cv = document.createElement('canvas'); cv.className = 'photo-spray'; cv.setAttribute('aria-hidden', 'true'); img.after(cv);
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && cv.clientWidth > 60) { io.disconnect(); photo(img, cv, lime); } }), { rootMargin: '60% 0px' });   // painted just before it scrolls in
    io.observe(cv);
  });

  /* ---------- the statement: soft airbrushed glows behind it (after Joe's references): a few soft forms that run into one,
     a deep core shading out to a second colour at the rim, and a long fall-off into fine grain. It builds up from the middle. ---------- */
  // deep core against a contrasting rim (never blue on blue)
  const GLOWS = [['#ee3a17', '#f7b21e'], ['#262163', '#5ee03a'], ['#1c2fa8', '#ff8a2a'], ['#5a1fb8', '#ff7ab0'], ['#d4145a', '#ffa23a'], ['#0f5e3c', '#d6f24a']];
  function glow(cv, opt = {}) {
    const px = cv.clientWidth * cv.clientHeight, sc = Math.min(Math.min(devicePixelRatio || 1, 1.5), Math.sqrt(2.6e6 / Math.max(1, px)));   // full resolution, so the grain is fine
    const W = cv.width = Math.max(2, Math.round(cv.clientWidth * sc)), H = cv.height = Math.max(2, Math.round(cv.clientHeight * sc));
    const g = cv.getContext('2d'), img = g.createImageData(W, H), d = img.data, R1 = (a, b) => a + Math.random() * (b - a);
    const [core, rim] = (opt.pair || GLOWS[Math.random() * GLOWS.length | 0]).map(rgb), u = Math.min(W * (opt.fill || 0.4), H * 0.55);
    // the forms: each stretched and tilted its own way; one large, off centre, others running into it (or two lobes pinched)
    const form = (x, y, s, a) => { const r = R1(0.55, 1), t = Math.random() * 3.14; return { x, y, sx: s, sy: s * r, c: Math.cos(t), sn: Math.sin(t), a }; };
    const cx = W * (opt.pinch ? 0.5 + R1(-0.06, 0.06) : 0.5 + R1(0.08, 0.16) * (Math.random() < 0.5 ? -1 : 1)), cy = H * (opt.pinch ? 0.4 : 0.5 + R1(-0.06, 0.08)), s0 = u * R1(0.2, 0.26), forms = [form(cx, cy, s0, 1)];
    let sprayLine = null;
    if (!opt.pinch) {
      // a sprayed line: soft forms strung along a gentle curve, thinner at its ends, and a round form off one end
      forms.length = 0;
      const dir = Math.random() < 0.5 ? 1 : -1, x0 = W * R1(0.18, 0.3), x1 = W * R1(0.62, 0.78), y0 = H * (0.5 + dir * R1(0.04, 0.12)), y1 = H * (0.5 - dir * R1(0.02, 0.1)), bow = H * R1(-0.08, 0.08), N = 16;
      const pts = []; for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([x0 + (x1 - x0) * t + R1(-0.02, 0.02) * W, y0 + (y1 - y0) * t + bow * Math.sin(Math.PI * t) + R1(-0.02, 0.02) * H]); }
      sprayLine = { taper: true, c: opt.lineC, rim: opt.lineRim, w: u * R1(0.1, 0.14), speed: 99, path: curve(pts) };
      const end = Math.random() < 0.5, ex = end ? x1 : x0, ey = end ? y1 : y0, ca = Math.random() * 6.283, cd = u * R1(0.32, 0.46);
      forms.push(form(ex + Math.cos(ca) * cd, ey + Math.sin(ca) * cd * 0.6, u * R1(0.2, 0.26), 1.15, R1(0.88, 1)));
    } else {      const a = opt.pinch ? R1(0.75, 1.05) : R1(-0.9, 0.9) + Math.PI / 2, dd = s0 * R1(1.75, 2.1); forms[0].sx *= 0.85; forms[0].sy *= 0.85; /* two lobes with a pinch between them */
      if (opt.pinch) { forms[0].x = W * 0.5 - Math.cos(a) * dd / 2; forms[0].y = H * 0.5 - Math.sin(a) * dd / 2; }   // centred on the panel, top left to bottom right
      forms.push(form(forms[0].x + Math.cos(a) * dd, forms[0].y + Math.sin(a) * dd, s0 * R1(0.8, 1.05), 1));
    }
    // a gentle warp of the whole field, so no edge is a clean curve
    const wa = u * R1(0.06, 0.12), f1 = R1(1.5, 3) / u, f2 = R1(1.5, 3) / u, p1 = Math.random() * 6, p2 = Math.random() * 6;
    const grain = new Float32Array(W * H); for (let i = 0; i < grain.length; i++) grain[i] = Math.random();
    const core2 = new Float32Array(W * H), wide = new Float32Array(W * H); let m1 = 0, m2 = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const X = x + wa * Math.sin(y * f1 + p1), Y = y + wa * Math.sin(x * f2 + p2); let f = 0, F = 0;
      for (const o of forms) { const dx = X - o.x, dy = Y - o.y, rx = dx * o.c + dy * o.sn, ry = -dx * o.sn + dy * o.c, q = rx * rx / (o.sx * o.sx) + ry * ry / (o.sy * o.sy); f += o.a * Math.exp(-q / 2); F += o.a * Math.exp(-q / 13); /* the rim flare: very wide */ }
      const i = y * W + x; core2[i] = f; wide[i] = F; if (f > m1) m1 = f; if (F > m2) m2 = F;
    }
    const ss = (a, b, t) => { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); };
    const draw = k => {   // k: how far it has built up, 0 to 1
      for (let i = 0, j = 0; i < core2.length; i++, j += 4) {
        const t = core2[i] / m1 * (0.3 + 0.7 * k), T = wide[i] / m2 * (0.3 + 0.7 * k), n = grain[i];
        const ex = (i % W) / W, ey = (i / W | 0) / H, edge = ss(0, 0.14, Math.min(ex, 1 - ex, ey, 1 - ey));   // fades out before the canvas's edge, so it is never cut
        const a = Math.max(Math.pow(ss(0, 0.9, T + (n - 0.5) * 0.1), 1.4) * 0.93, ss(0.05, 0.45, t)) * k * edge;   // fading out very gradually over a long way   // the rim colour flares out wide; the core sits inside it
        if (a <= 0.004) { d[j + 3] = 0; continue; }
        const m = ss(0.25, 0.9, t + (n - 0.5) * 0.05), sh = 0.93 + n * 0.14;
        d[j] = (rim[0] + (core[0] - rim[0]) * m) * sh; d[j + 1] = (rim[1] + (core[1] - rim[1]) * m) * sh; d[j + 2] = (rim[2] + (core[2] - rim[2]) * m) * sh; d[j + 3] = Math.min(1, a) * 255;
      }
      g.putImageData(img, 0, 0);
    };
    draw(1);   // drawn once; the build-up is a fade and grow in CSS
    if (sprayLine) {   // the line itself is a spray-can stroke, over the glow
      sprayLine.c = sprayLine.c || '#' + core.map(v => v.toString(16).padStart(2, '0')).join(''); sprayLine.rim = sprayLine.rim || '#' + rim.map(v => v.toString(16).padStart(2, '0')).join('');
      const off = document.createElement('canvas'); off.width = W; off.height = H;
      run(off, W, H, null, [sprayLine], 0, () => g.drawImage(off, 0, 0), true);
    }
    requestAnimationFrame(() => cv.classList.add('on'));
  }
  watch('canvas.ca-glow', glow, 400);

  watch('canvas.spray', picture, 0, ANIM ? null : '60% 0px');
})();
