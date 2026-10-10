
import{json,isOwner,GROUP,getSession}from'../_lib.js';
const pub=async p=>{const r=await fetch('https://groups.roproxy.com/v1/'+p);if(!r.ok)throw new Error('roproxy '+r.status);return r.json();};
const oc=async(env,path,opt={})=>{const r=await fetch('https://apis.roblox.com/cloud/v2/'+path,{...opt,headers:{'x-api-key':env.ROBLOX_API_KEY,'content-type':'application/json',...(opt.headers||{})}});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'OC '+r.status);return d;};
async function auth(req,env){if(await isOwner(req,env))return true;const s=await getSession(req,env);return s&&s.group_rank>=150;}
export async function onRequestGet({request,env}){
  if(!await auth(request,env)) return json({error:'Unauthorized'},401);
  const url=new URL(request.url),action=url.searchParams.get('action');
  if(action==='audit'){try{const cur=url.searchParams.get('cursor')||'';const d=await oc(env,`groups/${GROUP}/operations?maxPageSize=25${cur?'&pageToken='+cur:''}`);return json({logs:(d.groupOperations||[]).map(op=>({type:op.type||'',actor:op.actor?.user?.username||'Unknown',target:op.operationDetails?.targetUser?.username||op.operationDetails?.roleName||'',oldRole:op.operationDetails?.oldRole?.name||null,newRole:op.operationDetails?.newRole?.name||null,time:op.createTime||null})),nextCursor:d.nextPageToken||null});}catch(e){return json({error:e.message},502);}}
  if(action==='roles'){try{const d=await pub(`groups/${GROUP}/roles`);return json({roles:(d.roles||[]).sort((a,b)=>b.rank-a.rank).map(r=>({id:r.id,name:r.name,rank:r.rank}))});}catch(e){return json({error:e.message},502);}}
  if(action==='search'){const q=url.searchParams.get('q')||'';if(!q)return json({error:'q required'},400);try{const ud=await fetch('https://users.roblox.com/v1/usernames/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({usernames:[q],excludeBannedUsers:false})}).then(r=>r.json());const u=ud.data?.[0];if(!u)return json({error:'User not found'},404);const gd=await fetch(`https://groups.roproxy.com/v2/users/${u.id}/groups/roles`).then(r=>r.json());const mem=gd.data?.find(x=>x.group.id===GROUP);const th=await fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${u.id}&size=150x150&format=Png`).then(r=>r.json());return json({user:{id:u.id,name:u.name,avatar:th.data?.[0]?.imageUrl||'',currentRole:mem?.role?.name||null,currentRoleId:mem?.role?.id||null,inGroup:!!mem}});}catch(e){return json({error:e.message},502);}}
  return json({error:'Unknown action'},400);
}
export async function onRequestPost({request,env}){
  if(!await auth(request,env)) return json({error:'Unauthorized'},401);
  const{action,userId,roleId}=await request.json().catch(()=>({}));
  if(action==='setRole'){if(!userId||!roleId)return json({error:'userId and roleId required'},400);try{await oc(env,`groups/${GROUP}/memberships`,{method:'PATCH',body:JSON.stringify({path:`groups/${GROUP}/memberships/${userId}`,role:`groups/${GROUP}/roles/${roleId}`})});return json({ok:true});}catch(e){return json({error:e.message},502);}}
  if(action==='exile'){if(!userId)return json({error:'userId required'},400);try{await oc(env,`groups/${GROUP}/memberships/${userId}`,{method:'DELETE'});return json({ok:true});}catch(e){return json({error:e.message},502);}}
  return json({error:'Unknown action'},400);
}
