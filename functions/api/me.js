
import{json,getSession,db}from'../_lib.js';
export async function onRequestGet({request,env}){
  const sess=await getSession(request,env);
  if(!sess)return json({user:null});
  return json({user:{discord_id:sess.discord_id,discord_name:sess.discord_name,discord_avatar:sess.discord_avatar,roblox_id:sess.roblox_id,roblox_name:sess.roblox_name,group_role:sess.group_role,group_rank:sess.group_rank}});
}
export async function onRequestDelete({request,env}){
  const sid=(request.headers.get('cookie')||'').match(/dsid=([^;]+)/)?.[1];
  if(sid)try{await db(env).deleteOne('sessions',{discord_id:sid});}catch{}
  return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json','set-cookie':'dsid=deleted; Path=/; Max-Age=0'}});
}
