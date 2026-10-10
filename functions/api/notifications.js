
import{json,isOwner,getSession,db}from'../_lib.js';
async function auth(req,env){if(await isOwner(req,env))return true;const b=req.headers.get('x-bot-secret');if(b&&b===env.BOT_SECRET)return true;const s=await getSession(req,env);return s&&s.group_rank>=200;}
export async function onRequestGet({env}){
  try{const n=await db(env).find('notifications',{active:true},{sort:{createdAt:-1},limit:5});return json({notifications:n},200,{'cache-control':'public,max-age=30'});}catch(e){return json({error:e.message},502);}
}
export async function onRequestPost({request,env}){
  if(!await auth(request,env))return json({error:'Unauthorized'},401);
  const{message,type,posted_by}=await request.json().catch(()=>({}));
  if(!message)return json({error:'message required'},400);
  await db(env).insertOne('notifications',{message,type:type||'info',posted_by:posted_by||'System',active:true});
  return json({ok:true});
}
export async function onRequestDelete({request,env}){
  if(!await auth(request,env))return json({error:'Unauthorized'},401);
  const ts=+new URL(request.url).searchParams.get('id');
  await db(env).updateOne('notifications',{createdAt:ts},{$set:{active:false}});
  return json({ok:true});
}
