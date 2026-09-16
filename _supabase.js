import { createClient } from '@supabase/supabase-js'

export function adminClient(){
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url || !key) throw new Error('Supabase server authentication is not configured.')
  return createClient(url, key, { auth:{ autoRefreshToken:false, persistSession:false } })
}

export function authClient(){
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if(!url || !key) throw new Error('Supabase authentication is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel.')
  return createClient(url, key, { auth:{ autoRefreshToken:false, persistSession:false } })
}

export function cors(res){
  const origin = process.env.ALLOWED_ORIGIN || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS')
  if(origin !== '*') res.setHeader('Vary','Origin')
}

export function json(res,status,body){ cors(res); return res.status(status).json(body) }

export function normalizeEmail(value){ return String(value||'').trim().toLowerCase() }

export function validPassword(password){
  return /^(?=.{12,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])/.test(String(password||''))
}

export function publicUser(profile, fallback={}){
  return {
    id: profile?.auth_user_id || fallback.id || null,
    email: normalizeEmail(profile?.email || fallback.email),
    fullName: profile?.full_name || fallback.fullName || '',
    name: profile?.full_name || fallback.fullName || '',
    location: profile?.country || fallback.location || '',
    phone: profile?.phone || fallback.phone || '',
    phoneVerifiedAt: fallback.phoneVerifiedAt || null,
    phone_verified_at: fallback.phoneVerifiedAt || null,
    phoneVerified: !!(profile?.phone_verified || fallback.phoneVerifiedAt),
    role: profile?.role || 'client',
    referralCode: profile?.referral_code || fallback.referralCode || '',
    kycStatus: profile?.kyc_status || 'Not submitted',
  }
}
