
import{json,isOwner,getSession,db}from'../_lib.js';
export async function onRequestGet({env}){const q=await db(env).find('quotas',{});return json({quotas:q});}
export async function onRequestPost({request,env}){
  const sess=await getSession(request,env);const ownerOk=await isOwner(request,env);
  if(!ownerOk&&(!sess||sess.group_rank<170))return json({error:'Staffing Officer+ required'},401);
  const{roblox_id,roblox_name,weekly_seconds}=await request.json().catch(()=>({}));
  if(!roblox_id||!weekly_seconds)return json({error:'roblox_id and weekly_seconds required'},400);
  await db(env).updateOne('quotas',{roblox_id:+roblox_id},{$set:{roblox_id:+roblox_id,roblox_name:roblox_name||'',weekly_seconds:+weekly_seconds,set_by:sess?.discord_name||'Owner',updatedAt:Math.floor(Date.now()/1000)}},true);
  return json({ok:true});
}
