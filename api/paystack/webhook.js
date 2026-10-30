import getRawBody from 'raw-body';
import { sql, ensureSchema, json } from '../../lib/db.js';
import { validWebhookSignature, verifyPaystack } from '../../lib/paystack.js';
export const config = { api: { bodyParser: false } };
export default async function handler(req,res){
  if(req.method!=='POST'){res.setHeader('Allow','POST');return json(res,405,{message:'Method not allowed.'});}
  try {
    const raw=await getRawBody(req,{limit:'1mb'});
    const signature=String(req.headers['x-paystack-signature']||'');
    if(!validWebhookSignature(raw,signature)) return json(res,401,{message:'Invalid webhook signature.'});
    const event=JSON.parse(raw.toString('utf8'));
    if(event.event!=='charge.success'||!event.data?.reference) return res.status(200).send('ignored');
    await ensureSchema();
    const reference=String(event.data.reference);
    const rows=await sql`SELECT id,registration_id,amount,currency,status FROM academy_payments WHERE reference=${reference} LIMIT 1`;
    if(!rows.length) return res.status(200).send('unknown reference ignored');
    const p=rows[0];
    const tx=await verifyPaystack(reference);
    if(tx.status!=='success'||tx.reference!==reference||Number(tx.amount)!==Number(p.amount)||tx.currency!==p.currency) return json(res,400,{message:'Payment details did not match the saved transaction.'});
    await sql`UPDATE academy_payments SET status='success',verified_at=COALESCE(verified_at,NOW()) WHERE reference=${reference}`;
    const paid=await sql`SELECT r.tuition_total,COALESCE(SUM(p.amount) FILTER (WHERE p.status='success'),0)::bigint AS total_paid FROM academy_registrations r LEFT JOIN academy_payments p ON p.registration_id=r.id WHERE r.id=${p.registration_id} GROUP BY r.id`;
    if(paid.length){const total=Number(paid[0].total_paid);await sql`UPDATE academy_registrations SET amount_paid=${total},payment_status=${total>=Number(paid[0].tuition_total)?'paid':'partially_paid'},registration_status='registered',updated_at=NOW() WHERE id=${p.registration_id}`;}
    return res.status(200).send('ok');
  } catch(err){console.error('Paystack webhook error:',err);return json(res,500,{message:'Webhook processing failed.'});}
}
