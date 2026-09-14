import { getAccessToken, getTransactionStatus, statusName } from '../../../../_lib/pesapal.js';
import { supabaseAdmin } from '../../../../_lib/supabase.js';
function json(res,code,body){return res.status(code).json(body)}
export default async function handler(req,res){
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  const reference=String(req.query?.reference||req.query?.merchantReference||'').trim();
  if(!reference)return json(res,400,{error:'Missing payment reference.'});
  try{
    const db=supabaseAdmin();
    const {data:order,error}=await db.from('payment_orders').select('*').eq('reference',reference).maybeSingle();
    if(error) throw error;
    if(!order) return json(res,404,{error:'Payment reference not found.'});
    if(!order.provider_tracking_id)return json(res,200,{status:order.status==='success'?'completed':order.status,message:'Payment is awaiting provider confirmation.',reference});
    const token=await getAccessToken();
    const provider=await getTransactionStatus(token,order.provider_tracking_id);
    const status=statusName(provider.status_code);
    const mapped=status==='completed'?'success':status==='failed'?'failed':status==='reversed'?'cancelled':'pending';
    const patch={status:mapped,provider:'pesapal',provider_tracking_id:order.provider_tracking_id,provider_status:status,provider_confirmation_code:provider.confirmation_code||null,updated_at:new Date().toISOString()};
    if(status==='completed')patch.verified_at=new Date().toISOString();
    await db.from('payment_orders').update(patch).eq('reference',reference);
    return json(res,200,{status,success:status==='completed',reference,orderTrackingId:order.provider_tracking_id,paymentStatus:provider.payment_status_description||'',confirmationCode:provider.confirmation_code||'',amount:provider.amount,currency:provider.currency});
  }catch(e){console.error('[pesapal] status failed',e?.message||e);return json(res,500,{error:'Unable to verify this payment right now. Please try again shortly.'})}
}
