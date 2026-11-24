// Selected Work: once the section reaches the top it holds, and scrolling down moves the thumbnails left to right (image view only)
(() => {
  const sec = document.querySelector('.wk-sel'), pin = sec && sec.querySelector('.wk-pin'), grid = sec && sec.querySelector('.wk-grid3');
  if (!sec || !pin || !grid) return;
  const phone = () => matchMedia('(max-width: 760px)').matches;
  let shift = 0, raf = 0, on = false;
  const measure = () => {
    on = !grid.classList.contains('is-list');
    sec.classList.toggle('wk-h', on);
    if (!on) { sec.style.height = ''; grid.style.transform = ''; return; }
    const H = innerHeight, base = phone() ? 3.4 * parseFloat(getComputedStyle(document.documentElement).fontSize) : 0;
    pin.style.setProperty('--wk-pt', base + 'px');
    // pictures fill what is left of the screen under the controls, less the name, line and lozenges and the bottom bar
    const top = grid.getBoundingClientRect().top - pin.getBoundingClientRect().top;
    const ih = Math.max(160, H - top - (phone() ? 150 : 140) - 70);
    grid.style.setProperty('--wk-ih', ih + 'px');
    shift = Math.max(0, grid.scrollWidth - innerWidth);
    sec.style.height = (H + shift) + 'px';
    tick();
  };
  const tick = () => {
    raf = 0;
    if (!on) return;
    const p = shift ? Math.min(1, Math.max(0, -sec.getBoundingClientRect().top / shift)) : 0;
    grid.style.transform = `translate3d(${(-p * shift).toFixed(1)}px,0,0)`;
  };
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  addEventListener('resize', measure);
  // the view toggle, the filters and fonts change the widths: measure again
  new MutationObserver(() => requestAnimationFrame(measure)).observe(grid, { attributes: true, attributeFilter: ['class'], subtree: true, childList: true });
  const fl = sec.querySelector('.wk-filters');
  fl && new MutationObserver(() => requestAnimationFrame(measure)).observe(fl, { attributes: true, attributeFilter: ['hidden'] });
  document.fonts && document.fonts.ready.then(measure);
  addEventListener('load', measure);
  measure();
})();
