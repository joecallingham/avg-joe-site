/* Book a call: the notch's middle button lifts the notch and the bottom bar, and a full-width form slides up
   underneath them: one sentence to fill in, then Send.
   It goes to /api/book, which emails Joe; if the email service isn't set up (or fails), a pre-filled email opens instead. */
(() => {
  const TO = 'letschat@joecallingham.com';
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

  const veil = el('div', 'bk-veil');
  const panel = el('div', 'bk'); panel.id = 'book'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'bk-title'); panel.setAttribute('aria-hidden', 'true'); panel.dataset.lenisPrevent = '';
  panel.innerHTML = `
    <button type="button" class="bk-x">Close</button>
    <div class="bk-body">
      <h2 class="bk-big" id="bk-title">Let's talk.</h2>
      <form class="bk-form" novalidate>
        <p class="bk-say">Hi Joe, my name is <label class="bk-in"><span class="bk-sr">Your name</span><input name="name" autocomplete="name" required maxlength="100" placeholder="your name"></label>.
          I'm free <label class="bk-in"><span class="bk-sr">When you're free</span><input name="when" required maxlength="120" placeholder="Tuesday afternoon"></label>,
          and you can reach me on <label class="bk-in"><span class="bk-sr">Email or number</span><input name="contact" autocomplete="email" required maxlength="120" placeholder="email or number"></label>.</p>
        <input class="bk-hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="bk-foot"><p class="bk-err" role="alert"></p><button type="submit" class="bk-go">Send ↘</button></div>
      </form>
    </div>
    <div class="bk-done" hidden>
      <h2 class="bk-big">Thanks.</h2>
      <p class="bk-done-txt"></p>
    </div>`;
  document.body.append(veil, panel);
  const form = $('.bk-form', panel), go = $('.bk-go', panel), err = $('.bk-err', panel), root = document.documentElement;
  let opener = null, isOpen = false;

  // each blank grows with what's typed in it (or its placeholder)
  const meas = el('span', 'bk-meas'); panel.appendChild(meas);
  const inputs = [...form.querySelectorAll('.bk-in input')];
  const fit = i => { meas.textContent = i.value || i.placeholder; i.style.width = Math.ceil(meas.getBoundingClientRect().width + 1) + 'px'; };
  const fitAll = () => inputs.forEach(fit);
  inputs.forEach(i => i.addEventListener('input', () => { fit(i); i.classList.remove('bad'); if (!form.querySelector('.bad')) err.textContent = ''; }));

  // the notch and the bottom bar lift by the form's height, and the form slides up under them
  const size = () => { fitAll(); root.style.setProperty('--bk-h', panel.offsetHeight + 'px'); };
  const open = (on, from) => {
    if (on === isOpen) return;
    isOpen = on; if (on) size();
    let wasIn = false;
    if (!on) {   // drop the keyboard first, and let the notch fall on the same curve as the form, so they stay joined
      wasIn = panel.contains(document.activeElement); if (wasIn) document.activeElement.blur();
      root.classList.add('bk-shut'); clearTimeout(open.t); open.t = setTimeout(() => root.classList.remove('bk-shut'), 800);
    }
    root.classList.toggle('bk-on', on); panel.setAttribute('aria-hidden', String(!on)); veil.classList.toggle('open', on);
    document.querySelectorAll('.nb[data-k="studio"]').forEach(b => b.setAttribute('aria-expanded', String(on)));
    dispatchEvent(new CustomEvent('avgbook', { detail: on }));
    if (on) { opener = from || document.activeElement; setTimeout(() => isOpen && inputs[0].focus({ preventScroll: true }), 700); }
    else if (wasIn) opener?.focus?.({ preventScroll: true });   // only hand focus back if they were in the form (no ring after a tap or swipe)
  };
  $('.bk-x', panel).addEventListener('click', () => open(false));
  veil.addEventListener('click', () => open(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) open(false); });
  addEventListener('resize', size);
  (document.fonts?.ready || Promise.resolve()).then(size);

  /* ---------- thumb control: drag the notch up to open, down to close; it follows the finger, then a flick or past halfway decides ---------- */
  const nav = $('#nav'), bar = $('#frame-bottom');
  if (nav) {
    let d0 = 0, y0 = 0, H = 0, d = 0, dragging = false, down = false, hist = [], eat = false;
    const rubber = (x, lim) => x < 0 ? -rubberband(-x) : x > lim ? lim + rubberband(x - lim) : x;
    const rubberband = o => (o * 200 * 0.55) / (200 + 0.55 * o);
    const place = () => {
      nav.style.transform = `translate(-50%,${-d}px)`; if (bar) bar.style.transform = `translateY(${-d}px)`;
      panel.style.transform = `translateY(${Math.max(0, H - d)}px)`; veil.style.opacity = Math.max(0, Math.min(1, d / H));
    };
    nav.addEventListener('pointerdown', e => {
      if (e.button) return; down = true; dragging = false; y0 = e.clientY; hist = [[e.timeStamp, e.clientY]];
    });
    addEventListener('pointermove', e => {
      if (!down) return;
      const dy = y0 - e.clientY;
      if (!dragging) {
        if (Math.abs(dy) < 8) return;
        dragging = true; size(); H = panel.offsetHeight; d0 = isOpen ? H : 0;
        root.classList.add('bk-drag'); panel.style.visibility = 'visible';
      }
      hist.push([e.timeStamp, e.clientY]); if (hist.length > 12) hist.shift();
      d = rubber(d0 + dy, H); place(); e.preventDefault();
    }, { passive: false });
    const up = e => {
      if (!down) return; down = false;
      if (!dragging) return;
      dragging = false; eat = true; setTimeout(() => { eat = false; }, 50);
      const b = hist[hist.length - 1], a = hist.find(h => h[0] >= b[0] - 100) || b, dt = b[0] - a[0];
      const v = dt > 0 && e.timeStamp - b[0] < 100 ? (a[1] - b[1]) / dt * 1000 : 0;   // px/s over the last tenth of a second, upward positive
      const proj = d + (v / 1000) * 0.99 / (1 - 0.99);                   // where the flick would carry it (snappy deceleration)
      const want = proj > H / 2;
      root.classList.remove('bk-drag');
      if (want !== isOpen) open(want, nav.querySelector('.nb[data-k="studio"]'));
      [nav, bar, panel].forEach(x => x && (x.style.transform = '')); panel.style.visibility = ''; veil.style.opacity = '';
    };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    nav.addEventListener('click', e => { if (eat) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);   // a drag isn't a tap
  }

  /* ---------- sending ---------- */
  const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const isPhone = s => (s.match(/\d/g) || []).length >= 7 && !/[^\d\s+()-]/.test(s);
  form.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = '';
    const f = new FormData(form), v = k => String(f.get(k) || '').trim();
    const name = v('name'), when = v('when'), contact = v('contact'), okC = isEmail(contact) || isPhone(contact);
    const miss = [!name && 'your name', !when && 'when you\'re free', !okC && 'an email or number'].filter(Boolean);
    inputs.forEach(i => i.classList.toggle('bad', (i.name === 'name' && !name) || (i.name === 'when' && !when) || (i.name === 'contact' && !okC)));
    if (miss.length) { err.textContent = 'Add ' + miss.join(' and ').replace(/ and (?=.* and )/, ', ') + '.'; form.querySelector('.bad')?.focus(); return; }
    go.disabled = true; go.textContent = 'Sending…';
    let emailed = false;
    try {
      const r = await fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, when, contact, company: f.get('company') }) });
      emailed = r.ok;
    } catch (_) { emailed = false; }
    if (!emailed) {
      const body = `Hi Joe,\n\nMy name is ${name}. I'm free ${when}, and you can reach me on ${contact}.\n`;
      location.href = `mailto:${TO}?subject=${encodeURIComponent('Book a call: ' + name)}&body=${encodeURIComponent(body)}`;
    }
    $('.bk-body', panel).hidden = true; const d = $('.bk-done', panel); d.hidden = false;
    $('.bk-done-txt', d).textContent = emailed ? `Joe will be in touch on ${contact} to fix a time.` : 'Your email app has opened with the details: hit send and Joe will be in touch.';
    size();
  });

  window.AvgBook = { open: from => open(true, from), close: () => open(false) };
})();
