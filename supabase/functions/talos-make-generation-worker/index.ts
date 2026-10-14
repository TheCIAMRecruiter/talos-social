// Private Make worker endpoint. Requires TALOS_MAKE_WORKER_TOKEN and SUPABASE_SERVICE_ROLE_KEY in Supabase secrets.
// Never put this token in a TALOS browser, GitHub commit, or a Make webhook URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
Deno.serve(async req=>{
 if(req.method!=="POST")return reply({error:"POST required"},405);
 const expected=Deno.env.get("TALOS_MAKE_WORKER_TOKEN");
 const supplied=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!expected||!supplied||supplied!==expected)return reply({error:"Unauthorized"},401);
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!service)return reply({error:"Server configuration missing"},503);
 const db=createClient(Deno.env.get("SUPABASE_URL")||"",service);
 const input=await req.json().catch(()=>({}));
 if(input.action==="claim"){
   const {data,error}=await db.rpc("talos_claim_generation_request");
   if(error)return reply({error:error.message},500);
   if(!data)return reply({job:null});
   const {data:plan}=await db.from("talos_content_plans").select("company_name,job_title,audience,voice,voice_examples,voice_avoid,topics,posting_days,weekly_themes,content_goal,brand_primary_color,brand_secondary_color,visual_style").eq("workspace_id",data.workspace_id).maybeSingle();
   return reply({job:data,plan:plan||{}});
 }
 if(input.action==="complete"){
   const id=String(input.id||"");
   if(!/^[0-9a-f-]{36}$/i.test(id))return reply({error:"Invalid job id"},400);
   const status=input.error?"FAILED":"COMPLETED";
   const result=input.result;
   if(!input.error&&(!result||typeof result!=="object"||(!Array.isArray(result.posts)&&typeof result.draft!=="string")))return reply({error:"Invalid result"},400);
   const {data,error}=await db.from("talos_generation_requests").update({status,result:status==="COMPLETED"?result:null,error_message:input.error?String(input.error).slice(0,500):null,updated_at:new Date().toISOString()}).eq("id",id).eq("status","PROCESSING").select("id").maybeSingle();
   if(error)return reply({error:error.message},500);
   return reply({updated:!!data});
 }
 return reply({error:"Unknown action"},400);
});
