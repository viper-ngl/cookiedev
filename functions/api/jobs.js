
import{json,isOwner,getSession,db}from'../_lib.js';
async function canPost(req,env){if(await isOwner(req,env))return true;const b=req.headers.get('x-bot-secret');if(b&&b===env.BOT_SECRET)return true;const s=await getSession(req,env);return s&&s.group_rank>=150;}
export async function onRequestGet({env,request}){
  try{
    const url=new URL(request.url);const id=+url.searchParams.get('id');const D=db(env);
    if(id){const r=await D.findOne('jobs',{createdAt:id});return r?json(r):json({error:'Not found'},404);}
    const jobs=await D.find('jobs',{active:true},{sort:{createdAt:-1}});
    return json({jobs},200,{'cache-control':'public,max-age=60'});
  }catch(e){return json({error:e.message},502);}
}
export async function onRequestPost({request,env}){
  if(!await canPost(request,env))return json({error:'Development Officer+ required'},401);
  const{title,description,department,questions,posted_by}=await request.json().catch(()=>({}));
  if(!title)return json({error:'title required'},400);
  const now=Math.floor(Date.now()/1000);
  await db(env).insertOne('jobs',{title,description:description||'',department:department||'General',questions:questions||['Why do you want to join?','What experience do you have?','What timezone are you in?'],posted_by:posted_by||'System',active:true,createdAt:now});
  return json({ok:true,id:now});
}
export async function onRequestDelete({request,env}){
  if(!await canPost(request,env))return json({error:'Unauthorized'},401);
  const id=+new URL(request.url).searchParams.get('id');
  await db(env).updateOne('jobs',{createdAt:id},{$set:{active:false}});
  return json({ok:true});
}
