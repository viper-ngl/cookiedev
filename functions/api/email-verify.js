import { json, sendEmail } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const { email, code, job_title } = await request.json().catch(() => ({}));
  if (!email || !code) return json({ error: 'email and code required' }, 400);

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="background:#111118;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden">
<tr><td style="background:#111118;padding:32px 40px 0;text-align:center">
  <img src="https://parksidestore.cc/images/logo-leaf.png" width="32" height="32" style="filter:brightness(0) invert(1);margin-bottom:16px" alt="">
  <h1 style="margin:0 0 6px;font-size:24px;font-weight:800;color:#f9fafb;letter-spacing:-.5px">Verify your application</h1>
  <p style="margin:0 0 28px;font-size:14px;color:#4b5563;line-height:1.6">You applied for <strong style="color:#f9fafb">${job_title || 'a position'}</strong> at Parkside Stores.<br>Use the code below to confirm your application.</p>
</td></tr>
<tr><td style="padding:0 40px 8px;text-align:center">
  <div style="display:inline-block;background:#1a1a24;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:20px 40px;margin-bottom:24px">
    <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#f9fafb;font-family:monospace">${code}</div>
  </div>
  <p style="font-size:12px;color:#374151;margin:0 0 28px">This code expires in 10 minutes. If you didn't apply, ignore this email.</p>
</td></tr>
<tr><td style="background:#0d0d14;border-top:1px solid rgba(255,255,255,.06);padding:20px 40px;text-align:center">
  <p style="margin:0;font-size:11px;color:#374151">Parkside Stores · <a href="https://parksidestore.cc" style="color:#6b7280;text-decoration:none">parksidestore.cc</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  const ok = await sendEmail({
    to: email,
    subject: `${code} — Your Parkside Application Code`,
    html,
    text: `Your Parkside Stores application verification code is: ${code}\n\nThis code expires in 10 minutes.`
  });

  return json({ ok: true, sent: ok });
}
