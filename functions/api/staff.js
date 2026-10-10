
import{json,GROUP,rbx,heads}from'../_lib.js';
export async function onRequestGet(ctx){
  const cache=caches.default,key=new Request('https://cache.local/staff');
  const hit=await cache.match(key);if(hit)return hit;
  try{
    const{roles}=await rbx(`https://groups.roblox.com/v1/groups/${GROUP}/roles`);
    const min=roles.find(r=>r.name.toLowerCase()===(ctx.env.MIN_ROLE||'development team').toLowerCase());
    if(!min)return json({error:'MIN_ROLE not found'},500);
    const out=[];
    for(const r of roles.filter(r=>r.rank>=min.rank).sort((a,b)=>b.rank-a.rank)){
      let c='';
      do{const d=await rbx(`https://groups.roblox.com/v1/groups/${GROUP}/roles/${r.id}/users?limit=100&sortOrder=Asc${c?'&cursor='+c:''}`);d.data.forEach(u=>out.push({id:u.userId,name:u.username,rank:r.name}));c=d.nextPageCursor;}while(c);
    }
    const h=await heads(out.map(u=>u.id));out.forEach(u=>u.avatar=h[u.id]);
    const res=json({staff:out},200,{'cache-control':'public,max-age=300'});
    ctx.waitUntil(cache.put(key,res.clone()));return res;
  }catch(e){return json({error:e.message},502);}
}
