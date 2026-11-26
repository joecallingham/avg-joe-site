/* footer-style prototype: spray doodles in the marks, the UK time, films that play when seen */
(() => {
  const used = [], pick = () => { let i; do i = Math.random() * 18 | 0; while (used.includes(i) && used.length < 18); used.push(i); return i; };
  const marks = [...document.querySelectorAll('.mark')];
  marks.forEach(m => { const d = new Image(); d.className = 'd'; d.alt = ''; d.decoding = 'async'; d.src = '/img/spray/ft-' + pick() + '.webp?v=3'; m.appendChild(d); });
  const place = () => marks.forEach(m => {
    const a = m.querySelector('.a'), b = m.querySelector('.b'), d = m.querySelector('.d'); if (!a || !d) return;
    const l = a.offsetLeft + a.offsetWidth, gap = b ? Math.max(b.offsetLeft - l, 0) : m.clientWidth - l;
    const fs = parseFloat(getComputedStyle(m).fontSize), w = Math.min(Math.max(gap * 1.6, m.clientWidth * .36), fs * 1.15 / .625), h = w * .625;
    d.style.width = w + 'px'; d.style.height = h + 'px'; d.style.left = (l + gap / 2 - w / 2) + 'px'; d.style.top = (a.offsetTop + a.offsetHeight * .5 - h / 2) + 'px';
  });
  place(); addEventListener('resize', place); document.fonts && document.fonts.ready.then(place);
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .4 });
  marks.forEach(m => io.observe(m));
  // films: load and play only when on screen
  const vo = new IntersectionObserver(es => es.forEach(e => { const v = e.target;
    if (e.isIntersecting) { if (!v.src && v.dataset.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), { rootMargin: '20% 0px' });
  document.querySelectorAll('video[data-src]').forEach(v => vo.observe(v));
  // UK time
  const t = document.querySelectorAll('.foot-time'), tick = () => { const s = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit' }); t.forEach(x => x.textContent = s); };
  tick(); setInterval(tick, 20000);
})();
