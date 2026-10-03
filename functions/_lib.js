export const GROUP = 993201720;
export const json = (d, s=200, h={}) => new Response(JSON.stringify(d),{status:s,headers:{'content-type':'application/json','access-control-allow-origin':'*',...h}});
const enc = new TextEncoder();
async function hmac(secret,msg){const k=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return[...new Uint8Array(await crypto.subtle.sign('HMAC',k,enc.encode(msg)))].map(b=>b.toString(16).padStart(2,'0')).join('');}
export async function makeToken(env){const exp=Date.now()+12*36e5;return exp+'.'+await hmac(env.OWNER_SECRET,String(exp));}
export async function isOwner(req,env){const m=(req.headers.get('cookie')||'').match(/owner=(\d+)\.([a-f0-9]+)/);return!!(m&&env.OWNER_SECRET&&+m[1]>Date.now()&&m[2]===await hmac(env.OWNER_SECRET,m[1]));}
export async function rbx(url,opt){const r=await fetch(url,opt);if(!r.ok)throw new Error('Roblox '+r.status);return r.json();}
export async function heads(ids){const o={};for(let i=0;i<ids.length;i+=100){try{const d=await rbx(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids.slice(i,i+100).join(',')}&size=150x150&format=Png`);d.data.forEach(x=>o[x.targetId]=x.imageUrl);}catch{}}return o;}
