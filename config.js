export default function handler(req,res){
  res.setHeader('Access-Control-Allow-Origin',process.env.ALLOWED_ORIGIN||'*');
  res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods','GET, OPTIONS');
  if(req.method==='OPTIONS') return res.status(204).end();
  const rate=Number(process.env.USD_KES_RATE||0);
  res.status(200).json({
    enabled: !!process.env.PAYSTACK_SECRET_KEY || !!(process.env.DARAJA_CONSUMER_KEY&&process.env.DARAJA_CONSUMER_SECRET),
    provider:'paystack',
    usdKesRate:Number.isFinite(rate)&&rate>0?rate:0,
    mobileMoneyProviders:['Safaricom M-PESA','Airtel Money']
  });
}
