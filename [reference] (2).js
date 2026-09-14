import { supabaseAdmin } from '../../../_lib/supabase.js';
function allow(res){res.setHeader('Access-Control-Allow-Origin',process.env.ALLOWED_ORIGIN||'*');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');}
export default async function handler(req,res){
  allow(res);if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='GET')return res.status(405).json({error:'Method not allowed'});
  const secret=process.env.PAYSTACK_SECRET_KEY;if(!secret)return res.status(500).json({error:'PAYSTACK_SECRET_KEY is not configured on the server.'});
  const reference=String(req.query.reference||'');if(!reference)return res.status(400).json({error:'Reference is required.'});
  try{
    const r=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${secret}`}});const data=await r.json();
    if(r.ok&&data?.status){const db=supabaseAdmin();const success=String(data.data?.status||'').toLowerCase()==='success';await db.from('payment_orders').update({status:success?'success':'pending',paystack_status:data.data?.status||null,paystack_data:data.data,verified_at:success?new Date().toISOString():null}).eq('reference',reference);}
    return res.status(r.status).json(data);
  }catch(e){return res.status(500).json({error:e.message||'Verification failed.'});}
}
