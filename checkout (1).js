import { supabaseAdmin } from '../../../_lib/supabase.js';
function json(res,status,body){res.status(status).json(body)}
function allow(res){res.setHeader('Access-Control-Allow-Origin',process.env.ALLOWED_ORIGIN||'*');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization, Idempotency-Key');res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');}
export default async function handler(req,res){
  allow(res);if(req.method==='OPTIONS')return res.status(204).end();if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
  const secret=process.env.PAYSTACK_SECRET_KEY;if(!secret)return json(res,500,{error:'PAYSTACK_SECRET_KEY is not configured on the server.'});
  try{
    const b=req.body||{};const requestedAmount=Number(b.amount);
    if(!b.email||!Number.isFinite(requestedAmount)||requestedAmount<=0)return json(res,400,{error:'Valid email and amount are required.'});
    const db=supabaseAdmin();
    const channels=Array.isArray(b.channels)&&b.channels.length?b.channels:['card','mobile_money'];
    const mobileMoney=channels.includes('mobile_money')&&channels.length===1;
    let currency=String(b.currency||'USD').toUpperCase();let amount=Math.round(requestedAmount*100);
    if(mobileMoney){const rate=Number(process.env.USD_KES_RATE||0);if(currency==='USD'){if(!Number.isFinite(rate)||rate<=0)return json(res,500,{error:'USD_KES_RATE is not configured for Kenyan mobile-money checkout.'});amount=Math.ceil(requestedAmount*rate*100);currency='KES';}if(currency!=='KES')return json(res,400,{error:'Kenyan mobile-money checkout must use KES.'});}
    if(amount<300)return json(res,400,{error:'Payment amount is below the Paystack Kenya minimum.'});
    const payload={email:b.email,amount,currency,channels,callback_url:b.returnUrl||process.env.PAYSTACK_CALLBACK_URL,metadata:{challengeId:b.challengeId??null,originalAmount:b.originalAmount??null,promoCode:b.promoCode??null,paymentMethod:b.paymentMethod??null,description:b.description??'TradersProp payment'}};
    const r=await fetch('https://api.paystack.co/transaction/initialize',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await r.json();if(!r.ok||!data.status)return json(res,r.status||502,{error:data.message||'Paystack initialization failed.',details:data});
    const reference=String(data.data.reference);
    const {error:dbError}=await db.from('payment_orders').insert({reference,email:String(b.email).trim().toLowerCase(),challenge_id:b.challengeId==null?null:String(b.challengeId),original_amount:b.originalAmount==null?null:Number(b.originalAmount),requested_amount:requestedAmount,amount_subunit:amount,currency,payment_method:b.paymentMethod||null,channels,promo_code:b.promoCode||null,description:b.description||'TradersProp payment',status:'pending',paystack_status:'initialized',paystack_data:data.data});
    if(dbError){console.error('Supabase payment order insert failed',dbError);return json(res,503,{error:'Payment was not started because the payment record could not be saved. Please try again.'});}
    return json(res,200,{success:true,reference,checkoutUrl:data.data.authorization_url,authorization_url:data.data.authorization_url,data:data.data});
  }catch(e){console.error(e);return json(res,500,{error:e.message||'Unable to initialize payment.'});}
}
