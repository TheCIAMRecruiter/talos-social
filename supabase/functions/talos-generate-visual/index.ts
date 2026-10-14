import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const h={"Access-Control-Allow-Origin":"https://talossocial.com","Access-Control-Allow-Headers":"authorization,apikey,content-type","Content-Type":"application/json"};
const out=(x:unknown,s=200)=>new Response(JSON.stringify(x),{status:s,headers:h});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:h});
 if(req.method!=="POST")return out({error:"POST required"},405);
 try{
 const auth=req.headers.get("authorization")||"";
 const db=createClient(Deno.env.get("SUPABASE_URL")||"",Deno.env.get("SUPABASE_ANON_KEY")||"",{global:{headers:{Authorization:auth}}});
 const {data:{user}}=await db.auth.getUser();
 if(!user)return out({error:"Sign in required"},401);
 const input=await req.json();
 const workspace=String(input.workspace_id||"");
 const {data:member}=await db.from("talos_memberships").select("role").eq("workspace_id",workspace).eq("user_id",user.id).maybeSingle();
 if(!member||!["admin","reviewer"].includes(member.role))return out({error:"Workspace access denied"},403);
 const {data:brand}=await db.from("talos_content_plans").select("company_name,visual_style,brand_primary_color,brand_secondary_color,audience").eq("workspace_id",workspace).maybeSingle();
 const key=Deno.env.get("OPENAI_API_KEY");
 if(!key)return out({error:"Image provider is not configured. Add OPENAI_API_KEY to Supabase Edge Function secrets."},503);
 const headline=String(input.headline||"").slice(0,200);
 if(!headline.trim())return out({error:"Headline required"},400);
 let concept="Professional editorial artwork about "+headline;
 const claude=Deno.env.get("ANTHROPIC_API_KEY");
 if(claude){
 const response=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"x-api-key":claude,"anthropic-version":"2023-06-01","content-type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-5-20250929",max_tokens:200,messages:[{role:"user",content:"Write one original concise visual art direction for this LinkedIn post. No logos, no text in image. Headline: "+headline+" Brand: "+JSON.stringify(brand||{})}]})});
 if(response.ok){const data=await response.json();concept=data.content?.find((x:any)=>x.type==="text")?.text?.slice(0,700)||concept}
 }
 const prompt=concept+". Premium professional background image, "+(brand?.visual_style||"clean corporate")+" aesthetic, colors "+(brand?.brand_primary_color||"#2867d6")+" and "+(brand?.brand_secondary_color||"#172842")+". Negative space for a later headline overlay. No text, letters, logo, watermark or words.";
 const response=await fetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-image-1.5",size:"1024x1024",quality:"medium",n:1,prompt})});
 const data=await response.json();
 if(!response.ok||!data.data?.[0]?.b64_json)return out({error:"Image generation failed",detail:data.error?.message||"Provider error"},502);
 return out({image_base64:data.data[0].b64_json,concept});
 }catch(e){return out({error:"Image generation failed",detail:String(e).slice(0,160)},500)}
});
