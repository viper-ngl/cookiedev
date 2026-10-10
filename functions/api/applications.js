import { json, isOwner, getSession, sendEmbed, APP_CHANNEL, getDB } from '../_lib.js';
import { sendEmail } from './email.js';

export async function onRequestGet({ request, env }) {
  const sess = await getSession(request, env);
  const ownerOk = await isOwner(request, env);
  if (!sess && !ownerOk) return json({ error: 'Login required' }, 401);
  const db = await getDB(env);
  if (ownerOk || (sess && sess.group_rank >= 150)) {
    const apps = await db.collection('applications').find({}).sort({ createdAt: -1 }).limit(100).toArray();
    return json({ applications: apps });
  }
  const apps = await db.collection('applications').find({ discord_id: sess.discord_id }).sort({ createdAt: -1 }).toArray();
  return json({ applications: apps });
}

export async function onRequestPost({ request, env }) {
  const sess = await getSession(request, env);
  if (!sess) return json({ error: 'Login with Discord required' }, 401);
  const { job_id, answers } = await request.json().catch(() => ({}));
  if (!job_id) return json({ error: 'job_id required' }, 400);
  const db = await getDB(env);
  const job = await db.collection('jobs').findOne({ createdAt: +job_id, active: true });
  if (!job) return json({ error: 'Job not found' }, 404);
  const existing = await db.collection('applications').findOne({ job_id: +job_id, discord_id: sess.discord_id, status: { $ne: 'rejected' } });
  if (existing) return json({ error: 'Already applied' }, 409);
  const now = Math.floor(Date.now() / 1000);
  await db.collection('applications').insertOne({ job_id: +job_id, discord_id: sess.discord_id, discord_name: sess.discord_name, roblox_id: sess.roblox_id || null, roblox_name: sess.roblox_name || null, answers: answers || {}, status: 'pending', createdAt: now });

  // Discord embed to app channel
  const answerText = Object.entries(answers || {}).slice(0, 5).map(([q, a]) => `**${q}**\n${a}`).join('\n\n');
  await sendEmbed(APP_CHANNEL, {
    title: `New Application: ${job.title}`,
    color: 0x2b2d31,
    fields: [
      { name: 'Applicant', value: `${sess.discord_name} (<@${sess.discord_id}>)`, inline: true },
      { name: 'Roblox', value: sess.roblox_name || 'Not linked', inline: true },
      { name: 'Department', value: job.department || 'General', inline: true },
      { name: 'Answers', value: answerText.substring(0, 1024) || 'No answers' }
    ],
    timestamp: new Date().toISOString(),
    footer: { text: 'Parkside Careers' }
  });

  // Send confirmation email if they have a parksidestore.cc email
  // We send to any email we can derive - for now notify via Discord DM attempt
  // If staff have linked email in future this will send there
  // For now send a generic confirmation embed back to applicant via Discord
  try {
    await fetch(`https://discord.com/api/v10/users/@me/channels`, {
      method: 'POST',
      headers: { 'Authorization': `Bot MTU1NjMyMjgyMTE1NDgwNzkwOA.GEiEBe.WbjJWYcdeC1QMl31ixfLSB5hVeAJ5vq5wu_YhE`, 'content-type': 'application/json' },
      body: JSON.stringify({ recipient_id: sess.discord_id })
    }).then(async r => {
      const ch = await r.json();
      if (ch.id) {
        await sendEmbed(ch.id, {
          title: 'Application Received',
          description: `Thanks **${sess.discord_name}**! Your application for **${job.title}** has been received.\n\nOur team will review it and get back to you in your Discord DMs.`,
          color: 0x1a1a1a,
          timestamp: new Date().toISOString(),
          footer: { text: 'Parkside Stores Careers' }
        });
      }
    });
  } catch { /* DM failed, that's ok */ }

  return json({ ok: true });
}

export async function onRequestPatch({ request, env }) {
  const sess = await getSession(request, env);
  const ownerOk = await isOwner(request, env);
  if (!ownerOk && (!sess || sess.group_rank < 150)) return json({ error: 'Unauthorized' }, 401);
  const { id, status } = await request.json().catch(() => ({}));
  const db = await getDB(env);
  const app = await db.collection('applications').findOne({ createdAt: +id });
  await db.collection('applications').updateOne({ createdAt: +id }, { $set: { status, reviewed_by: sess?.discord_name || 'Owner' } });

  // Notify applicant via Discord DM when status changes
  if (app?.discord_id && (status === 'accepted' || status === 'rejected')) {
    try {
      const job = await db.collection('jobs').findOne({ createdAt: app.job_id });
      await fetch(`https://discord.com/api/v10/users/@me/channels`, {
        method: 'POST',
        headers: { 'Authorization': `Bot MTU1NjMyMjgyMTE1NDgwNzkwOA.GEiEBe.WbjJWYcdeC1QMl31ixfLSB5hVeAJ5vq5wu_YhE`, 'content-type': 'application/json' },
        body: JSON.stringify({ recipient_id: app.discord_id })
      }).then(async r => {
        const ch = await r.json();
        if (ch.id) {
          const accepted = status === 'accepted';
          await sendEmbed(ch.id, {
            title: accepted ? 'Application Accepted!' : 'Application Update',
            description: accepted
              ? `Congratulations **${app.discord_name}**! Your application for **${job?.title || 'the position'}** has been **accepted**.\n\nPlease check the Parkside Stores Discord for next steps.`
              : `Hi **${app.discord_name}**, your application for **${job?.title || 'the position'}** was not successful this time. Thank you for applying — feel free to apply again in the future!`,
            color: accepted ? 0x22c55e : 0xef4444,
            timestamp: new Date().toISOString(),
            footer: { text: 'Parkside Stores Careers' }
          });
        }
      });
    } catch { /* DM failed */ }
  }

  return json({ ok: true });
}
