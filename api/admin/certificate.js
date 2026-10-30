import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { sql, ensureSchema, json, method, parseBody } from '../../lib/db.js';
import { requireAdmin, originAllowed } from '../../lib/auth.js';
function pdfBuffer(doc){return new Promise((resolve,reject)=>{const chunks=[];doc.on('data',c=>chunks.push(c));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);doc.end();});}
export default async function handler(req,res){
 if(!requireAdmin(req,res))return;
 if(!method(req,res,['POST']))return;
 if(!originAllowed(req))return json(res,403,{message:'Request origin rejected.'});
 try{await ensureSchema();const b=parseBody(req);const regId=String(b.registration_id||'');const course=String(b.course_name||'').trim();const date=String(b.completion_date||'').slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!course)return json(res,400,{message:'Enter a course and valid completion date.'});
   const rows=await sql`SELECT * FROM academy_registrations WHERE id=${regId} LIMIT 1`;if(!rows.length)return json(res,404,{message:'Registration not found.'});const r=rows[0];
   if(r.payment_status!=='paid')return json(res,400,{message:'Certificates can only be issued after tuition is fully paid.'});
   if(r.registration_status!=='completed')return json(res,400,{message:'Mark the registration as completed after confirming course completion, then issue the certificate.'});
   if(!Array.isArray(r.courses)||!r.courses.includes(course))return json(res,400,{message:'This course is not part of the student registration.'});
   const existing=await sql`SELECT certificate_code FROM academy_certificates WHERE registration_id=${r.id} AND course_name=${course} LIMIT 1`;
   if(existing.length)return json(res,409,{message:`A certificate has already been issued for this course. Certificate ID: ${existing[0].certificate_code}`});
   const certificateCode=`JT-${new Date().getFullYear()}-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;const id=crypto.randomUUID();
   const base=(process.env.SITE_URL||`https://${req.headers.host}`).replace(/\/$/,'');const verifyUrl=`${base}/academy/verify?id=${encodeURIComponent(certificateCode)}`;const qr=await QRCode.toDataURL(verifyUrl,{margin:1,width:180,errorCorrectionLevel:'M'});
   const doc=new PDFDocument({size:'A4',layout:'landscape',margin:36,info:{Title:'Jumi Tech Academy Certificate',Author:'Jumi Tech Academy',Subject:certificateCode}});
   doc.rect(18,18,806,559).lineWidth(2).stroke('#62cde7');doc.rect(28,28,786,539).lineWidth(0.6).stroke('#8d6bff');
   doc.fillColor('#08101e').font('Helvetica-Bold').fontSize(15).text('JUMI TECH ACADEMY',{align:'center',y:65});
   doc.fillColor('#26364c').font('Helvetica').fontSize(11).text('BUILDING TECHNOLOGY THAT MOVES BUSINESS FORWARD',{align:'center'});
   doc.moveDown(1.7).fillColor('#0c1b30').font('Helvetica-Bold').fontSize(34).text('CERTIFICATE OF COMPLETION',{align:'center'});
   doc.moveDown(1.2).fillColor('#46566b').font('Helvetica').fontSize(14).text('This certificate is proudly presented to',{align:'center'});
   doc.moveDown(0.5).fillColor('#0a7f9b').font('Helvetica-Bold').fontSize(29).text(r.full_name,{align:'center'});
   doc.moveDown(0.8).fillColor('#46566b').font('Helvetica').fontSize(14).text('for successfully completing the course',{align:'center'});
   doc.moveDown(0.4).fillColor('#0c1b30').font('Helvetica-Bold').fontSize(21).text(course,{align:'center'});
   const formatted=new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
   doc.moveDown(0.8).fillColor('#46566b').font('Helvetica').fontSize(12).text(`Completion date: ${formatted}`,{align:'center'});
   doc.moveTo(90,445).lineTo(270,445).stroke('#7a8797');doc.moveTo(340,445).lineTo(520,445).stroke('#7a8797');
   doc.fillColor('#26364c').font('Helvetica-Bold').fontSize(10).text('Michael James',{x:90,y:452,width:180,align:'center'});doc.font('Helvetica').fontSize(9).text('Founder & Lead Developer',{x:90,y:468,width:180,align:'center'});
   doc.font('Helvetica-Bold').fontSize(10).text('Jumi Tech Academy',{x:340,y:452,width:180,align:'center'});doc.font('Helvetica').fontSize(9).text('Training & Certification',{x:340,y:468,width:180,align:'center'});
   doc.image(qr,650,420,{width:90,height:90});doc.fillColor('#26364c').font('Helvetica-Bold').fontSize(8).text('SCAN TO VERIFY',{x:640,y:512,width:110,align:'center'});
   doc.font('Helvetica').fontSize(8).text(`Certificate ID: ${certificateCode}`,{x:36,y:540,width:450});
   const buffer=await pdfBuffer(doc);
   await sql`INSERT INTO academy_certificates (id,certificate_code,registration_id,student_name,course_name,completion_date) VALUES (${id},${certificateCode},${r.id},${r.full_name},${course},${date})`;
   res.setHeader('Content-Type','application/pdf');res.setHeader('Content-Disposition',`attachment; filename="${certificateCode}.pdf"`);res.setHeader('Cache-Control','no-store');return res.status(200).send(buffer);
 }catch(e){console.error('Certificate generation error:',e);return json(res,500,{message:'Could not generate the certificate. Check the server configuration and try again.'});}
}
