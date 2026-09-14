import crypto from 'crypto';
import { supabaseAdmin } from '../../../_lib/supabase.js';
export const config={api:{bodyParser:false}};
async function rawBody(req){const chunks=[];for await(const c of req)chunks.push(Buffer.from(c));return Buffer.concat(chunks)}
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).end();const secret=process.env.PAYSTACK_SECRET_KEY;if(!secret)return res.status(500).json({error:'PAYSTACK_SECRET_KEY is not configured.'});
  const body=await rawBody(req);const sig=String(req.headers['x-paystack-signature']||'');const expected=crypto.createHmac('sha512',secret).update(body).digest('hex');if(!sig||sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return res.status(401).json({error:'Invalid signature'});
  let event;try{event=JSON.parse(body.toString('utf8'))}catch{return res.status(400).json({error:'Invalid JSON'})}
  try{
    const ref=String(event.data?.reference||'');if(ref){const db=supabaseAdmin();let status='pending';if(event.event==='charge.success')status='success';else if(/^charge\.(failed|abandoned)$/i.test(event.event))status=event.event.split('.')[1];await db.from('payment_orders').update({status,paystack_status:event.data?.status||event.event,paystack_data:event.data,verified_at:status==='success'?new Date().toISOString():undefined}).eq('reference',ref);}
  }catch(e){console.error('Supabase webhook persistence failed',e)}
  console.log('Paystack event',event.event,event.data?.reference||'');return res.status(200).json({received:true});
}
