import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const h={"Access-Control-Allow-Origin":"https://talossocial.com","Access-Control-Allow-Headers":"authorization,apikey,content-type","Content-Type":"application/json"};
const respond=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:h});
Deno.serve(async request=>{
 if(request.method==="OPTIONS")return new Response(null,{headers:h});
 if(request.method!=="POST")return respond({error:"POST required"},405);
 try {
 const auth=request.headers.get("authorization")||"";
 const url=Deno.env.get("SUPABASE_URL")||"";
 const key=Deno.env.get("SUPABASE_ANON_KEY")||"";
 const db=createClient(url,key,{global:{headers:{Authorization:auth}}});
 const {data:{user}}=await db.auth.getUser();
 if(!user)return respond({error:"Sign in required"},401);
 const input=await request.json();
 const workspace=String(input.workspace_id||"");
 const {data:member}=await db.from("talos_memberships").select("role").eq("workspace_id",workspace).eq("user_id",user.id).maybeSingle();
 if(!member||!["admin","reviewer"].includes(member.role))return respond({error:"Access denied"},403);
 const {data:plan,error}=await db.from("talos_content_plans").select("*").eq("workspace_id",workspace).maybeSingle();
 if(error||!plan)return respond({error:"Save your Quick Start plan first"},400);
 const secret=Deno.env.get("ANTHROPIC_API_KEY");
 if(!secret)return respond({error:"Claude is not configured. Add ANTHROPIC_API_KEY in Supabase secrets."},503);
 const themes=plan.weekly_themes||{};
 const topic=String(input.topic||"").trim().slice(0,160);
 const day=String(input.day||"").toLowerCase().slice(0,3);
 const theme=themes[day]||topic||plan.topics?.[0]||"Industry insight";
 const task=String(input.task||"post");
 const prompt=task==="week"?"Produce a JSON object with a posts array containing five entries, each with day, topic, draft. Follow the selected posting days when possible.":"Produce a JSON object with one draft string and one topic string.";
 const system="You are TALOS, an expert LinkedIn content strategist. Write original specific credible content. Never fabricate results, client names or experiences. No em dashes. Avoid hashtag stuffing. Return JSON only. "+prompt;
 const context={company:plan.company_name,role:plan.job_title,audience:plan.audience,goal:plan.content_goal,voice:plan.voice,voice_example:plan.voice_examples,avoid:plan.voice_avoid,topics:plan.topics,weekly_themes:themes,posting_days:plan.posting_days,selected_theme:theme,selected_day:day};
 const api=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"content-type":"application/json","anthropic-version":"2023-06-01","x-api-key":secret},body:JSON.stringify({model:"claude-sonnet-4-5-20250929",max_tokens:2300,system,messages:[{role:"user",content:JSON.stringify(context)}]})});
 const data=await api.json();
 if(!api.ok)return respond({error:"Claude request failed",detail:data.error?.message||"Unknown"},502);
 const raw=data.content?.filter((c:any)=>c.type==="text").map((c:any)=>c.text).join("")||"";
 let parsed;try{parsed=JSON.parse(raw.replace(/^\x60\x60\x60(?:json)?/,"").replace(/\x60\x60\x60$/,"").trim())}catch{return respond({error:"Claude returned an unexpected format"},502)}
 return respond({result:parsed});
 }catch(e){return respond({error:"Generation failed",detail:String(e).slice(0,160)},500)}
});
