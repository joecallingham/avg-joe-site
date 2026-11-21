/* Book a call: the notch's middle button opens this panel on every page.
   Pick a day, a time (UK), add your details; it goes to /api/book, which emails Joe the booking with a calendar file.
   If the email service isn't set up yet (or fails), it falls back to a pre-filled email, so no booking is lost. */
(() => {
  const TO = 'letschat@joecallingham.com';
  const DAYS_AHEAD = 14, START = [10, 0], END = [16, 30], STEP = 30, LEN = 30;   // weekdays, 10:00 to 16:30 UK, 30-minute calls
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, txt) => { const n = document.createElement(tag); if (cls) n.className = cls; if (txt != null) n.textContent = txt; return n; };

  // UK wall-clock time to a real instant (handles GMT/BST)
  const londonOffset = d => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d); const g = k => +p.find(x => x.type === k).value; return (Date.UTC(g('year'), g('month') - 1, g('day'), g('hour') % 24, g('minute')) - d.getTime()) / 60000; };
  const ukToDate = (y, m, d, h, mi) => { let t = Date.UTC(y, m, d, h, mi); t -= londonOffset(new Date(t)) * 60000; t = Date.UTC(y, m, d, h, mi) - londonOffset(new Date(t)) * 60000; return new Date(t); };
  const ukParts = d => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(d); const g = k => p.find(x => x.type === k).value; return { y: +g('year'), m: +g('month') - 1, d: +g('day'), wd: g('weekday') }; };
  const fmtDay = d => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  const fmtTime = d => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  const pad = n => String(n).padStart(2, '0');
  const icsStamp = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  // the next weekdays, each with its open slots (at least two hours from now)
  const days = () => {
    const out = [], now = Date.now(); let probe = new Date();
    while (out.length < DAYS_AHEAD) {
      const u = ukParts(probe);
      if (u.wd !== 'Sat' && u.wd !== 'Sun') {
        const slots = [];
        for (let mins = START[0] * 60 + START[1]; mins <= END[0] * 60 + END[1]; mins += STEP) {
          const s = ukToDate(u.y, u.m, u.d, Math.floor(mins / 60), mins % 60);
          if (s.getTime() > now + 2 * 3600e3) slots.push(s);
        }
        if (slots.length) out.push({ label: fmtDay(ukToDate(u.y, u.m, u.d, 12, 0)), slots });
      }
      probe = new Date(probe.getTime() + 864e5);
    }
    return out;
  };

  // the panel
  const panel = el('div', 'bk'); panel.id = 'book'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'bk-title'); panel.setAttribute('aria-hidden', 'true'); panel.dataset.lenisPrevent = '';
  const veil = el('div', 'bk-veil');
  panel.innerHTML = `
    <div class="bk-head"><h2 id="bk-title">Book a call</h2><button type="button" class="bk-x">Close</button></div>
    <div class="bk-body">
      <p class="bk-lab">A 30-minute call about what you're making. Times are UK time.</p>
      <section class="bk-sec"><h3 class="bk-lab">Pick a day</h3><div class="bk-days" role="group" aria-label="Day"></div></section>
      <section class="bk-sec"><h3 class="bk-lab">Pick a time</h3><div class="bk-times" role="group" aria-label="Time"><p class="bk-hint">Pick a day first.</p></div></section>
      <form class="bk-sec bk-form" novalidate>
        <h3 class="bk-lab">Your details</h3>
        <label class="bk-f"><span>Name</span><input name="name" autocomplete="name" required maxlength="100"></label>
        <label class="bk-f"><span>Contact number</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="30"></label>
        <input class="bk-hp" name="company" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="bk-err" role="alert"></p>
        <button type="submit" class="bk-go" disabled>Pick a day and time</button>
      </form>
    </div>
    <div class="bk-done" hidden>
      <h3 class="bk-big">Booked in.</h3>
      <p class="bk-done-txt"></p>
      <p><a class="bk-ics" download="avg-joe-call.ics">Add it to your calendar ↘</a></p>
    </div>`;
  document.body.append(veil, panel);
  const daysEl = $('.bk-days', panel), timesEl = $('.bk-times', panel), form = $('.bk-form', panel), go = $('.bk-go', panel), err = $('.bk-err', panel);
  let picked = null, opener = null;

  const D = days();
  D.forEach((d, i) => {
    const b = el('button', 'bk-day', d.label); b.type = 'button'; b.setAttribute('aria-pressed', 'false');
    b.addEventListener('click', () => {
      daysEl.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      timesEl.replaceChildren(...d.slots.map(s => { const t = el('button', 'bk-time', fmtTime(s)); t.type = 'button'; t.setAttribute('aria-pressed', 'false'); t.addEventListener('click', () => { timesEl.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === t))); picked = s; ready(); }); return t; }));
      picked = null; ready();
    });
    daysEl.appendChild(b);
  });
  const ready = () => { go.disabled = !picked; go.textContent = picked ? `Book ${fmtDay(picked)}, ${fmtTime(picked)} ↘` : 'Pick a day and time'; };

  const open = (on, from) => {
    panel.classList.toggle('open', on); veil.classList.toggle('open', on); panel.setAttribute('aria-hidden', String(!on));
    document.querySelectorAll('.nb[data-k="studio"]').forEach(b => b.setAttribute('aria-expanded', String(on)));
    dispatchEvent(new CustomEvent('avgbook', { detail: on }));
    if (on) { opener = from || document.activeElement; setTimeout(() => $('.bk-day', panel)?.focus({ preventScroll: true }), 300); }
    else if (opener) opener.focus?.({ preventScroll: true });
  };
  $('.bk-x', panel).addEventListener('click', () => open(false));
  veil.addEventListener('click', () => open(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('open')) open(false); });

  const icsFor = (start, name, phone) => {
    const end = new Date(start.getTime() + LEN * 60000);
    const esc = s => String(s || '').replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Avg Joe//Book a call//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
      `UID:${icsStamp(start)}-${Math.random().toString(36).slice(2)}@avgjoe.studio`, `DTSTAMP:${icsStamp(new Date())}`,
      `DTSTART:${icsStamp(start)}`, `DTEND:${icsStamp(end)}`, `SUMMARY:${esc('Call: Avg Joe x ' + name)}`,
      `DESCRIPTION:${esc(`${name}, ${phone}`)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  };
  const done = (start, name, phone, emailed) => {
    $('.bk-body', panel).hidden = true; const d = $('.bk-done', panel); d.hidden = false;
    $('.bk-done-txt', d).textContent = emailed
      ? `${fmtDay(start)} at ${fmtTime(start)} (UK). Joe has it and will call you then.`
      : `${fmtDay(start)} at ${fmtTime(start)} (UK). Your email app has opened with the details: hit send and Joe will confirm.`;
    $('.bk-ics', d).href = URL.createObjectURL(new Blob([icsFor(start, name, phone)], { type: 'text/calendar' }));
  };

  form.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = '';
    const f = new FormData(form), name = String(f.get('name') || '').trim(), phone = String(f.get('phone') || '').trim();
    if (!picked) return; if (!name) { err.textContent = 'Add your name.'; return; }
    if ((phone.match(/\d/g) || []).length < 7 || /[^\d\s+()-]/.test(phone)) { err.textContent = 'Add a number we can call you on.'; return; }
    go.disabled = true; go.textContent = 'Booking…';
    let emailed = false;
    try {
      const r = await fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, phone, start: picked.toISOString(), company: f.get('company') }) });
      emailed = r.ok;
    } catch (_) { emailed = false; }
    if (!emailed) {   // no email service yet, or it failed: a pre-filled email to Joe instead
      const body = `Hi Joe,\n\nI'd like to book a call: ${fmtDay(picked)} at ${fmtTime(picked)} (UK).\n\nName: ${name}\nNumber: ${phone}\n`;
      location.href = `mailto:${TO}?subject=${encodeURIComponent('Book a call: ' + fmtDay(picked) + ' ' + fmtTime(picked))}&body=${encodeURIComponent(body)}`;
    }
    done(picked, name, phone, emailed);
  });

  window.AvgBook = { open: from => open(true, from), close: () => open(false) };
})();
