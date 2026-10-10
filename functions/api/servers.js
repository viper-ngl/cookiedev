
import{json,db}from'../_lib.js';
export async function onRequestGet({env,request}){
  try{
    const url=new URL(request.url);const gameId=url.searchParams.get('game_id');
    const D=db(env);const cutoff=Math.floor(Date.now()/1000)-90;
    const filter={updatedAt:{$gt:cutoff}};if(gameId)filter.game_id=+gameId;
    const servers=await D.find('servers',filter,{sort:{updatedAt:-1}});
    return json({servers},200,{'cache-control':'public,max-age=15'});
  }catch(e){return json({error:e.message},502);}
}
export async function onRequestPost({request,env}){
  const secret=request.headers.get('x-roblox-secret');
  if(!secret||secret!==env.ROBLOX_SECRET)return json({error:'Unauthorized'},401);
  try{
    const body=await request.json();
    const{id,game_id,game_name,total_players,max_players,is_shift_active,shift_host,teams,players}=body;
    if(!id)return json({error:'id required'},400);
    const now=Math.floor(Date.now()/1000);const D=db(env);
    await D.updateOne('servers',{id},{$set:{id,game_id:game_id||0,game_name:game_name||'',total_players:total_players||0,max_players:max_players||40,is_shift_active:!!is_shift_active,shift_host:shift_host||null,teams:teams||[],updatedAt:now}},true);
    if(players?.length){
      for(const p of players){
        if(!p.roblox_id)continue;
        const ex=await D.findOne('activity',{server_id:id,roblox_id:p.roblox_id,leave_time:null});
        if(!ex)await D.insertOne('activity',{roblox_id:p.roblox_id,roblox_name:p.roblox_name||'',server_id:id,game_id:game_id||0,join_time:now,leave_time:null,duration_seconds:null});
      }
      const currentIds=new Set(players.map(p=>p.roblox_id));
      const active=await D.find('activity',{server_id:id,leave_time:null});
      for(const row of active){
        if(!currentIds.has(row.roblox_id)){
          const dur=now-(row.join_time||now);
          await D.updateOne('activity',{server_id:id,roblox_id:row.roblox_id,leave_time:null},{$set:{leave_time:now,duration_seconds:dur}});
        }
      }
    }
    return json({ok:true});
  }catch(e){return json({error:e.message},500);}
}
export async function onRequestDelete({request,env}){
  const secret=request.headers.get('x-roblox-secret');
  if(!secret||secret!==env.ROBLOX_SECRET)return json({error:'Unauthorized'},401);
  const id=new URL(request.url).searchParams.get('id');
  if(!id)return json({error:'id required'},400);
  try{
    const now=Math.floor(Date.now()/1000);const D=db(env);
    const open=await D.find('activity',{server_id:id,leave_time:null});
    for(const row of open)await D.updateOne('activity',{server_id:id,roblox_id:row.roblox_id,leave_time:null},{$set:{leave_time:now,duration_seconds:now-(row.join_time||now)}});
    await D.deleteOne('servers',{id});
    return json({ok:true});
  }catch(e){return json({error:e.message},500);}
}
