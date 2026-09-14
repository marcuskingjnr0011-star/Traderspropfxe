import { createClient } from '@supabase/supabase-js';

let client;

export function supabaseAdmin(){
  if(client) return client;
  const url = process.env.SUPABASE_URL;
  // Prefer the current Supabase secret key. Keep the legacy service-role
  // fallback so existing Vercel deployments continue to work during migration.
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key){
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel.');
  }
  client = createClient(url, key, {
    auth: { autoRefreshToken:false, persistSession:false }
  });
  return client;
}
