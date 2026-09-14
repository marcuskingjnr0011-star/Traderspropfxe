import { getAccessToken, getTransactionStatus, statusName, appOrigin } from './pesapal.js';
import { supabaseAdmin } from './supabase.js';
export default async function handler(req,res){
  const q=req.query||{}; const tracking=String(q.OrderTrackingId||'').trim(); const reference=String(q.OrderMerchantReference||'').trim();
  const origin=appOrigin(req); const url=new URL('/?payment=pesapal-return',origin);
  if(reference)url.searchParams.set('OrderMerchantReference',reference); if(tracking)url.searchParams.set('OrderTrackingId',tracking);
  if(!tracking){url.searchParams.set('status','unknown');return res.redirect(302,url.toString())}
  try{
    const token=await getAccessToken(); const provider=await getTransactionStatus(token,tracking); const status=statusName(provider.status_code);
    if(reference){try{const db=supabaseAdmin();const mapped=status==='completed'?'success':status==='failed'?'failed':status==='reversed'?'cancelled':'pending';const patch={status:mapped,provider:'pesapal',provider_tracking_id:tracking,provider_status:status,provider_confirmation_code:provider.confirmation_code||null,updated_at:new Date().toISOString()};if(status==='completed')patch.verified_at=new Date().toISOString();await db.from('payment_orders').update(patch).eq('reference',reference)}catch(e){console.error('[pesapal] callback persistence warning',e?.message||e)}}
    url.searchParams.set('status',status); if(provider.confirmation_code)url.searchParams.set('code',provider.confirmation_code);
  }catch(e){console.error('[pesapal] callback verification failed',e?.message||e);url.searchParams.set('status','unknown')}
  return res.redirect(302,url.toString());
}
