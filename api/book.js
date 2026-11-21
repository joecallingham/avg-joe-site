// POST /api/book  { name, phone, start (ISO), company (honeypot) }
// Emails Joe the booking with a calendar file attached (one tap adds it to his phone's calendar) and an "Add to Google Calendar" link.
// Needs one setting in Vercel: RESEND_API_KEY (a free resend.com key). Optional: BOOK_TO (defaults to Joe's address).
// Without the key it answers 503, and the site falls back to a pre-filled email instead.
const LEN = 30;   // minutes

const pad = n => String(n).padStart(2, '0');
const stamp = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icsEsc = s => String(s).replace(/[\\,;]/g, m => '\\' + m).replace(/\n/g, '\\n');
const uk = (d, o) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', ...o }).format(d);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  if (b.company) { res.status(200).json({ ok: true }); return; }   // a bot filled the hidden field: say yes, do nothing

  const name = String(b.name || '').trim().slice(0, 100);
  const phone = String(b.phone || '').trim().slice(0, 30);
  const start = new Date(b.start);
  const now = Date.now();
  const bad = !name || (phone.match(/\d/g) || []).length < 7 || /[^\d\s+()-]/.test(phone) ||
    isNaN(start) || start.getTime() < now || start.getTime() > now + 60 * 864e5 || start.getUTCMinutes() % 30 !== 0;
  // only weekdays, 10:00 to 16:30 UK time (the same slots the panel offers)
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(isNaN(start) ? new Date(0) : start);
  const g = k => (p.find(x => x.type === k) || {}).value, mins = (+g('hour') % 24) * 60 + +g('minute');
  const offHours = g('weekday') === 'Sat' || g('weekday') === 'Sun' || mins < 600 || mins > 990;
  if (bad || offHours) { res.status(400).json({ error: 'Check the name, number and time.' }); return; }

  const key = process.env.RESEND_API_KEY;
  if (!key) { res.status(503).json({ error: 'Booking email is not set up yet.' }); return; }

  const end = new Date(start.getTime() + LEN * 60000);
  const when = `${uk(start, { weekday: 'long', day: 'numeric', month: 'long' })} at ${uk(start, { hour: '2-digit', minute: '2-digit', hour12: false })} (UK)`;
  const title = `Call: ${name}`;
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Avg Joe//Book a call//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${stamp(start)}-${Math.random().toString(36).slice(2)}@avgjoe.studio`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${icsEsc(title)}`,
    `DESCRIPTION:${icsEsc(`${name}\nCall on ${phone}\nBooked on avgjoe.studio`)}`, 'BEGIN:VALARM', 'TRIGGER:-PT10M', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const gcal = 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}&dates=${stamp(start)}/${stamp(end)}&details=${encodeURIComponent(`${name}, call on ${phone}`)}`;

  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.45;color:#0b0b0b">
    <p style="font-size:22px;margin:0 0 12px">New call booked</p>
    <p style="margin:0 0 4px"><b>${esc(when)}</b></p>
    <p style="margin:0 0 4px">${esc(name)}</p>
    <p style="margin:0 0 16px"><a href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">${esc(phone)}</a></p>
    <p style="margin:0 0 8px">Open the attached <b>call.ics</b> to add it to your calendar, or <a href="${gcal}">add it to Google Calendar</a>.</p>
  </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.BOOK_FROM || 'Avg Joe bookings <onboarding@resend.dev>',
        to: [process.env.BOOK_TO || 'letschat@joecallingham.com'],
        subject: `Call booked: ${name}, ${when}`,
        html,
        attachments: [{ filename: 'call.ics', content: Buffer.from(ics).toString('base64') }],
      }),
    });
    if (!r.ok) { res.status(502).json({ error: 'The email didn\'t send.' }); return; }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: 'The email didn\'t send.' });
  }
};
