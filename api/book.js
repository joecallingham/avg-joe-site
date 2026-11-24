// POST /api/book  { name, when, contact, company (honeypot) }
// Emails Joe the call request: who, when they're free, and how to reach them (email or number).
// Needs one setting in Vercel: RESEND_API_KEY (a free resend.com key). Optional: BOOK_TO (defaults to Joe's address).
// Without the key it answers 503, and the site falls back to a pre-filled email instead.
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const isPhone = s => (s.match(/\d/g) || []).length >= 7 && !/[^\d\s+()-]/.test(s);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  if (b.company) { res.status(200).json({ ok: true }); return; }   // a bot filled the hidden field: say yes, do nothing

  const name = String(b.name || '').trim().slice(0, 100);
  const when = String(b.when || '').trim().slice(0, 120);
  const contact = String(b.contact || '').trim().slice(0, 120);
  const email = isEmail(contact);
  if (!name || !when || !(email || isPhone(contact))) { res.status(400).json({ error: 'Check the name, time and contact.' }); return; }

  const key = process.env.RESEND_API_KEY;
  if (!key) { res.status(503).json({ error: 'Booking email is not set up yet.' }); return; }

  const link = email ? `mailto:${esc(contact)}` : `tel:${esc(contact.replace(/[^\d+]/g, ''))}`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;font-size:16px;line-height:1.45;color:#0b0b0b">
    <p style="font-size:22px;margin:0 0 12px">${esc(name)} wants a call</p>
    <p style="margin:0 0 4px">Free: <b>${esc(when)}</b></p>
    <p style="margin:0 0 16px">Reach them on <a href="${link}">${esc(contact)}</a></p>
  </div>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.BOOK_FROM || 'Avg Joe bookings <onboarding@resend.dev>',
        to: [process.env.BOOK_TO || 'letschat@joecallingham.com'],
        ...(email ? { reply_to: contact } : {}),
        subject: `Call request: ${name} (${when})`,
        html,
      }),
    });
    if (!r.ok) { res.status(502).json({ error: 'The email didn\'t send.' }); return; }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: 'The email didn\'t send.' });
  }
};
