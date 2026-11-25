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
    root.classList.toggle('bk-on', on); panel.setAttribute('aria-hidden', String(!on)); veil.classList.toggle('open', on);
    document.querySelectorAll('.nb[data-k="studio"]').forEach(b => b.setAttribute('aria-expanded', String(on)));
    dispatchEvent(new CustomEvent('avgbook', { detail: on }));
    if (on) { opener = from || document.activeElement; setTimeout(() => isOpen && inputs[0].focus({ preventScroll: true }), 700); }
    else opener?.focus?.({ preventScroll: true });
  };
  $('.bk-x', panel).addEventListener('click', () => open(false));
  veil.addEventListener('click', () => open(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) open(false); });
  addEventListener('resize', size);
  (document.fonts?.ready || Promise.resolve()).then(size);

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
