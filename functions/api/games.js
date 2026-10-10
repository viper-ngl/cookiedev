
import{json,isOwner,getSession,db}from'../_lib.js';
async function auth(req,env){if(await isOwner(req,env))return true;const s=await getSession(req,env);return s&&s.group_rank>=150;}
export async function onRequestGet({env}){
  try{
    const D=db(env);const tracked=await D.find('games',{enabled:true});
    if(!tracked.length)return json({games:[]});
    const ids=tracked.map(g=>g.universeId).join(',');
    const[gd,td]=await Promise.all([
      fetch(`https://games.roproxy.com/v1/games?universeIds=${ids}`).then(r=>r.json()).catch(()=>({data:[]})),
      fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids}&size=512x512&format=Png&isCircular=false`).then(r=>r.json()).catch(()=>({data:[]}))
    ]);
    const dm={},tm={};
    (gd.data||[]).forEach(g=>dm[g.id]=g);(td.data||[]).forEach(t=>tm[t.targetId]=t.imageUrl);
    return json({games:tracked.map(g=>({...g,name:dm[g.universeId]?.name||g.name,playing:dm[g.universeId]?.playing||0,visits:dm[g.universeId]?.visits||0,thumb:tm[g.universeId]||null,rootPlaceId:dm[g.universeId]?.rootPlaceId||g.rootPlaceId}))},200,{'cache-control':'public,max-age=60'});
  }catch(e){return json({error:e.message},502);}
}
export async function onRequestPost({request,env}){
  if(!await auth(request,env))return json({error:'Unauthorized'},401);
  const{universeId,name,enabled=true}=await request.json().catch(()=>({}));
  if(!universeId)return json({error:'universeId required'},400);
  const uid=+universeId;
  try{
    const d=await fetch(`https://games.roproxy.com/v1/games?universeIds=${uid}`).then(r=>r.json());
    const g=d.data?.[0];
    await db(env).updateOne('games',{universeId:uid},{$set:{universeId:uid,name:g?.name||name||'Unknown',rootPlaceId:g?.rootPlaceId||null,enabled}},true);
    return json({ok:true,game:{universeId:uid,name:g?.name||name}});
  }catch(e){return json({error:e.message},502);}
}
export async function onRequestDelete({request,env}){
  if(!await auth(request,env))return json({error:'Unauthorized'},401);
  const uid=+new URL(request.url).searchParams.get('universeId');
  await db(env).deleteOne('games',{universeId:uid});
  return json({ok:true});
}
export async function onRequestPatch({request,env}){
  if(!await auth(request,env))return json({error:'Unauthorized'},401);
  const{universeId,enabled}=await request.json().catch(()=>({}));
  await db(env).updateOne('games',{universeId:+universeId},{$set:{enabled}});
  return json({ok:true});
}
