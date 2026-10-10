
import{json,getDB}from'../_lib.js';
export async function onRequestGet({env,request}){
  try{
    const url=new URL(request.url);const gameId=url.searchParams.get('game_id');
    const db=await getDB(env);
    const cutoff=Math.floor(Date.now()/1000)-90;
    const filter={updatedAt:{$gt:cutoff}};
    if(gameId) filter.game_id=+gameId;
    const servers=await db.collection('servers').find(filter).sort({updatedAt:-1}).toArray();
    return json({servers},200,{'cache-control':'public,max-age=15'});
  }catch(e){return json({error:e.message},502);}
}
export async function onRequestPost({request,env}){
  const secret=request.headers.get('x-roblox-secret');
  if(!secret||secret!==env.ROBLOX_SECRET) return json({error:'Unauthorized'},401);
  try{
    const body=await request.json();
    const{id,game_id,game_name,total_players,max_players,is_shift_active,shift_host,teams,players}=body;
    if(!id) return json({error:'id required'},400);
    const now=Math.floor(Date.now()/1000);
    const db=await getDB(env);
    await db.collection('servers').updateOne({id},{$set:{id,game_id:game_id||0,game_name:game_name||'',total_players:total_players||0,max_players:max_players||40,is_shift_active:!!is_shift_active,shift_host:shift_host||null,teams:teams||[],updatedAt:now}},{upsert:true});
    if(players?.length){
      for(const p of players){
        if(!p.roblox_id) continue;
        const ex=await db.collection('activity').findOne({server_id:id,roblox_id:p.roblox_id,leave_time:null});
        if(!ex) await db.collection('activity').insertOne({roblox_id:p.roblox_id,roblox_name:p.roblox_name||'',server_id:id,game_id:game_id||0,join_time:now,leave_time:null,duration_seconds:null,createdAt:now});
      }
      const currentIds=new Set(players.map(p=>p.roblox_id));
      const active=await db.collection('activity').find({server_id:id,leave_time:null}).toArray();
      for(const row of active){
        if(!currentIds.has(row.roblox_id)){
          const dur=now-(row.join_time||now);
          await db.collection('activity').updateOne({_id:row._id},{$set:{leave_time:now,duration_seconds:dur}});
        }
      }
    }
    return json({ok:true});
  }catch(e){return json({error:e.message},500);}
}
export async function onRequestDelete({request,env}){
  const secret=request.headers.get('x-roblox-secret');
  if(!secret||secret!==env.ROBLOX_SECRET) return json({error:'Unauthorized'},401);
  const id=new URL(request.url).searchParams.get('id');
  if(!id) return json({error:'id required'},400);
  try{
    const now=Math.floor(Date.now()/1000);const db=await getDB(env);
    const open=await db.collection('activity').find({server_id:id,leave_time:null}).toArray();
    for(const row of open) await db.collection('activity').updateOne({_id:row._id},{$set:{leave_time:now,duration_seconds:now-(row.join_time||now)}});
    await db.collection('servers').deleteOne({id});
    return json({ok:true});
  }catch(e){return json({error:e.message},500);}
}
