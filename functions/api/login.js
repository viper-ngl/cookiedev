
import{json,makeToken,isOwner}from'../_lib.js';
export const onRequestGet=async({request,env})=>json({owner:await isOwner(request,env)});
export async function onRequestPost({request,env}){
  const{password=''}=await request.json().catch(()=>({}));
  if(!env.OWNER_PASSWORD||password!==env.OWNER_PASSWORD){await new Promise(r=>setTimeout(r,800));return json({error:'Wrong password'},401);}
  const token=await makeToken(env);
  return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json','set-cookie':`owner=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`}});
}
export const onRequestDelete=()=>new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json','set-cookie':'owner=deleted; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'}});
