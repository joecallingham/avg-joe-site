/* Placeholder pictures, spray-painted: each mark is sprayed on along its path the first time it comes into view.
   Dots scatter around the nozzle with a pressure that wanders, so the paint builds unevenly and never goes solid,
   on a grainy paper. <canvas class="spray" data-spray="re|ps|lta"> */
(() => {
  const ART = {
    // Royal Enfield: an orange loop with a navy tag under it
    re: { paper: '#f1efea', strokes: [
      { c: '#ff6a1f', w: 120, pts: [[170, 260], [430, 170], [700, 250], [770, 500], [580, 700], [330, 650], [290, 460], [470, 370], [640, 460], [610, 600], [470, 620], [560, 760], [870, 860]] },
      { c: '#1f2a4d', w: 64, pts: [[110, 840], [300, 780], [520, 820], [780, 760]] } ] },
    // Papa Salt: a sky-blue snake with a yellow ring
    ps: { paper: '#f3f1ec', strokes: [
      { c: '#5bb8e6', w: 130, pts: [[260, 110], [720, 190], [300, 340], [720, 440], [280, 580], [700, 680], [330, 820], [660, 920]] },
      { c: '#ffc21f', w: 84, pts: [[800, 170], [880, 250], [820, 350], [720, 300], [740, 190], [820, 170]] } ] },
    // Lower Than Atlantis: a black tag, a red sweep and a drip
    lta: { paper: '#efeee9', strokes: [
      { c: '#161616', w: 50, pts: [[150, 400], [300, 300], [250, 580]] },
      { c: '#161616', w: 50, pts: [[340, 320], [380, 610]] },
      { c: '#161616', w: 50, pts: [[420, 470], [530, 380], [570, 570], [470, 610], [430, 520]] },
      { c: '#161616', w: 50, pts: [[610, 340], [650, 640]] },
      { c: '#161616', w: 34, pts: [[651, 640], [653, 760]] },
      { c: '#161616', w: 50, pts: [[690, 430], [830, 380], [870, 610]] },
      { c: '#ff3a1a', w: 104, pts: [[110, 770], [450, 690], [900, 740]] } ] },
  };
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // a smooth curve through the points (Catmull-Rom), as a list of points about 2px apart
  const curve = pts => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      const n = Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2);
      for (let k = 0; k < n; k++) {
        const t = k / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  };
  // slow wobble for the nozzle pressure and speed
  const wob = seed => { const a = Math.random() * 6, b = Math.random() * 6; return t => 0.5 + 0.3 * Math.sin(t * 0.013 + a + seed) + 0.2 * Math.sin(t * 0.041 + b); };
  const gauss = () => (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2;   // about -1..1, bunched in the middle
  const rgb = hex => { const n = parseInt(hex.slice(1).replace(/^(.)(.)(.)$/, '$1$1$2$2$3$3'), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

  // the soft cloud of one puff, in a stroke's colour
  const brush = c => {
    const b = document.createElement('canvas'); b.width = b.height = 128; const x = b.getContext('2d');
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, c); gr.addColorStop(0.45, c + '90'); gr.addColorStop(1, c + '00');
    x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return b;
  };

  function paint(cv) {
    const art = ART[cv.dataset.spray]; if (!art || cv.dataset.done) return; cv.dataset.done = '1';
    const r = Math.min(devicePixelRatio || 1, 1.5), W = cv.width = Math.max(2, Math.round(cv.clientWidth * r)), H = cv.height = Math.max(2, Math.round(cv.clientHeight * r));
    const g = cv.getContext('2d'), SY = Math.max(H, W / 1.6), k = Math.min(W, SY) / 700;   // wide boxes crop into the middle of the piece rather than squashing it
    // the paper, with grain
    g.fillStyle = art.paper; g.fillRect(0, 0, W, H);
    const img = g.getImageData(0, 0, W, H), d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = (Math.random() - 0.5) * 22; d[i] += v; d[i + 1] += v; d[i + 2] += v; }
    g.putImageData(img, 0, 0);

    const strokes = art.strokes.map((s, i) => ({ ...s, rgb: rgb(s.c), path: curve(s.pts.map(([x, y]) => [x / 1000 * W, H / 2 + (0.76 * y / 1000 - 0.38) * SY])), brush: brush(s.c), at: 0, p: wob(i * 3), v: wob(i * 7 + 1) }));
    let si = 0;
    const spray = (s, x, y, pr) => {   // one puff of the can: a soft cloud that builds up, then the grain of the droplets
      const R = s.w * k * 0.62 * (0.75 + 0.6 * (1 - pr)), [cr, cg, cb] = s.rgb;
      g.globalAlpha = 0.022 * pr; g.drawImage(s.brush, x - R * 0.8, y - R * 0.8, R * 1.6, R * 1.6); g.globalAlpha = 1;
      const n = Math.round(R * R * 0.03 * (0.4 + pr));
      for (let j = 0; j < n; j++) {
        const a = Math.random() * 6.283, rad = R * Math.abs(gauss()) * 0.85, sz = (0.6 + Math.random() * 1.6) * Math.max(1, k);
        const shade = 0.85 + Math.random() * 0.3;
        g.fillStyle = `rgba(${cr * shade | 0},${cg * shade | 0},${cb * shade | 0},${(0.05 + Math.random() * 0.16) * (0.5 + pr)})`;
        g.fillRect(x + Math.cos(a) * rad, y + Math.sin(a) * rad, sz, sz);
      }
      for (let j = 0; j < 6; j++) {   // overspray, well outside the line
        const a = Math.random() * 6.283, rad = R * (1.2 + Math.random() * 1.6);
        g.fillStyle = `rgba(${cr},${cg},${cb},${0.05 + Math.random() * 0.07})`;
        g.fillRect(x + Math.cos(a) * rad, y + Math.sin(a) * rad, k * 1.2, k * 1.2);
      }
    };
    const step = () => {
      const s = strokes[si]; if (!s) return;
      const speed = (RM ? 1e9 : 14 * k * (0.5 + 1.1 * s.v(s.at))), end = Math.min(s.path.length - 1, s.at + Math.max(1, Math.round(speed / 2)));
      for (; s.at <= end; s.at += 2) {
        const [x, y] = s.path[s.at], f = Math.min(1, s.at / 30, (s.path.length - s.at) / 30);   // softer at the start and end of a pass
        spray(s, x, y, s.p(s.at) * (0.45 + 0.55 * f));
      }
      if (s.at >= s.path.length - 1) { si++; if (RM) return step(); setTimeout(() => requestAnimationFrame(step), 140 + Math.random() * 160); return; }
      if (RM) return step();
      requestAnimationFrame(step);
    };
    step();
  }

  const cvs = [...document.querySelectorAll('canvas.spray')];
  if (!('IntersectionObserver' in window)) return cvs.forEach(paint);
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && e.target.clientWidth) { io.unobserve(e.target); paint(e.target); } }), { threshold: 0.35 });
  cvs.forEach(c => io.observe(c));
})();
