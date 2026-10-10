
import{json,isOwner,getSession,sendEmbed,APP_CHANNEL,BOT_TOKEN,db}from'../_lib.js';
export async function onRequestGet({request,env}){
  const sess=await getSession(request,env);const ownerOk=await isOwner(request,env);
  if(!sess&&!ownerOk)return json({error:'Login required'},401);
  const D=db(env);
  if(ownerOk||(sess&&sess.group_rank>=150)){const apps=await D.find('applications',{},{sort:{createdAt:-1},limit:100});return json({applications:apps});}
  const apps=await D.find('applications',{discord_id:sess.discord_id},{sort:{createdAt:-1}});
  return json({applications:apps});
}
export async function onRequestPost({request,env}){
  const sess=await getSession(request,env);
  if(!sess)return json({error:'Login with Discord required'},401);
  const{job_id,answers,email}=await request.json().catch(()=>({}));
  if(!job_id)return json({error:'job_id required'},400);
  const D=db(env);
  const job=await D.findOne('jobs',{createdAt:+job_id,active:true});
  if(!job)return json({error:'Job not found'},404);
  const existing=await D.findOne('applications',{job_id:+job_id,discord_id:sess.discord_id,status:{$ne:'rejected'}});
  if(existing)return json({error:'Already applied'},409);
  await D.insertOne('applications',{job_id:+job_id,discord_id:sess.discord_id,discord_name:sess.discord_name,roblox_id:sess.roblox_id||null,roblox_name:sess.roblox_name||null,answers:answers||{},email:email||'',status:'pending'});
  const answerText=Object.entries(answers||{}).slice(0,5).map(([q,a])=>`**${q}**\n${a}`).join('\n\n');
  await sendEmbed(APP_CHANNEL,{title:`New Application: ${job.title}`,color:0x2b2d31,fields:[{name:'Applicant',value:`${sess.discord_name} (<@${sess.discord_id}>)`,inline:true},{name:'Roblox',value:sess.roblox_name||'Not linked',inline:true},{name:'Department',value:job.department||'General',inline:true},{name:'Answers',value:answerText.substring(0,1024)||'No answers'}],timestamp:new Date().toISOString(),footer:{text:'Parkside Careers'}});
  try{
    const ch=await fetch('https://discord.com/api/v10/users/@me/channels',{method:'POST',headers:{'Authorization':'Bot '+BOT_TOKEN,'content-type':'application/json'},body:JSON.stringify({recipient_id:sess.discord_id})}).then(r=>r.json());
    if(ch.id)await sendEmbed(ch.id,{title:'Application Received',description:`Thanks **${sess.discord_name}**! Your application for **${job.title}** has been received. Our team will review it shortly.`,color:0x1a1a24,timestamp:new Date().toISOString(),footer:{text:'Parkside Stores Careers'}});
  }catch{}
  return json({ok:true});
}
export async function onRequestPatch({request,env}){
  const sess=await getSession(request,env);const ownerOk=await isOwner(request,env);
  if(!ownerOk&&(!sess||sess.group_rank<150))return json({error:'Unauthorized'},401);
  const{id,status}=await request.json().catch(()=>({}));
  const D=db(env);
  const app=await D.findOne('applications',{createdAt:+id});
  await D.updateOne('applications',{createdAt:+id},{$set:{status,reviewed_by:sess?.discord_name||'Owner'}});
  if(app?.discord_id&&(status==='accepted'||status==='rejected')){
    try{
      const job=await D.findOne('jobs',{createdAt:app.job_id});
      const ch=await fetch('https://discord.com/api/v10/users/@me/channels',{method:'POST',headers:{'Authorization':'Bot '+BOT_TOKEN,'content-type':'application/json'},body:JSON.stringify({recipient_id:app.discord_id})}).then(r=>r.json());
      if(ch.id){const accepted=status==='accepted';await sendEmbed(ch.id,{title:accepted?'Application Accepted!':'Application Update',description:accepted?`Congratulations **${app.discord_name}**! Your application for **${job?.title||'the position'}** has been accepted. Check the Parkside Discord for next steps.`:`Hi **${app.discord_name}**, your application for **${job?.title||'the position'}** was not successful this time. Thank you for applying!`,color:accepted?0x22c55e:0xef4444,timestamp:new Date().toISOString(),footer:{text:'Parkside Stores Careers'}});}
    }catch{}
  }
  return json({ok:true});
}
