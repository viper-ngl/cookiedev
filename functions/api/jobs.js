
import{json,isOwner,getSession,getDB}from'../_lib.js';
async function canPost(req,env){if(await isOwner(req,env))return true;const b=req.headers.get('x-bot-secret');if(b&&b===env.BOT_SECRET)return true;const s=await getSession(req,env);return s&&s.group_rank>=150;}
export async function onRequestGet({env,request}){
  try{
    const url=new URL(request.url);const id=+url.searchParams.get('id');const db=await getDB(env);
    if(id){const r=await db.collection('jobs').findOne({createdAt:id});return r?json(r):json({error:'Not found'},404);}
    const jobs=await db.collection('jobs').find({active:true}).sort({createdAt:-1}).toArray();
    return json({jobs},200,{'cache-control':'public,max-age=60'});
  }catch(e){return json({error:e.message},502);}
}
export async function onRequestPost({request,env}){
  if(!await canPost(request,env)) return json({error:'Development Officer+ required'},401);
  const{title,description,department,questions,posted_by}=await request.json().catch(()=>({}));
  if(!title) return json({error:'title required'},400);
  const now=Math.floor(Date.now()/1000);const db=await getDB(env);
  await db.collection('jobs').insertOne({title,description:description||'',department:department||'General',questions:questions||['Why do you want to join?','What experience do you have?','What timezone are you in?'],posted_by:posted_by||'System',active:true,createdAt:now});
  return json({ok:true,id:now});
}
export async function onRequestDelete({request,env}){
  if(!await canPost(request,env)) return json({error:'Unauthorized'},401);
  const id=+new URL(request.url).searchParams.get('id');const db=await getDB(env);
  await db.collection('jobs').updateOne({createdAt:id},{$set:{active:false}});
  return json({ok:true});
}
