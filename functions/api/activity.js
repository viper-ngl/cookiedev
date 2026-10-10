
import{json,isOwner,getSession,getDB}from'../_lib.js';
export async function onRequestGet({request,env}){
  const sess=await getSession(request,env);const ownerOk=await isOwner(request,env);
  const url=new URL(request.url);const robloxId=+url.searchParams.get('roblox_id');
  const weekStart=Math.floor(Date.now()/1000)-7*86400;
  const db=await getDB(env);
  if(robloxId){
    const sessions=await db.collection('activity').find({roblox_id:robloxId,join_time:{$gt:weekStart}}).sort({join_time:-1}).limit(20).toArray();
    const total=sessions.reduce((a,s)=>a+(s.duration_seconds||0),0);
    const quota=await db.collection('quotas').findOne({roblox_id:robloxId});
    return json({weekly_seconds:total,sessions,quota:quota||null});
  }
  if(!ownerOk&&(!sess||sess.group_rank<100)) return json({error:'Unauthorized'},401);
  const summary=await db.collection('activity').aggregate([
    {$match:{join_time:{$gt:weekStart}}},
    {$group:{_id:'$roblox_id',roblox_name:{$first:'$roblox_name'},weekly_seconds:{$sum:'$duration_seconds'},session_count:{$sum:1}}},
    {$sort:{weekly_seconds:-1}}
  ]).toArray();
  return json({staff:summary});
}
