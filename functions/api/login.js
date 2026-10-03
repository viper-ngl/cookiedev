import{json,makeToken,isOwner}from'../_lib.js';
export const onRequestGet=async({request,env})=>json({owner:await isOwner(request,env)});
export async function onRequestPost({request,env}){const{password=''}=await request.json().catch(()=>({}));if(!env.OWNER_PASSWORD||password!==env.OWNER_PASSWORD){await new Promise(r=>setTimeout(r,800));return json({error:'Wrong password'},401);}return json({ok:true},200,{'set-cookie':`owner=${await makeToken(env)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`});}
export const onRequestDelete=()=>json({ok:true},200,{'set-cookie':'owner=; Path=/; Max-Age=0'});
