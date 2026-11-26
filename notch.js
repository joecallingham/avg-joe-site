/* The notch's ink shape, on every page: one soft-shouldered tab drawn to fit the nav, flush with the screen's bottom edge.
   It redraws itself whenever the notch changes size (fonts loading, a resize, phone vs desktop). */
(() => {
  const FLANK = 2.1;   // each curved side is this many notch-heights wide (fixed, so a wider notch never stretches them)
  const NS = 'http://www.w3.org/2000/svg', f = v => v.toFixed(1);
  function draw(notch) {
    const w = notch.offsetWidth, h = notch.offsetHeight;
    if (!w || !h) return;
    let svg = notch.querySelector(':scope > svg.notch-fill');
    if (!svg) {
      svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'notch-fill'); svg.setAttribute('aria-hidden', 'true');
      svg.appendChild(document.createElementNS(NS, 'path')); notch.prepend(svg);
    }
    const B = h - 1, F = FLANK * B, H = h + 4;   // runs a few px past the bottom so no hairline shows at the screen edge
    svg.setAttribute('viewBox', `0 0 ${f(w)} ${f(H)}`); svg.style.width = w + 'px'; svg.style.height = H + 'px';
    svg.firstChild.setAttribute('d', `M0 ${f(B)}C${f(.55 * F)} ${f(B)} ${f(.42 * F)} 0 ${f(F)} 0H${f(w - F)}C${f(w - .42 * F)} 0 ${f(w - .55 * F)} ${f(B)} ${f(w)} ${f(B)}V${f(H)}H0Z`);
  }
  const start = () => document.querySelectorAll('.notch').forEach(n => { draw(n); new ResizeObserver(() => draw(n)).observe(n); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
