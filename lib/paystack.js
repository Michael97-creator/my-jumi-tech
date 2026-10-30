import crypto from 'node:crypto';
export async function initializePaystack({email,amount,reference,callbackUrl,metadata}){
  const key=process.env.PAYSTACK_SECRET_KEY;
  if(!key) throw new Error('Paystack is not configured. Add PAYSTACK_SECRET_KEY in Vercel environment variables.');
  const origin=(process.env.SITE_URL || callbackUrl || '').replace(/\/$/,'');
  const callback=callbackUrl || `${origin}/academy/register`;
  const r=await fetch('https://api.paystack.co/transaction/initialize',{
    method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({email,amount:Math.round(amount*100),currency:process.env.PAYSTACK_CURRENCY||'NGN',reference,callback_url:callback,metadata})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok || !data.status || !data.data?.authorization_url) throw new Error(data.message || 'Paystack could not initialize checkout.');
  return data.data;
}
export async function verifyPaystack(reference){
  const key=process.env.PAYSTACK_SECRET_KEY;
  if(!key) throw new Error('Paystack is not configured.');
  const r=await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,{headers:{Authorization:`Bearer ${key}`}});
  const data=await r.json().catch(()=>({}));
  if(!r.ok || !data.status || !data.data) throw new Error(data.message || 'Unable to verify Paystack transaction.');
  return data.data;
}
export function validWebhookSignature(raw,signature){
  const key=process.env.PAYSTACK_SECRET_KEY;
  if(!key || !signature) return false;
  const expected=crypto.createHmac('sha512',key).update(raw).digest('hex');
  return expected.length===signature.length && crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(signature));
}
