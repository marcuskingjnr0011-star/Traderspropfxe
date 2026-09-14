import { supabaseAdmin } from './_lib/supabase.js';
export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  let supabase='not_configured';
  if(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY){try{const {error}=await supabaseAdmin().from('payment_orders').select('id').limit(1);supabase=error?'error':'connected';}catch{supabase='error'}}
  res.status(200).json({ok:true,service:'tradersprop-payment-api',supabase});
}
