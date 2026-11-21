/* Moving between pages: a blur layer over the page clears as a page opens (CSS, so it works even before this runs),
   and fogs back in when you follow a link to another page here, then the browser goes on to it. Same in every browser. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pt = document.querySelector('.pt');
  if (!pt || RM) return;
  const OUT = 260;   // ms the blur takes to fog in before the next page loads
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;                                   // other sites, mailto:, tel:
    if (url.pathname === location.pathname && url.search === location.search) return;   // links within this page
    e.preventDefault();
    pt.classList.remove('in'); pt.classList.add('leave');
    setTimeout(() => { location.href = url.href; }, OUT);
  });
  // coming back with the back button (the page is restored, not reloaded): clear the blur again
  addEventListener('pageshow', e => { if (e.persisted) { pt.classList.remove('leave'); pt.classList.remove('in'); void pt.offsetWidth; pt.classList.add('in'); } });
})();
