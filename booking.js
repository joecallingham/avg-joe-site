/* Book a call: the notch's middle button grows the notch itself up into a panel (one cream shape, its sides
   running into the bottom edge in soft liquid curves), with one sentence to fill in, then Send.
   It goes to /api/book, which emails Joe; if the email service isn't set up (or fails), a pre-filled email opens instead. */
(() => {
  const TO = 'letschat@joecallingham.com';
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };
  const NS = 'http://www.w3.org/2000/svg', FLANK = 2.1;   // the notch's curved sides, in notch-heights (as main.js / page.js)
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  const veil = el('div', 'bk-veil');
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('class', 'bk-shape'); svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path'); svg.appendChild(path);
  const panel = el('div', 'bk'); panel.id = 'book'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'bk-title'); panel.setAttribute('aria-hidden', 'true'); panel.dataset.lenisPrevent = '';
  panel.innerHTML = `
    <div class="bk-in-wrap">
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
      </div>
    </div>`;
  const nav = $('#nav');
  document.body.append(veil, panel);
  if (nav) nav.before(svg); else document.body.append(svg);   // under the nav, so the notch's buttons stay on top
  const form = $('.bk-form', panel), go = $('.bk-go', panel), err = $('.bk-err', panel);
  let opener = null, isOpen = false;

  // each blank grows with what's typed in it (or its placeholder)
  const meas = el('span', 'bk-meas'); panel.appendChild(meas);
  const inputs = [...form.querySelectorAll('.bk-in input')];
  const fit = i => { meas.textContent = i.value || i.placeholder; i.style.width = Math.ceil(meas.getBoundingClientRect().width + 1) + 'px'; };
  const fitAll = () => inputs.forEach(fit);
  inputs.forEach(i => i.addEventListener('input', () => { fit(i); i.classList.remove('bad'); if (!form.querySelector('.bad')) err.textContent = ''; }));

  /* ---------- the shape ---------- */
  let G = null;
  const measure = () => {
    const nb = $('.notch')?.getBoundingClientRect(); if (!nb) return;
    const vw = innerWidth, vh = innerHeight, rem = parseFloat(getComputedStyle(document.documentElement).fontSize), m = vw <= 760;
    const h = nb.height, F0 = FLANK * (h - 1);
    const P1 = Math.min(m ? vw - 24 : 40 * rem, vw - 24);           // the panel's width
    const F1 = Math.max(10, Math.min(F0 * 1.25, (vw - P1) / 2 - 2));  // its liquid sides
    panel.style.width = P1 + 'px'; fitAll();
    const ch = Math.min($('.bk-in-wrap', panel).offsetHeight, vh - h - (m ? 20 : 60));
    G = { vw, vh, cx: nb.left + nb.width / 2, B: nb.bottom - 1, top0: nb.top, h, F0, F1, P0: nb.width - 2 * F0, P1, ch, r: Math.min(28, 1.6 * rem) };
    const top1 = G.B - h - ch;
    panel.style.left = (G.cx - P1 / 2) + 'px'; panel.style.top = top1 + 'px'; panel.style.height = ch + 'px';
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);
  };
  const lerp = (a, b, t) => a + (b - a) * t, n = v => v.toFixed(1);
  const draw = (wx, hy) => {   // wx: how far it has widened, hy: how far it has risen (springs, so they can overshoot)
    const g = G, P = lerp(g.P0, g.P1, wx), F = lerp(g.F0, g.F1, Math.min(1, Math.max(0, wx)));
    const top = lerp(g.top0, g.B - g.h - g.ch, hy), fy = Math.max(top, g.B - g.h + 1);
    const m = Math.min(1, Math.max(0, (fy - top) / (g.h * 1.5)));      // 0 = notch shoulders, 1 = liquid neck
    const r = Math.min(g.r, (fy - top) / 2), Lp = g.cx - P / 2, Rp = g.cx + P / 2, L = Lp - F, R = Rp + F, B = g.B;
    const c2y = lerp(fy, fy + 0.55 * (B - fy), m);
    path.setAttribute('d',
      `M${n(L - 2)} ${n(g.vh + 2)}V${n(B)}H${n(L)}C${n(L + 0.55 * F)} ${n(B)} ${n(lerp(L + 0.42 * F, Lp, m))} ${n(c2y)} ${n(Lp)} ${n(fy)}` +
      `V${n(top + r)}Q${n(Lp)} ${n(top)} ${n(Lp + r)} ${n(top)}H${n(Rp - r)}Q${n(Rp)} ${n(top)} ${n(Rp)} ${n(top + r)}V${n(fy)}` +
      `C${n(lerp(R - 0.42 * F, Rp, m))} ${n(c2y)} ${n(R - 0.55 * F)} ${n(B)} ${n(R)} ${n(B)}H${n(R + 2)}V${n(g.vh + 2)}Z`);
  };

  // two springs: opening, it widens first and then rises; closing, it sinks first and then narrows
  const S = { w: { x: 0, v: 0 }, h: { x: 0, v: 0 } };
  let raf = 0, last = 0;
  const step = now => {
    const dt = Math.min(0.032, (now - last) / 1000 || 0.016); last = now;
    const tw = isOpen ? 1 : (S.h.x > 0.35 ? 1 : 0), th = isOpen ? (S.w.x > 0.45 ? 1 : 0) : 0;
    const spring = (s, t, resp, damp) => { const k = (2 * Math.PI / resp) ** 2, c = 4 * Math.PI * damp / resp; s.v += (-k * (s.x - t) - c * s.v) * dt; s.x += s.v * dt; };
    spring(S.w, tw, isOpen ? 0.42 : 0.36, isOpen ? 0.68 : 0.9);
    spring(S.h, th, isOpen ? 0.55 : 0.34, isOpen ? 0.72 : 1);
    draw(S.w.x, S.h.x);
    panel.classList.toggle('show', isOpen && S.h.x > 0.82);
    const settled = Math.abs(S.w.v) + Math.abs(S.h.v) < 0.002 && Math.abs(S.w.x - tw) + Math.abs(S.h.x - th) < 0.001;
    if (settled) { S.w.x = tw; S.h.x = th; draw(tw, th); raf = 0; if (!isOpen) document.documentElement.classList.remove('bk-on'); return; }
    raf = requestAnimationFrame(step);
  };
  const run = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };

  const open = (on, from) => {
    if (on === isOpen) return;
    isOpen = on; panel.setAttribute('aria-hidden', String(!on)); veil.classList.toggle('open', on);
    document.querySelectorAll('.nb[data-k="studio"]').forEach(b => b.setAttribute('aria-expanded', String(on)));
    dispatchEvent(new CustomEvent('avgbook', { detail: on }));
    if (on) {
      document.documentElement.classList.add('bk-on'); measure(); opener = from || document.activeElement;
      setTimeout(() => isOpen && inputs[0].focus({ preventScroll: true }), still.matches ? 0 : 650);
    } else { panel.classList.remove('show'); opener?.focus?.({ preventScroll: true }); }
    if (still.matches) { S.w.x = S.h.x = on ? 1 : 0; S.w.v = S.h.v = 0; draw(S.w.x, S.h.x); panel.classList.toggle('show', on); if (!on) document.documentElement.classList.remove('bk-on'); return; }
    run();
  };
  $('.bk-x', panel).addEventListener('click', () => open(false));
  veil.addEventListener('click', () => open(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) open(false); });
  addEventListener('resize', () => { if (isOpen || raf) { measure(); draw(S.w.x, S.h.x); } });
  (document.fonts?.ready || Promise.resolve()).then(fitAll);

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
    measure(); draw(S.w.x, S.h.x);
  });

  window.AvgBook = { open: from => open(true, from), close: () => open(false) };
})();
