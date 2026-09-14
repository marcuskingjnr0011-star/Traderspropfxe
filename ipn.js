import { getAccessToken, getTransactionStatus, statusName } from './pesapal.js';
import { supabaseAdmin } from './supabase.js';
export default async function handler(req,res){
  const q=req.query||{}; const tracking=String(q.OrderTrackingId||'').trim(); const reference=String(q.OrderMerchantReference||'').trim();
  if(!tracking)return res.status(400).json({error:'Missing OrderTrackingId'});
  try{
    const token=await getAccessToken(); const provider=await getTransactionStatus(token,tracking); const status=statusName(provider.status_code);
    if(reference){try{const db=supabaseAdmin();const mapped=status==='completed'?'success':status==='failed'?'failed':status==='reversed'?'cancelled':'pending';const patch={status:mapped,provider:'pesapal',provider_tracking_id:tracking,provider_status:status,provider_confirmation_code:provider.confirmation_code||null,updated_at:new Date().toISOString()};if(status==='completed')patch.verified_at=new Date().toISOString();await db.from('payment_orders').update(patch).eq('reference',reference)}catch(e){console.error('[pesapal] IPN persistence warning',e?.message||e)}}
    return res.status(200).json({orderNotificationType:'IPNCHANGE',orderTrackingId:tracking,orderMerchantReference:reference||null,status:200});
  }catch(e){console.error('[pesapal] IPN failed',e?.message||e);return res.status(500).json({status:500})}
}
