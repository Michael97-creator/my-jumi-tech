import { sql, ensureSchema, json, method, parseBody } from '../../lib/db.js';
import { requireAdmin, originAllowed } from '../../lib/auth.js';
export default async function handler(req,res){
  if(!requireAdmin(req,res)) return;
  if(req.method==='GET'){
    try{await ensureSchema();const rows=await sql`SELECT r.*,COALESCE((SELECT json_agg(json_build_object('reference',p.reference,'amount',p.amount,'kind',p.payment_kind,'status',p.status,'created_at',p.created_at) ORDER BY p.created_at DESC) FROM academy_payments p WHERE p.registration_id=r.id),'[]'::json) AS payments,(SELECT COUNT(*) FROM academy_certificates c WHERE c.registration_id=r.id)::int AS certificates_count FROM academy_registrations r ORDER BY r.created_at DESC LIMIT 500`;return json(res,200,{registrations:rows.map(r=>({...r,tuition_total:Number(r.tuition_total)/100,amount_paid:Number(r.amount_paid)/100,balance_due:(Number(r.tuition_total)-Number(r.amount_paid))/100,payments:(r.payments||[]).map(p=>({...p,amount:Number(p.amount)/100}))}))});}catch(e){console.error(e);return json(res,500,{message:'Could not load registrations.'});}
  }
  if(!method(req,res,['PATCH'])) return;
  if(!originAllowed(req)) return json(res,403,{message:'Request origin rejected.'});
  try{await ensureSchema();const b=parseBody(req);const id=String(b.id||'');if(!/^[0-9a-f-]{36}$/i.test(id))return json(res,400,{message:'Invalid registration ID.'});
    const rows=await sql`SELECT id FROM academy_registrations WHERE id=${id} LIMIT 1`;if(!rows.length)return json(res,404,{message:'Registration not found.'});
    const start=b.cohort_start_date?String(b.cohort_start_date).slice(0,10):null;
    const notes=String(b.admin_notes||'').slice(0,2000);
    const status=['waitlisted','pending_payment','registered','completed','cancelled'].includes(b.registration_status)?b.registration_status:null;
    if(start&&!/^\d{4}-\d{2}-\d{2}$/.test(start))return json(res,400,{message:'Use a valid cohort start date.'});
    await sql`UPDATE academy_registrations SET cohort_start_date=${start},balance_due_date=CASE WHEN ${start}::date IS NULL THEN NULL ELSE (${start}::date + INTERVAL '1 month')::date END,admin_notes=${notes},registration_status=COALESCE(${status},registration_status),updated_at=NOW() WHERE id=${id}`;
    return json(res,200,{message:'Registration updated.'});
  }catch(e){console.error(e);return json(res,500,{message:'Could not update registration.'});}
}
