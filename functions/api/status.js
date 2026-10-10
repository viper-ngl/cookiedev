
import{json,isOwner,getSession,sendEmbed,STATUS_CHANNEL,db}from'../_lib.js';
async function auth(req,env){if(await isOwner(req,env))return true;const b=req.headers.get('x-bot-secret');if(b&&b===env.BOT_SECRET)return true;const s=await getSession(req,env);return s&&s.group_rank>=200;}
export async function onRequestGet({env}){
  try{const i=await db(env).find('incidents',{},{sort:{createdAt:-1},limit:20});return json({incidents:i},200,{'cache-control':'public,max-age=60'});}catch(e){return json({error:e.message},502);}
}
export async function onRequestPost({request,env}){
  if(!await auth(request,env))return json({error:'Unauthorized'},401);
  const{title,description,severity,posted_by}=await request.json().catch(()=>({}));
  if(!title)return json({error:'title required'},400);
  await db(env).insertOne('incidents',{title,description:description||'',severity:severity||'minor',posted_by:posted_by||'System',resolved:false});
  const colors={minor:16776960,major:15158332,critical:10038562};
  await sendEmbed(STATUS_CHANNEL,{title:'Status Update',description:`**${title}**\n${description||''}`,color:colors[severity]||16776960,timestamp:new Date().toISOString(),footer:{text:'Parkside Stores Status'}});
  return json({ok:true});
}
export async function onRequestPatch({request,env}){
  if(!await auth(request,env))return json({error:'Unauthorized'},401);
  const{id,resolved}=await request.json().catch(()=>({}));
  await db(env).updateOne('incidents',{createdAt:+id},{$set:{resolved:!!resolved,resolvedAt:Math.floor(Date.now()/1000)}});
  if(resolved)await sendEmbed(STATUS_CHANNEL,{title:'Incident Resolved',color:3066993,timestamp:new Date().toISOString(),footer:{text:'Parkside Stores Status'}});
  return json({ok:true});
}
