import crypto from 'node:crypto';
import { json } from './db.js';
const COOKIE = 'jumi_academy_admin';
function secret(){ return process.env.SESSION_SECRET || ''; }
function sign(value){ return crypto.createHmac('sha256',secret()).update(value).digest('hex'); }
export function validAdmin(req){
  if (!secret() || secret().length < 32) return false;
  const raw = (req.headers.cookie || '').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  if (!raw) return false;
  const [stamp,signature] = decodeURIComponent(raw).split('.');
  if (!stamp || !signature || !/^\d+$/.test(stamp)) return false;
  const age = Date.now() - Number(stamp);
  if (age < 0 || age > 12*60*60*1000) return false;
  const expected = sign(stamp);
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
}
export function requireAdmin(req,res){ if (!validAdmin(req)){json(res,401,{message:'Please sign in to the Academy admin area.'});return false;} return true; }
export function loginCookie(res){
  const stamp=String(Date.now());
  const value=encodeURIComponent(`${stamp}.${sign(stamp)}`);
  const secure=process.env.NODE_ENV==='production'?' Secure':'';
  res.setHeader('Set-Cookie',`${COOKIE}=${value}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=43200`);
}
export function logoutCookie(res){const secure=process.env.NODE_ENV==='production'?' Secure':'';res.setHeader('Set-Cookie',`${COOKIE}=; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=0`);}
export function safeEqual(a,b){const aa=Buffer.from(String(a));const bb=Buffer.from(String(b));return aa.length===bb.length && crypto.timingSafeEqual(aa,bb);}
export function originAllowed(req){
  const origin=req.headers.origin;
  if(!origin) return true;
  try { const o=new URL(origin).origin; const host=req.headers.host; return o===`https://${host}` || (process.env.NODE_ENV!=='production' && o===`http://${host}`) || (process.env.SITE_URL && o===new URL(process.env.SITE_URL).origin); } catch { return false; }
}
