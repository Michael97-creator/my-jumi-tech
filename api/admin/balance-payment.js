import crypto from 'node:crypto';
import { sql, ensureSchema, json, method, parseBody } from '../../lib/db.js';
import { requireAdmin, originAllowed } from '../../lib/auth.js';
import { initializePaystack } from '../../lib/paystack.js';
export default async function handler(req,res){
  if(!requireAdmin(req,res))return;
  if(!method(req,res,['POST']))return;
  if(!originAllowed(req))return json(res,403,{message:'Request origin rejected.'});
  try{await ensureSchema();const b=parseBody(req);const id=String(b.registration_id||'');const rows=await sql`SELECT * FROM academy_registrations WHERE id=${id} LIMIT 1`;if(!rows.length)return json(res,404,{message:'Registration not found.'});const r=rows[0];
    if(r.payment_status==='paid'||Number(r.amount_paid)>=Number(r.tuition_total))return json(res,400,{message:'This registration has no outstanding tuition balance.'});
    if(Number(r.amount_paid)<=0)return json(res,400,{message:'The first installment must be paid before a balance payment link can be generated.'});
    const balanceKobo=Number(r.tuition_total)-Number(r.amount_paid);const amountNaira=balanceKobo/100;const reference=`JTBL-${String(r.id).replaceAll('-','').slice(0,12)}-${crypto.randomBytes(4).toString('hex')}`;
    const tx=await initializePaystack({email:r.email,amount:amountNaira,reference,callbackUrl:`${(process.env.SITE_URL||`https://${req.headers.host}`).replace(/\/$/,'')}/academy/register`,metadata:{registration_id:r.id,payment_kind:'tuition_balance',courses:r.courses}});
    await sql`INSERT INTO academy_payments (id,registration_id,reference,amount,currency,payment_kind,status) VALUES (${crypto.randomUUID()},${r.id},${reference},${balanceKobo},${process.env.PAYSTACK_CURRENCY||'NGN'},'tuition_balance','pending')`;
    return json(res,201,{authorization_url:tx.authorization_url,reference,amount_due:amountNaira,message:'Balance checkout created. Share the checkout link securely with the student.'});
  }catch(e){console.error(e);return json(res,500,{message:e.message||'Could not create the balance payment.'});}
}
