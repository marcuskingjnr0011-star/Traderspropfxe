import { getAccessToken, registerIpn, submitOrder, appOrigin } from './pesapal.js';
import { supabaseAdmin } from './supabase.js';

const PLANS={
  challenge:{1:29,2:69,3:169,4:279,5:529},
  instant:{'if-2k':28,'if-5k':48,'if-10k':84,'if-50k':480}
};
const SIZES={challenge:{1:5000,2:10000,3:25000,4:50000,5:100000},instant:{'if-2k':2000,'if-5k':5000,'if-10k':10000,'if-50k':50000}};
function cleanEmail(v){const s=String(v||'').trim().toLowerCase();return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)?s:''}
function amountFor(type,id){
  if(type==='competition-registration') return 5;
  const group=type==='instant-funded'?'instant':'challenge'; const key=String(id); return PLANS[group][key] ?? null;
}
function sizeFor(type,id){if(type==='competition-registration')return null; const group=type==='instant-funded'?'instant':'challenge'; return SIZES[group][String(id)] ?? null;}
function discounted(amount,promo){return String(promo||'').trim().toUpperCase()==='TRADERSPROP25' ? Math.round(amount*0.75*100)/100 : amount;}
function safeRef(){return `TP-${Date.now()}-${Math.random().toString(36).slice(2,9).toUpperCase()}`}
function json(res,code,body){return res.status(code).json(body)}

export default async function handler(req,res){
  if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  try{
    const b=req.body && typeof req.body==='object' ? req.body : {};
    const productType=String(b.productType || (b.challengeId!=null?'challenge':'')).toLowerCase();
    const isInstant=productType==='instant-funded' || productType==='instant_funded' || productType==='instant';
    const type=isInstant?'instant-funded':'challenge';
    const id=isInstant ? String(b.planId ?? b.challengeId ?? '') : (productType==='competition-registration'?'competition-registration':String(b.challengeId ?? b.planId ?? ''));
    const original=amountFor(productType==='competition-registration'?'competition-registration':type,id);
    const email=cleanEmail(b.email || b.customerEmail);
    if(!original) return json(res,400,{error:'Invalid TradersProp plan.'});
    if(!email) return json(res,400,{error:'A valid customer email is required.'});
    const promo=String(b.promoCode||'').trim().toUpperCase();
    const expected=discounted(original,promo);
    const clientAmount=Number(b.amount);
    if(Number.isFinite(clientAmount) && Math.abs(clientAmount-expected)>0.011) return json(res,400,{error:'Payment amount does not match the selected plan.'});
    const currency=String(b.currency||'USD').toUpperCase();
    if(currency!=='USD') return json(res,400,{error:'This checkout accepts USD only.'});
    const description=String(b.description||(productType==='competition-registration'?'TradersProp Competition registration':`TradersProp ${sizeFor(type,id)} ${isInstant?'Instant Funded':'Challenge'}`)).slice(0,100);
    const origin=appOrigin(req);
    const suppliedReturn=String(b.returnUrl||'');
    let returnUrl=`${origin}/?payment=pesapal-return`;
    if(suppliedReturn){try{const u=new URL(suppliedReturn); if(u.origin===origin) returnUrl=u.toString()}catch{}}
    const token=await getAccessToken();
    const ipnId=String(process.env.PESAPAL_IPN_ID||'').trim() || await registerIpn(token,`${origin}/api/pesapal/ipn`);
    const reference=safeRef();
    const order=await submitOrder(token,{amount:expected,currency,description,merchantReference:reference,callbackUrl:returnUrl,notificationId:ipnId,billing:{email,phone:b.phone,firstName:b.firstName,lastName:b.lastName}});
    try{
      const db=supabaseAdmin();
      await db.from('payment_orders').insert({
        reference,email,challenge_id:id,original_amount:original,requested_amount:expected,amount_subunit:Math.round(expected*100),currency,
        payment_method:String(b.paymentMethod||'pesapal'),channels:Array.isArray(b.channels)?b.channels:[],promo_code:promo||null,description,status:'pending',provider:'pesapal',provider_reference:order.merchant_reference||reference,provider_tracking_id:order.order_tracking_id||null
      });
    }catch(dbErr){
      // Do not expose credentials or internal DB details. The Pesapal order is already created;
      // return a recoverable reference so support/status lookup can reconcile it.
      console.error('[pesapal] order persistence warning',dbErr?.message||dbErr);
    }
    return json(res,200,{checkoutUrl:order.redirect_url,orderTrackingId:order.order_tracking_id,merchantReference:order.merchant_reference||reference,amount:expected,currency});
  }catch(e){console.error('[pesapal] checkout failed',e?.message||e);return json(res,500,{error:e?.message||'Unable to create secure Pesapal checkout.'})}
}
