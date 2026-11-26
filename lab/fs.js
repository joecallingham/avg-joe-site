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
      const span = t.firstElementChild || t, txt = (span.textContent || '').trim(); if (!txt || txt.split(/\s+/).length > 3) return;   // long titles (the case study headings) stay as they are
      const w = txt.split(/\s+/), last = w.length > 1 ? w.pop() : '';
      const m = document.createElement('p'); m.className = 'fs-mark'; m.setAttribute('aria-hidden', 'true');
      m.innerHTML = `<span class="fm-avg">${w.join(' ')}</span>${last ? `<span class="fm-joe">${last}</span>` : ''}`;
      const d = new Image(); d.className = 'fs-dood'; d.alt = ''; d.decoding = 'async'; d.loading = 'lazy'; d.src = '/img/spray/ft-' + pick() + '.webp?v=3'; m.appendChild(d);
      t.parentNode.insertBefore(m, t); t.classList.add('fs-t'); span.classList.add('fs-tt'); marks.push({ m, t, d });
    });
    place();
  };
  const fit = () => { for (let i = marks.length - 1; i >= 0; i--) { const { m, t } = marks[i]; if (m.scrollWidth > m.clientWidth + 2) { m.remove(); t.classList.remove('fs-t', 'fs-on'); t.querySelector('.fs-tt')?.classList.remove('fs-tt'); marks.splice(i, 1); } } };
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
  // Info: What We Do as a grid of sprayed squares, from the page's own list
  const grid = () => { const wd = document.querySelector('.wd'), list = wd && wd.querySelectorAll('.wd-list li'), pics = wd && wd.querySelectorAll('.wd-pic svg'); if (!list || !list.length) return;
    const g = document.createElement('div'); g.className = 'fs-grid';
    list.forEach((li, i) => { const sv = pics[i], bg = sv && sv.querySelector('rect').getAttribute('fill'), src = sv && sv.querySelector('image').getAttribute('data-href');
      const c = document.createElement('div'); c.innerHTML = `<div class="pic" style="background:${bg}"><img src="${src}" alt="" loading="lazy" decoding="async"></div><p class="nm"><i>${String(i + 1).padStart(2, '0')}</i>${li.querySelector('b').textContent}</p><p class="tx">${li.querySelector('span').textContent}</p>`; g.appendChild(c); });
    wd.parentNode.insertBefore(g, wd); };
  // a doodle behind the end of each hero line
  const heroDood = () => document.querySelectorAll('.info-hero h1, .cs-hero h1').forEach(h => { const r = document.createRange(); r.selectNodeContents(h); const rs = r.getClientRects(), last = rs[rs.length - 1], hb = h.getBoundingClientRect(); if (!last) return;
    let d = h.querySelector('.fs-hd'); if (!d) { d = new Image(); d.className = 'fs-hd'; d.alt = ''; d.src = '/img/spray/ft-' + pick() + '.webp?v=3'; h.appendChild(d); }
    d.style.left = (last.right - hb.left) + 'px'; d.style.top = (last.top - hb.top + last.height / 2) + 'px'; });
  // key words in the big sentences go serif, a word or two per sentence, as Ordinary does in the footer
  const KEY = [
    ['#s-big .big', ['ordinary.']], ['#s-line', ['ordinary']],
    ['#case-boon h2', ['trust.']], ['.case-620 h2, #case-620 h2', ['coaching.']],
    ['.case h2', ['following', 'crowd.', 'terms.']],
    ['.info-hero h1', ['best.', 'hand,']], ['.ca-state', ['final', 'say.', 'mountains.', 'without', 'us.', 'home.', 'spreadsheet.']],
    ['.cs-hero h1', ['mountains', 'warmth', 'homes']],
  ];
  const serif = () => KEY.forEach(([sel, words]) => document.querySelectorAll(sel).forEach(el => {
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), nodes = []; while (tw.nextNode()) nodes.push(tw.currentNode);
    nodes.forEach(n => { if (n.parentElement.closest('.fs-s, .cycle, .craft, .ai, script')) return;
      const re = new RegExp('(^|\\s)(' + words.map(w => w.replace(/[.,]/g, m => '\\' + m)).join('|') + ')(?=\\s|$)', 'g');
      if (!re.test(n.data)) return; re.lastIndex = 0;
      const f = document.createDocumentFragment(); let last = 0, m;
      while ((m = re.exec(n.data))) { const st = m.index + m[1].length; f.append(n.data.slice(last, st)); const sp = document.createElement('span'); sp.className = 'fs-s'; sp.textContent = m[2]; f.append(sp); last = st + m[2].length; }
      f.append(n.data.slice(last)); n.replaceWith(f); });
  }));
  // the form's measurer sits outside the sentence: give it the sentence's size, then re-fit the blanks
  const bk = () => { const say = document.querySelector('.bk-say'); if (!say) return; H.style.setProperty('--bk-say', getComputedStyle(say).fontSize);
    document.querySelectorAll('.bk-in input').forEach(i => i.dispatchEvent(new Event('input', { bubbles: true }))); };
  const go = () => { serif(); bk(); addEventListener('resize', bk); document.fonts && document.fonts.ready.then(bk); addEventListener('click', e => { if (e.target.closest('a[href="#book"]')) setTimeout(bk, 60); }); grid(); build(); heroDood(); addEventListener('resize', heroDood); document.fonts && document.fonts.ready.then(heroDood); requestAnimationFrame(loop); addEventListener('resize', place); document.fonts && document.fonts.ready.then(() => { fit(); place(); }); addEventListener('load', place); };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', go) : go();
  // the little switch, bottom left
  addEventListener('DOMContentLoaded', () => { const s = document.createElement('a'); s.className = 'fs-sw'; s.href = '?nofs'; s.textContent = 'Footer style: on'; document.body.appendChild(s); });
})();
