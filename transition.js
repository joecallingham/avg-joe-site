/* Moving between pages: a black sheet slides down over the page when you follow a link here, the next page opens
   under it and the sheet carries on down and off (CSS, so it works even before this runs). Same in every browser. */
(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pt = document.querySelector('.pt');
  if (!pt) return;
  // Avg Joe stays cream while the panel is up; once the panel has gone (or if anything stalls) it goes back to normal
  const off = () => pt.classList.add('off');
  if (RM) { off(); return; }
  pt.addEventListener('animationstart', e => { if (e.animationName.startsWith('pt-in')) setTimeout(off, 220); });   // the sheet has cleared the top by then
  pt.addEventListener('animationend', e => { if (e.animationName.startsWith('pt-in')) off(); });
  setTimeout(off, 2500);
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
    // go only once the panel has fully covered the page: iPhones stop drawing this page the moment the next one starts loading,
    // so leaving earlier freezes the panel part-way down
    let gone = false;
    const go = () => { if (gone) return; gone = true; location.href = url.href; };
    pt.addEventListener('animationend', function f(ev) { if (ev.animationName === 'pt-out') { pt.removeEventListener('animationend', f); pt.classList.remove('off'); requestAnimationFrame(() => requestAnimationFrame(go)); } });
    setTimeout(() => { pt.classList.remove('off'); go(); }, OUT + 250);
    setTimeout(() => { if (document.visibilityState === 'visible') { pt.classList.remove('leave'); void pt.offsetWidth; pt.classList.add('in'); setTimeout(off, 900); } }, 4000);   // never leave the page covered if the next one doesn't come
  });
  // coming back with the back button (the page is restored, not reloaded): swipe the panel off again
  addEventListener('pageshow', e => { if (e.persisted) { pt.classList.remove('leave'); pt.classList.remove('in'); void pt.offsetWidth; pt.classList.add('in'); setTimeout(off, 900); } });
})();
