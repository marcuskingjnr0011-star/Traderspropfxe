import { createClient } from '@supabase/supabase-js'
import { adminClient, cors, json, publicUser } from './_supabase.js'

export default async function handler(req,res){
  cors(res)
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS')
  if(req.method==='OPTIONS') return res.status(204).end()
  if(req.method!=='GET') return json(res,405,{error:'Method not allowed'})
  const authz=String(req.headers.authorization||'')
  const token=authz.match(/^Bearer\s+(.+)$/i)?.[1]
  if(!token) return json(res,401,{error:'Authentication token is required.'})
  try{
    const url=process.env.SUPABASE_URL
    const key=process.env.SUPABASE_ANON_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if(!url||!key) throw new Error('Supabase client authentication is not configured.')
    const auth=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
    const {data,error}=await auth.auth.getUser(token)
    if(error||!data?.user) return json(res,401,{error:'Your session has expired. Please log in again.'})
    const db=adminClient()
    const {data:profile,error:profileError}=await db.from('profiles').select('*').eq('auth_user_id',data.user.id).maybeSingle()
    if(profileError) throw profileError
    const meta=data.user.user_metadata||{}
    const user=publicUser(profile,{id:data.user.id,email:data.user.email,fullName:meta.full_name||'',location:meta.location||'',phone:meta.phone||''})
    return json(res,200,{ok:true,user})
  }catch(e){
    console.error('[auth] me failed',e?.message||e)
    return json(res,500,{error:'Unable to verify your session right now.'})
  }
}
