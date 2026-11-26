/* PROTOTYPE (footer style across the site). Loaded only with ?fs (kept for the visit); ?nofs turns it off.
   Every section title gets a big two-face mark like the footer's "Extra Ordinary", with a spray doodle between the words.
   The small sticky title stays underneath (so the pinned layouts keep their sizes) and only shows once it sticks. */
(() => {
  const H = document.documentElement; H.classList.add('fs');
  const used = []; const pick = () => { let i; do i = Math.random() * 18 | 0; while (used.includes(i) && used.length < 18); used.push(i); return i; };
  const marks = [];
  const build = () => {
    document.querySelectorAll('.sec-title').forEach(t => {
      if (t.closest('.bk-home')) return;
      const span = t.querySelector('span') || t, txt = (span.textContent || '').trim(); if (!txt) return;
      const w = txt.split(/\s+/), last = w.length > 1 ? w.pop() : '';
      const m = document.createElement('p'); m.className = 'fs-mark'; m.setAttribute('aria-hidden', 'true');
      m.innerHTML = `<span class="fm-avg">${w.join(' ')}</span>${last ? `<span class="fm-joe">${last}</span>` : ''}`;
      const d = new Image(); d.className = 'fs-dood'; d.alt = ''; d.decoding = 'async'; d.loading = 'lazy'; d.src = '/img/spray/ft-' + pick() + '.webp?v=3'; m.appendChild(d);
      t.parentNode.insertBefore(m, t); t.classList.add('fs-t'); marks.push({ m, t, d });
    });
    place();
  };
  const place = () => marks.forEach(({ m, t, d }) => {
    m.style.marginBottom = -(t.offsetHeight - 1) + 'px';   // the mark's foot sits on the title's hairline
    const a = m.querySelector('.fm-avg'), j = m.querySelector('.fm-joe');
    const l = a.offsetLeft + a.offsetWidth, gap = j ? Math.max(j.offsetLeft - l, 0) : m.clientWidth - l;
    const fs = parseFloat(getComputedStyle(m).fontSize), ww = Math.min(Math.max(gap * (j ? 1.6 : .9), m.clientWidth * (j ? .36 : .3)), fs * 1.15 / .625), hh = ww * .625;   // never taller than the words
    d.style.width = ww + 'px'; d.style.height = hh + 'px';
    d.style.left = (j ? l + gap / 2 - ww / 2 : l + Math.min(gap * .1, 40)) + 'px';
    d.style.top = (a.offsetTop + a.offsetHeight * .5 - hh / 2) + 'px';
  });
  // a title shows once it has stuck and its mark has gone up past it
  const loop = () => { for (const { m, t } of marks) { const on = m.getBoundingClientRect().bottom < t.getBoundingClientRect().bottom - 2; if (t.classList.contains('fs-on') !== on) { t.classList.toggle('fs-on', on); m.classList.toggle('fs-under', on); } } requestAnimationFrame(loop); };
  const go = () => { build(); requestAnimationFrame(loop); addEventListener('resize', place); document.fonts && document.fonts.ready.then(place); addEventListener('load', place); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
  // the little switch, bottom left
  addEventListener('DOMContentLoaded', () => { const s = document.createElement('a'); s.className = 'fs-sw'; s.href = '?nofs'; s.textContent = 'Footer style: on'; document.body.appendChild(s); });
})();
