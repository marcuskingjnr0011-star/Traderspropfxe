const DEFAULT_BASE_URL = 'https://pay.pesapal.com/v3';

function baseUrl(){ return String(process.env.PESAPAL_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/,''); }
function credentials(){
  const consumer_key = process.env.PESAPAL_CONSUMER_KEY;
  const consumer_secret = process.env.PESAPAL_CONSUMER_SECRET;
  if(!consumer_key || !consumer_secret) throw new Error('Pesapal is not configured. Set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET in Vercel.');
  return {consumer_key, consumer_secret};
}
export class PesapalError extends Error {
  constructor(message, status=502, code='PESAPAL_ERROR') {
    super(message);
    this.name='PesapalError';
    this.status=status;
    this.code=code;
  }
}
function extractError(data, fallback){
  if(data && typeof data==='object'){
    const err=data.error;
    if(err && typeof err==='object'){
      const code=String(err.code||'').trim();
      const message=String(err.message||'').trim();
      if(code==='amount_exceeds_default_limit' || message.toLowerCase().includes('amount exceeds default limit')) return 'amount_exceeds_default_limit';
      const parts=[code,message].filter(Boolean).join(': '); if(parts)return parts;
    }
    if(typeof err==='string' && err)return err;
    if(typeof data.message==='string' && data.message)return data.message;
  }
  return fallback;
}
async function jsonFetch(url, options){
  const res=await fetch(url,{...options,cache:'no-store'});
  let data=null; try{data=await res.json()}catch{}
  return {res,data};
}
export async function getAccessToken(){
  const {consumer_key,consumer_secret}=credentials();
  const {res,data}=await jsonFetch(`${baseUrl()}/api/Auth/RequestToken`,{
    method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify({consumer_key,consumer_secret})
  });
  if(!res.ok || !data?.token) throw new Error(extractError(data,'Failed to authenticate with Pesapal. Check the Pesapal Consumer Key/Secret.'));
  return data.token;
}
export async function registerIpn(token,ipnUrl){
  const {res,data}=await jsonFetch(`${baseUrl()}/api/URLSetup/RegisterIPN`,{
    method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify({url:ipnUrl,ipn_notification_type:'GET'})
  });
  if(!res.ok || !data?.ipn_id) throw new Error(extractError(data,'Failed to register the Pesapal IPN URL.'));
  return data.ipn_id;
}
export async function submitOrder(token,input){
  const {res,data}=await jsonFetch(`${baseUrl()}/api/Transactions/SubmitOrderRequest`,{
    method:'POST',headers:{Accept:'application/json','Content-Type':'application/json',Authorization:`Bearer ${token}`},
    body:JSON.stringify({
      id:input.merchantReference,currency:input.currency,amount:input.amount,description:input.description,
      callback_url:input.callbackUrl,notification_id:input.notificationId,
      billing_address:{email_address:input.billing.email,phone_number:input.billing.phone,first_name:input.billing.firstName,last_name:input.billing.lastName}
    })
  });
  if(!res.ok || !data?.redirect_url){
    const message=extractError(data,'Pesapal rejected the order and did not return a checkout URL.');
    if(message==='amount_exceeds_default_limit') throw new PesapalError('This Pesapal account has a transaction limit below the selected plan amount. Increase the merchant transaction limit in Pesapal or use a payment account configured for this amount.',400,'amount_exceeds_default_limit');
    throw new PesapalError(message,res.status,'PESAPAL_ORDER_REJECTED');
  }
  return data;
}
export async function getTransactionStatus(token,orderTrackingId){
  const {res,data}=await jsonFetch(`${baseUrl()}/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,{
    method:'GET',headers:{Accept:'application/json',Authorization:`Bearer ${token}`}
  });
  if(!res.ok) throw new Error(extractError(data,'Failed to fetch the transaction status from Pesapal.'));
  return data;
}
export function appOrigin(req){
  const configured=String(process.env.NEXT_PUBLIC_APP_URL || process.env.TRADERSPROP_APP_URL || '').replace(/\/$/,'');
  if(configured) return configured;
  const proto=req.headers['x-forwarded-proto'] || 'https';
  const host=req.headers['x-forwarded-host'] || req.headers.host;
  if(host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}
export function statusName(code){ return ({0:'invalid',1:'completed',2:'failed',3:'reversed'})[Number(code)] || 'unknown'; }
