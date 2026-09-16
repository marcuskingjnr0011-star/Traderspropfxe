import { adminClient, authClient, cors, json, normalizeEmail, validPassword, publicUser } from './_supabase.js'

function referralCode(){
  return 'TP-' + crypto.randomUUID().replace(/-/g,'').slice(0,10).toUpperCase()
}

export default async function handler(req,res){
  cors(res)
  if(req.method==='OPTIONS') return res.status(204).end()
  if(req.method!=='POST') return json(res,405,{error:'Method not allowed'})

  const b=req.body||{}
  const email=normalizeEmail(b.email)
  const fullName=String(b.fullName||'').trim()
  const location=String(b.location||'').trim()
  const phone=String(b.phone||'').trim()
  const password=String(b.password||'')
  const confirmPassword=String(b.confirmPassword||'')
  const referredBy=String(b.referralCode||'').trim()

  if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res,400,{error:'Enter a valid email address.'})
  if(!fullName) return json(res,400,{error:'Enter your full name.'})
  if(!validPassword(password)) return json(res,400,{error:'Use at least 12 characters with uppercase, lowercase, a number, and a symbol.'})
  if(password!==confirmPassword) return json(res,400,{error:'Passwords do not match.'})
  if(phone && !/^\+[1-9]\d{7,14}$/.test(phone)) return json(res,400,{error:'Enter a valid international phone number or leave phone blank.'})

  try{
    const db=adminClient()
    const code=referralCode()
    const {data,error}=await db.auth.admin.createUser({
      email,
      password,
      email_confirm:true,
      user_metadata:{full_name:fullName,location,phone}
    })
    if(error){
      const msg=String(error.message||'')
      if(/already|registered|exists/i.test(msg)) return json(res,409,{error:'An account with this email already exists. Please log in.'})
      throw error
    }

    const {data:profile,error:profileError}=await db.from('profiles').upsert({
      auth_user_id:data.user.id,
      email,
      full_name:fullName,
      phone:phone||null,
      country:location||null,
      role:'client',
      kyc_status:'Not submitted',
      phone_verified:false,
      referral_code:code
    },{onConflict:'auth_user_id'}).select('*').single()
    if(profileError){
      await db.auth.admin.deleteUser(data.user.id).catch(()=>{})
      throw profileError
    }

    const auth=authClient()
    const {data:sessionData,error:sessionError}=await auth.auth.signInWithPassword({email,password})
    if(sessionError || !sessionData?.session?.access_token){
      console.error('[auth] signup session creation failed',sessionError?.message||sessionError)
      return json(res,503,{error:'Account was created, but the login session could not be established. Please try logging in again.'})
    }
    return json(res,201,{ok:true,token:sessionData.session.access_token,refreshToken:sessionData.session.refresh_token,user:publicUser(profile,{id:data.user.id,email,fullName,location,phone,referralCode:code}),referredBy:referredBy||null})
  }catch(e){
    console.error('[auth] signup failed',e?.message||e)
    return json(res,500,{error:'Unable to create your account right now. Please try again.'})
  }
}
