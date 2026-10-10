
import{json,isOwner,rbx,heads,GROUP,getSession,getDB}from'../_lib.js';
async function auth(req,env){if(await isOwner(req,env))return true;const s=await getSession(req,env);return s&&s.group_rank>=150;}
export async function onRequestGet({env}){
  const db=await getDB(env);
  const people=await db.collection('departments').find({}).toArray();
  const h=await heads(people.map(x=>x.roblox_id).filter(Boolean));
  return json({people:people.map(x=>({...x,avatar:h[x.roblox_id]}))},200,{'cache-control':'public,max-age=60'});
}
export async function onRequestPost({request,env}){
  if(!await auth(request,env)) return json({error:'Unauthorized'},401);
  const{username,department,rank}=await request.json().catch(()=>({}));
  if(!username||!department) return json({error:'Username and department required'},400);
  try{
    const ud=await rbx('https://users.roblox.com/v1/usernames/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({usernames:[username],excludeBannedUsers:false})});
    const u=ud.data?.[0];if(!u) return json({error:'Roblox user not found'},404);
    let r=(rank||'').trim();
    if(!r){const g=await rbx(`https://groups.roproxy.com/v2/users/${u.id}/groups/roles`);const mem=g.data?.find(x=>x.group.id===GROUP);r=mem?mem.role.name:'Not in group';}
    const db=await getDB(env);
    await db.collection('departments').updateOne({roblox_id:u.id},{$set:{roblox_id:u.id,roblox_name:u.name,department:department.trim(),rank:r}},{upsert:true});
    return json({ok:true,user:{id:u.id,name:u.name,rank:r}});
  }catch(e){return json({error:e.message},502);}
}
export async function onRequestDelete({request,env}){
  if(!await auth(request,env)) return json({error:'Unauthorized'},401);
  const id=+new URL(request.url).searchParams.get('id');
  const db=await getDB(env);
  await db.collection('departments').deleteOne({roblox_id:id});
  return json({ok:true});
}
