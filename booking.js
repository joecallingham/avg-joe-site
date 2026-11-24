/* Book a call: the notch's middle button opens this panel on every page.
   One sentence to fill in (name, when they're free, how to reach them), then Send. It goes to /api/book, which emails Joe.
   If the email service isn't set up yet (or fails), it falls back to a pre-filled email, so no request is lost. */
(() => {
  const TO = 'letschat@joecallingham.com';
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

  const panel = el('div', 'bk'); panel.id = 'book'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'bk-title'); panel.setAttribute('aria-hidden', 'true'); panel.dataset.lenisPrevent = '';
  const veil = el('div', 'bk-veil');
  panel.innerHTML = `
    <div class="bk-head"><span class="bk-tag">Book a call</span><button type="button" class="bk-x">Close</button></div>
    <div class="bk-body">
      <h2 class="bk-big" id="bk-title">Let's talk.</h2>
      <form class="bk-form" novalidate>
        <p class="bk-say">Hi Joe, my name is <label class="bk-in"><span class="bk-sr">Your name</span><input name="name" autocomplete="name" required maxlength="100" placeholder="your name"></label>.
          I'm free <label class="bk-in"><span class="bk-sr">When you're free</span><input name="when" required maxlength="120" placeholder="Tuesday afternoon"></label>,
          and you can reach me on <label class="bk-in"><span class="bk-sr">Email or number</span><input name="contact" autocomplete="email" required maxlength="120" placeholder="email or number"></label>.</p>
        <input class="bk-hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="bk-err" role="alert"></p>
        <button type="submit" class="bk-go">Send ↘</button>
      </form>
    </div>
    <div class="bk-done" hidden>
      <h2 class="bk-big">Thanks.</h2>
      <p class="bk-done-txt"></p>
    </div>`;
  document.body.append(veil, panel);
  const form = $('.bk-form', panel), go = $('.bk-go', panel), err = $('.bk-err', panel);
  let opener = null;

  // each blank grows with what's typed in it (falls back to the placeholder's width)
  const meas = el('span', 'bk-meas'); panel.appendChild(meas);
  const fit = i => { meas.textContent = i.value || i.placeholder; i.style.width = Math.ceil(meas.getBoundingClientRect().width + 1) + 'px'; };
  const inputs = [...form.querySelectorAll('.bk-in input')];
  inputs.forEach(i => i.addEventListener('input', () => { fit(i); i.classList.remove('bad'); if (!form.querySelector('.bad')) err.textContent = ''; }));
  const fitAll = () => inputs.forEach(fit);

  const open = (on, from) => {
    panel.classList.toggle('open', on); veil.classList.toggle('open', on); panel.setAttribute('aria-hidden', String(!on));
    document.querySelectorAll('.nb[data-k="studio"]').forEach(b => b.setAttribute('aria-expanded', String(on)));
    dispatchEvent(new CustomEvent('avgbook', { detail: on }));
    if (on) { opener = from || document.activeElement; fitAll(); setTimeout(() => inputs[0].focus({ preventScroll: true }), 300); }
    else if (opener) opener.focus?.({ preventScroll: true });
  };
  $('.bk-x', panel).addEventListener('click', () => open(false));
  veil.addEventListener('click', () => open(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) open(false); });
  (document.fonts?.ready || Promise.resolve()).then(fitAll);
  addEventListener('resize', fitAll);

  const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  const isPhone = s => (s.match(/\d/g) || []).length >= 7 && !/[^\d\s+()-]/.test(s);

  form.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = '';
    const f = new FormData(form), v = k => String(f.get(k) || '').trim();
    const name = v('name'), when = v('when'), contact = v('contact');
    const miss = [!name && 'your name', !when && 'when you\'re free', !(isEmail(contact) || isPhone(contact)) && 'an email or number'].filter(Boolean);
    inputs.forEach(i => i.classList.toggle('bad', (i.name === 'name' && !name) || (i.name === 'when' && !when) || (i.name === 'contact' && !(isEmail(contact) || isPhone(contact)))));
    if (miss.length) { err.textContent = 'Add ' + miss.join(' and ').replace(/ and (?=.* and )/, ', ') + '.'; form.querySelector('.bad')?.focus(); return; }
    go.disabled = true; go.textContent = 'Sending…';
    let emailed = false;
    try {
      const r = await fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, when, contact, company: f.get('company') }) });
      emailed = r.ok;
    } catch (_) { emailed = false; }
    if (!emailed) {   // no email service yet, or it failed: a pre-filled email to Joe instead
      const body = `Hi Joe,\n\nMy name is ${name}. I'm free ${when}, and you can reach me on ${contact}.\n`;
      location.href = `mailto:${TO}?subject=${encodeURIComponent('Book a call: ' + name)}&body=${encodeURIComponent(body)}`;
    }
    $('.bk-body', panel).hidden = true; const d = $('.bk-done', panel); d.hidden = false;
    $('.bk-done-txt', d).textContent = emailed
      ? `Joe will be in touch on ${contact} to fix a time.`
      : 'Your email app has opened with the details: hit send and Joe will be in touch.';
  });

  window.AvgBook = { open: from => open(true, from), close: () => open(false) };
})();
