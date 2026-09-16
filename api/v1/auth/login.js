import { authClient, adminClient, cors, json, normalizeEmail, publicUser } from './_supabase.js'

export default async function handler(req,res){
  cors(res)
  if(req.method==='OPTIONS') return res.status(204).end()
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'})

  const b=req.body||{}
  const email=normalizeEmail(b.email)
  const password=String(b.password||'')
  if(!email || !password) return json(res,400,{error:'Enter your email and password.'})

  try{
    const auth=authClient()
    const {data,error}=await auth.auth.signInWithPassword({email,password})
    if(error || !data?.session?.access_token){
      const msg=String(error?.message||'')
      if(/invalid login credentials|invalid credentials/i.test(msg)) return json(res,401,{error:'Incorrect email or password.'})
      if(/email not confirmed/i.test(msg)) return json(res,403,{error:'Please confirm your email before logging in.'})
      return json(res,401,{error:'Unable to sign in with those credentials.'})
    }

    const db=adminClient()
    let {data:profile,error:profileError}=await db.from('profiles').select('*').eq('auth_user_id',data.user.id).maybeSingle()
    if(profileError) throw profileError

    if(!profile){
      const meta=data.user.user_metadata||{}
      const {data:created,error:createdError}=await db.from('profiles').insert({
        auth_user_id:data.user.id,
        email,
        full_name:meta.full_name||'',
        phone:meta.phone||null,
        country:meta.location||null,
        role:'client',
        kyc_status:'Not submitted',
        phone_verified:false,
        referral_code:'TP-'+crypto.randomUUID().replace(/-/g,'').slice(0,10).toUpperCase()
      }).select('*').single()
      if(createdError) throw createdError
      profile=created
    }

    return json(res,200,{ok:true,token:data.session.access_token,refreshToken:data.session.refresh_token,user:publicUser(profile,{id:data.user.id,email,fullName:data.user.user_metadata?.full_name||'',location:data.user.user_metadata?.location||'',phone:data.user.user_metadata?.phone||''})})
  }catch(e){
    console.error('[auth] login failed',e?.message||e)
    return json(res,500,{error:'Unable to sign in right now. Please try again.'})
  }
}
