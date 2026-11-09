import { sql, ensureSchema, json, method } from '../../lib/db.js';
import { verifyPaystack } from '../../lib/paystack.js';
export default async function handler(req,res){
  if(!method(req,res,['GET'])) return;
  try {
    await ensureSchema();
    const reference=String(req.query?.reference||'').slice(0,120);
    if(!reference) return json(res,400,{status:'failed',message:'Missing payment reference.'});
    const rows=await sql`SELECT p.id,p.registration_id,p.amount,p.currency,p.payment_kind,p.status,r.tuition_total,r.amount_paid,r.payment_plan FROM academy_payments p JOIN academy_registrations r ON r.id=p.registration_id WHERE p.reference=${reference} LIMIT 1`;
    if(!rows.length) return json(res,404,{status:'failed',message:'This payment reference was not found. Please contact Jumi Tech if you have been charged.'});
    const p=rows[0];
    const tx=await verifyPaystack(reference);
    const amountOk=Number(tx.amount)===Number(p.amount);
    const currencyOk=tx.currency===p.currency;
    if(tx.status!=='success'||!amountOk||!currencyOk||tx.reference!==reference) return json(res,400,{status:'failed',message:'Paystack has not confirmed a matching successful payment. If your account was debited, contact Jumi Tech with your reference.'});
    await sql`UPDATE academy_payments SET status='success',verified_at=COALESCE(verified_at,NOW()) WHERE reference=${reference}`;
    const paid=await sql`SELECT COALESCE(SUM(amount),0)::bigint AS total FROM academy_payments WHERE registration_id=${p.registration_id} AND status='success'`;
    const totalPaid=Number(paid[0]?.total||0);
    const paymentStatus=totalPaid>=Number(p.tuition_total)?'paid':'partially_paid';
    await sql`UPDATE academy_registrations SET amount_paid=${totalPaid},payment_status=${paymentStatus},registration_status='registered',updated_at=NOW() WHERE id=${p.registration_id}`;
    const final=await sql`SELECT id,full_name,courses,tuition_total,amount_paid,payment_status,registration_status FROM academy_registrations WHERE id=${p.registration_id} LIMIT 1`;
    const r=final[0];
    return json(res,200,{status:'success',message:'Payment verified successfully.',payment_amount:Number(p.amount)/100,currency:p.currency,registration:{id:r.id,name:r.full_name,courses:r.courses,tuition_total:Number(r.tuition_total)/100,amount_paid:Number(r.amount_paid)/100,balance_due:(Number(r.tuition_total)-Number(r.amount_paid))/100,payment_status:r.payment_status,registration_status:r.registration_status}});
  } catch(err) { console.error('Paystack verification error:',err); return json(res,500,{status:'error',message:'Payment verification is temporarily unavailable. Please keep your reference and try again.'}); }
}
