import{json,isOwner,GROUP}from'../_lib.js';

const oc=(env,path,opt={})=>fetch(`https://apis.roblox.com/cloud/v2/${path}`,{...opt,headers:{'x-api-key':env.ROBLOX_API_KEY,'content-type':'application/json',...(opt.headers||{})}}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Roblox API '+r.status);return d;});

const rbxPub=(path)=>fetch(`https://groups.roproxy.com/v1/${path}`).then(r=>r.json());

export async function onRequestGet({request,env}){
  if(!await isOwner(request,env))return json({error:'Unauthorized'},401);
  const url=new URL(request.url);
  const action=url.searchParams.get('action');

  if(action==='audit'){
    try{
      const limit=url.searchParams.get('limit')||25;
      const cursor=url.searchParams.get('cursor')||'';
      const d=await oc(env,`groups/${GROUP}/operations?maxPageSize=${limit}${cursor?'&pageToken='+cursor:''}`);
      const logs=(d.groupOperations||[]).map(op=>({
        id:op.id,
        type:op.type,
        actor:op.actor?.user?.username||'Unknown',
        actorId:op.actor?.user?.path?.split('/').pop()||null,
        target:op.operationDetails?.targetUser?.username||op.operationDetails?.roleName||'',
        targetId:op.operationDetails?.targetUser?.path?.split('/').pop()||null,
        oldRole:op.operationDetails?.oldRole?.name||null,
        newRole:op.operationDetails?.newRole?.name||null,
        time:op.createTime||null,
      }));
      return json({logs,nextCursor:d.nextPageToken||null});
    }catch(e){return json({error:e.message},502);}
  }

  if(action==='roles'){
    try{
      const d=await rbxPub(`groups/${GROUP}/roles`);
      const roles=(d.roles||[]).sort((a,b)=>b.rank-a.rank).map(r=>({id:r.id,name:r.name,rank:r.rank,memberCount:r.memberCount}));
      return json({roles});
    }catch(e){return json({error:e.message},502);}
  }

  if(action==='search'){
    const q=url.searchParams.get('q')||'';
    if(!q)return json({error:'q required'},400);
    try{
      const d=await fetch(`https://users.roblox.com/v1/usernames/users`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({usernames:[q],excludeBannedUsers:false})}).then(r=>r.json());
      const user=d.data?.[0];
      if(!user)return json({error:'User not found'},404);
      const grp=await fetch(`https://groups.roproxy.com/v2/users/${user.id}/groups/roles`).then(r=>r.json());
      const membership=grp.data?.find(x=>x.group.id===GROUP);
      return json({user:{id:user.id,name:user.name,currentRole:membership?.role?.name||null,currentRoleId:membership?.role?.id||null,currentRoleRank:membership?.role?.rank||0,inGroup:!!membership}});
    }catch(e){return json({error:e.message},502);}
  }

  return json({error:'Unknown action'},400);
}

export async function onRequestPost({request,env}){
  if(!await isOwner(request,env))return json({error:'Unauthorized'},401);
  const{action,userId,roleId,username}=await request.json().catch(()=>({}));

  if(action==='setRole'){
    if(!userId||!roleId)return json({error:'userId and roleId required'},400);
    try{
      await oc(env,`groups/${GROUP}/memberships/${userId}`,{method:'PATCH',body:JSON.stringify({role:`groups/${GROUP}/roles/${roleId}`})});
      return json({ok:true});
    }catch(e){return json({error:e.message},502);}
  }

  if(action==='exile'){
    if(!userId)return json({error:'userId required'},400);
    try{
      await oc(env,`groups/${GROUP}/memberships/${userId}`,{method:'DELETE'});
      return json({ok:true});
    }catch(e){return json({error:e.message},502);}
  }

  return json({error:'Unknown action'},400);
}
