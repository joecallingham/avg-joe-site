/* Information page: the Craft & AI scroll run.
   One pinned stage, driven by how far through the section you've scrolled (p, 0 to 1):
   statement -> blue slides over, its holes drift into place, red rises behind -> craft copy in ->
   photo wipes in under the blue -> the blue's text side wipes away -> AI copy in. */
(() => {
  const run = document.getElementById('ca-run');
  if (!run) return;
  const $ = (s, r = run) => r.querySelector(s), $$ = (s, r = run) => [...r.querySelectorAll(s)];
  const blue = $('.ca-blue'), red = $('.ca-red'), img = $('.ca-img'), bl = $('.ca-bl');
  const holes = $$('.ca-holes .h');

  // split each copy block into word units (an inline element such as "craft" or "AI" stays whole)
  const words = el => {
    const out = [];
    [...el.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(t => {
          if (!t) return;
          if (/^\s+$/.test(t)) { out.push(document.createTextNode(t)); return; }
          const w = document.createElement('span'); w.className = 'w'; w.textContent = t; out.push(w);
        });
      } else { const w = document.createElement('span'); w.className = 'w'; w.appendChild(n); out.push(w); }   // moved, not copied, so its rotation keeps working
    });
    el.replaceChildren(...out);
    return $$('.w', el);
  };
  const craftW = words($('.ca-bl .ca-copy')), aiW = words($('.ca-dark .ca-copy'));

  const clamp = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = t => 1 - Math.pow(1 - t, 3);
  const inOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  // where each hole starts: pushed left and shrunk, so they drift in one after another
  const start = holes.map((g, i) => ({ dx: -380 - i * 140, dy: (i % 2 ? 1 : -1) * (90 + i * 30), s: .35 }));
  const centre = holes.map(g => { const e = g.firstElementChild; return [+e.getAttribute('cx'), +e.getAttribute('cy')]; });

  const wordsIn = (ws, t) => ws.forEach((w, i) => {
    const k = ease(clamp(t * (1 + ws.length * .06) - i * .06));
    w.style.opacity = k; w.style.transform = `translateY(${(1 - k) * .35}em)`;
  });

  let last = -1;
  const frame = () => {
    requestAnimationFrame(frame);
    const r = run.getBoundingClientRect(), span = r.height - innerHeight;
    if (r.bottom < -50 || r.top > innerHeight + 50) return;
    const p = clamp(-r.top / span);
    if (Math.abs(p - last) < 1e-4) return;
    last = p;

    // 1. blue over the statement, holes drifting into place, red rising behind
    const b = inOut(seg(p, .08, .34));
    blue.style.transform = `translateX(${(b - 1) * 100}%)`;
    holes.forEach((g, i) => {
      const k = ease(seg(p, .1 + i * .035, .34 + i * .035)), s = start[i], [cx, cy] = centre[i];
      const sc = s.s + (1 - s.s) * k;
      g.setAttribute('transform', `translate(${s.dx * (1 - k)} ${s.dy * (1 - k)}) translate(${cx} ${cy}) scale(${sc}) translate(${-cx} ${-cy})`);
    });
    red.style.transform = `translateY(${(1 - inOut(seg(p, .14, .4))) * 100}%)`;
    wordsIn(craftW, seg(p, .28, .46));

    // 2. photo wipes in under the blue (over the red), then the blue's text side wipes away to the AI copy
    img.style.clipPath = `inset(0 ${(1 - inOut(seg(p, .54, .8))) * 100}% 0 0)`;
    bl.style.clipPath = `inset(0 0 0 ${inOut(seg(p, .6, .84)) * 100}%)`;
    wordsIn(aiW, seg(p, .72, .9));
  };
  requestAnimationFrame(frame);
})();
