import crypto from 'node:crypto';
import { sql, ensureSchema, COURSES, json, method, parseBody } from '../../lib/db.js';
import { initializePaystack } from '../../lib/paystack.js';

const clean = (v,max=300) => String(v ?? '').trim().slice(0,max);
export default async function handler(req,res){
  if(!method(req,res,['POST'])) return;
  try {
    await ensureSchema();
    const b=parseBody(req);
    const full_name=clean(b.full_name,120), email=clean(b.email,254).toLowerCase(), whatsapp=clean(b.whatsapp,40), location=clean(b.location,120);
    const courses=Array.isArray(b.courses) ? [...new Set(b.courses.map(x=>clean(x,80)))] : [];
    const payment_plan=clean(b.payment_plan,20);
    if(full_name.length<2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || whatsapp.length<6 || location.length<2) return json(res,400,{message:'Please provide your full name, valid email, WhatsApp number and location.'});
    if(!courses.length || courses.some(c=>!COURSES[c])) return json(res,400,{message:'Select one or more of the four currently available Academy courses.'});
    if(!['full','installments','waitlist'].includes(payment_plan)) return json(res,400,{message:'Choose full payment, installment payment or join the waitlist.'});
    const tuitionNaira=courses.reduce((sum,c)=>sum+COURSES[c].fee,0);
    const tuitionKobo=tuitionNaira*100;
    const id=crypto.randomUUID();
    const payment_status='unpaid';
    const registration_status=payment_plan==='waitlist'?'waitlisted':'pending_payment';
    await sql`INSERT INTO academy_registrations (id,full_name,email,whatsapp,location,courses,tuition_total,amount_paid,payment_plan,payment_status,registration_status,experience,laptop_access,goals,referral_source,other_course)
      VALUES (${id},${full_name},${email},${whatsapp},${location},${JSON.stringify(courses)}::jsonb,${tuitionKobo},0,${payment_plan},${payment_status},${registration_status},${clean(b.experience,80)},${clean(b.laptop_access,80)},${clean(b.goals,2000)},${clean(b.referral_source,100)},${clean(b.other_course,160)})`;
    if(payment_plan==='waitlist') return json(res,201,{status:'waitlisted',registration_id:id,message:'Your interest has been added to the Jumi Tech Academy waitlist. No payment was collected.'});
    const amountNaira=payment_plan==='full' ? tuitionNaira : tuitionNaira/2;
    const reference=`JTAC-${id.replaceAll('-','').slice(0,12)}-${crypto.randomBytes(4).toString('hex')}`;
    try {
      const tx=await initializePaystack({email,amount:amountNaira,reference,callbackUrl:`${(process.env.SITE_URL||`https://${req.headers.host}`).replace(/\/$/,'')}/academy/register`,metadata:{registration_id:id,payment_kind:payment_plan==='full'?'tuition_full':'tuition_installment_1',courses,custom_fields:[{display_name:'Academy Registration',variable_name:'academy_registration',value:id}]}});
      await sql`INSERT INTO academy_payments (id,registration_id,reference,amount,currency,payment_kind,status) VALUES (${crypto.randomUUID()},${id},${reference},${Math.round(amountNaira*100)},${process.env.PAYSTACK_CURRENCY||'NGN'},${payment_plan==='full'?'tuition_full':'tuition_installment_1'},'pending')`;
      return json(res,201,{status:'payment_required',registration_id:id,authorization_url:tx.authorization_url,reference,tuition_total:tuitionNaira,amount_due:amountNaira,balance_due:tuitionNaira-amountNaira,message:'Continue to secure Paystack checkout to complete your registration.'});
    } catch(err) {
      console.error('Academy checkout initialization failed:',err.message);
      return json(res,502,{status:'registration_saved_payment_not_started',registration_id:id,message:'Your registration was saved, but secure checkout could not start. Please contact Jumi Tech and provide your registration reference: '+id});
    }
  } catch(err) { console.error('Academy registration error:',err); return json(res,500,{message:'We could not complete your registration right now. Please try again shortly.'}); }
}
