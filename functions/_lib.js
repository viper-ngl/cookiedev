
export const GROUP = 993201720;
export const DISCORD_CLIENT_ID = '1556322821154807908';
export const DISCORD_CLIENT_SECRET = '_jB69I-CRh6hquCKKwUwPHCp9-bYQXjz';
export const BOT_TOKEN = 'MTU1NjMyMjgyMTE1NDgwNzkwOA.GEiEBe.WbjJWYcdeC1QMl31ixfLSB5hVeAJ5vq5wu_YhE';
export const BLOXLINK_KEY = '7dd47fe7-a54d-4917-831c-454f491e478c';
export const APP_CHANNEL = '1555974526209232956';
export const STATUS_CHANNEL = '1548199114532192296';
export const DISCORD_GUILD = '1489137841878597642';
export const SITE_URL = 'https://parksidestore.cc';

// MongoDB Atlas Data API - pure HTTP, no driver needed
// MONGO_URL format: https://data.mongodb-api.com/app/YOUR_APP_ID/endpoint/data/v1
// MONGO_API_KEY: your Atlas Data API key
export function db(env) {
  const url = env.MONGO_URL;
  const key = env.MONGO_API_KEY;
  const ds = 'Cluster0';
  const database = 'parkside';

  const req = async (action, body) => {
    const r = await fetch(`${url}/action/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': key },
      body: JSON.stringify({ dataSource: ds, database, ...body })
    });
    if (!r.ok) {
      const t = await r.text();
      throw new Error(`MongoDB ${action} ${r.status}: ${t}`);
    }
    return r.json();
  };

  return {
    async find(collection, filter = {}, opts = {}) {
      const d = await req('find', { collection, filter, sort: opts.sort || { createdAt: -1 }, limit: opts.limit || 200 });
      return d.documents || [];
    },
    async findOne(collection, filter) {
      const d = await req('findOne', { collection, filter });
      return d.document || null;
    },
    async insertOne(collection, doc) {
      return req('insertOne', { collection, document: { ...doc, createdAt: Math.floor(Date.now() / 1000) } });
    },
    async updateOne(collection, filter, update, upsert = false) {
      return req('updateOne', { collection, filter, update, upsert });
    },
    async deleteOne(collection, filter) {
      return req('deleteOne', { collection, filter });
    },
    async aggregate(collection, pipeline) {
      const d = await req('aggregate', { collection, pipeline });
      return d.documents || [];
    }
  };
}

export const json = (d, s = 200, h = {}) => new Response(JSON.stringify(d), {
  status: s,
  headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...h }
});

const enc = new TextEncoder();
async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function makeToken(env) {
  const exp = Date.now() + 12 * 36e5;
  return exp + '.' + await hmac(env.OWNER_SECRET, String(exp));
}
export async function isOwner(req, env) {
  const m = (req.headers.get('cookie') || '').match(/owner=(\d+)\.([a-f0-9]+)/);
  return !!(m && env.OWNER_SECRET && +m[1] > Date.now() && m[2] === await hmac(env.OWNER_SECRET, m[1]));
}

export async function getSession(req, env) {
  const sid = (req.headers.get('cookie') || '').match(/dsid=([^;]+)/)?.[1];
  if (!sid) return null;
  try {
    const sess = await db(env).findOne('sessions', { discord_id: sid });
    if (!sess || sess.expiresAt < Math.floor(Date.now() / 1000)) return null;
    return sess;
  } catch { return null; }
}

export async function getGroupRank(discordId) {
  try {
    const bl = await fetch(`https://api.blox.link/v4/public/guilds/${DISCORD_GUILD}/discord-to-roblox/${discordId}`, {
      headers: { Authorization: BLOXLINK_KEY }
    }).then(r => r.json());
    if (!bl.robloxID) return { robloxId: null, robloxName: null, role: null, rank: 0 };
    const robloxId = bl.robloxID;
    const [uInfo, gInfo] = await Promise.all([
      fetch(`https://users.roblox.com/v1/users/${robloxId}`).then(r => r.json()),
      fetch(`https://groups.roproxy.com/v2/users/${robloxId}/groups/roles`).then(r => r.json())
    ]);
    const mem = gInfo.data?.find(x => x.group.id === GROUP);
    return { robloxId, robloxName: uInfo.name || 'Unknown', role: mem?.role?.name || null, rank: mem?.role?.rank || 0 };
  } catch { return { robloxId: null, robloxName: null, role: null, rank: 0 }; }
}

export async function sendEmbed(channelId, embed) {
  return fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'Authorization': 'Bot ' + BOT_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });
}

export async function sendEmail({ to, subject, html, text }) {
  try {
    const r = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'noreply@parksidestore.cc', name: 'Parkside Stores' },
        subject,
        content: [
          { type: 'text/plain', value: text || subject },
          { type: 'text/html', value: html || `<p>${text || subject}</p>` }
        ]
      })
    });
    return r.status < 300;
  } catch { return false; }
}

export async function rbx(url, opt) {
  const r = await fetch(url, opt);
  if (!r.ok) throw new Error('Roblox ' + r.status);
  return r.json();
}
export async function heads(ids) {
  const o = {};
  for (let i = 0; i < ids.length; i += 100) {
    try {
      const d = await rbx(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids.slice(i, i + 100).join(',')}&size=150x150&format=Png`);
      d.data.forEach(x => o[x.targetId] = x.imageUrl);
    } catch { }
  }
  return o;
}
