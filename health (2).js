import { supabaseAdmin } from '../../_lib/supabase.js';
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  try{const db=supabaseAdmin();const {error}=await db.from('payment_orders').select('id').limit(1);if(error)throw error;return res.status(200).json({ok:true,service:'supabase',database:'connected'});}catch(e){return res.status(503).json({ok:false,service:'supabase',database:'unavailable',error:e.message||'Supabase connection failed'});}
}
