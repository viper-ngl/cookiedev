import { json, getDB, getSession, isOwner } from '../_lib.js';

// Send email via MailChannels (free for Cloudflare Pages, no API key needed)
export async function sendEmail({ to, subject, html, text }) {
  const payload = {
    personalizations: [{ to: [{ email: to }] }],
    from: {
      email: 'noreply@parksidestore.cc',
      name: 'Parkside Stores'
    },
    subject,
    content: [
      { type: 'text/plain', value: text || subject },
      { type: 'text/html', value: html }
    ]
  };

  const r = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  return r.ok;
}

// POST /api/email — internal use only (called by other functions)
export async function onRequestPost({ request, env }) {
  const botOk = request.headers.get('x-bot-secret') === env.BOT_SECRET;
  const ownerOk = await isOwner(request, env);
  if (!botOk && !ownerOk) return json({ error: 'Unauthorized' }, 401);

  const { to, subject, html, text } = await request.json().catch(() => ({}));
  if (!to || !subject) return json({ error: 'to and subject required' }, 400);

  const ok = await sendEmail({ to, subject, html, text });
  return json({ ok });
}
