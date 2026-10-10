
import{json,DISCORD_CLIENT_ID,DISCORD_CLIENT_SECRET,SITE_URL,getGroupRank,db}from'../_lib.js';
export async function onRequestGet({request,env}){
  const url=new URL(request.url);
  const code=url.searchParams.get('code');
  const state=decodeURIComponent(url.searchParams.get('state')||'/');
  if(!code)return Response.redirect(`${SITE_URL}/auth/login?redirect=${encodeURIComponent(state)}`,302);
  try{
    const tok=await fetch('https://discord.com/api/v10/oauth2/token',{method:'POST',body:new URLSearchParams({client_id:DISCORD_CLIENT_ID,client_secret:DISCORD_CLIENT_SECRET,grant_type:'authorization_code',code,redirect_uri:`${SITE_URL}/auth/callback`}),headers:{'content-type':'application/x-www-form-urlencoded'}}).then(r=>r.json());
    if(!tok.access_token)return Response.redirect(`${SITE_URL}/auth/error`,302);
    const user=await fetch('https://discord.com/api/v10/users/@me',{headers:{Authorization:`Bearer ${tok.access_token}`}}).then(r=>r.json());
    const rank=await getGroupRank(user.id);
    const now=Math.floor(Date.now()/1000);
    await db(env).updateOne('sessions',{discord_id:user.id},{$set:{discord_id:user.id,discord_name:user.username,discord_avatar:user.avatar||'',roblox_id:rank.robloxId||null,roblox_name:rank.robloxName||null,group_role:rank.role||null,group_rank:rank.rank||0,expiresAt:now+604800,updatedAt:now}},true);
    return new Response(null,{status:302,headers:{location:state,'set-cookie':`dsid=${user.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`}});
  }catch(e){return Response.redirect(`${SITE_URL}/auth/error?e=${encodeURIComponent(e.message)}`,302);}
}
