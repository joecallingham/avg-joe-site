/* Moving between pages: a black panel swipes down over the page when you follow a link here, the next page opens
   under it and the panel carries on down and off (CSS, so it works even before this runs). Same in every browser. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pt = document.querySelector('.pt');
  if (!pt || RM) return;
  const OUT = 500;   // ms the panel takes to swipe down over the page before the next one loads
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;                                   // other sites, mailto:, tel:
    if (url.pathname === location.pathname && url.search === location.search) return;   // links within this page
    e.preventDefault();
    pt.classList.remove('in'); void pt.offsetWidth; pt.classList.add('leave');
    setTimeout(() => { location.href = url.href; }, OUT);
    setTimeout(() => { if (document.visibilityState === 'visible') { pt.classList.remove('leave'); void pt.offsetWidth; pt.classList.add('in'); } }, 4000);   // never leave the page covered if the next one doesn't come
  });
  // coming back with the back button (the page is restored, not reloaded): swipe the panel off again
  addEventListener('pageshow', e => { if (e.persisted) { pt.classList.remove('leave'); pt.classList.remove('in'); void pt.offsetWidth; pt.classList.add('in'); } });
})();
