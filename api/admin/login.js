import { json, method, parseBody } from '../../lib/db.js';
import { loginCookie, logoutCookie, safeEqual, validAdmin } from '../../lib/auth.js';
export default async function handler(req,res){
  if(req.method==='GET'){return json(res,200,{authenticated:validAdmin(req)});}
  if(!method(req,res,['POST','DELETE'])) return;
  if(req.method==='DELETE'){logoutCookie(res);return json(res,200,{message:'Signed out.'});}
  const configured=process.env.ADMIN_PASSWORD, sessionSecret=process.env.SESSION_SECRET;
  if(!configured||configured.length<12||!sessionSecret||sessionSecret.length<32) return json(res,503,{message:'Admin login is not configured. Set ADMIN_PASSWORD and a strong SESSION_SECRET in Vercel.'});
  const b=parseBody(req);
  if(!safeEqual(String(b.password||''),configured)) return json(res,401,{message:'Incorrect password.'});
  loginCookie(res);return json(res,200,{authenticated:true,message:'Signed in successfully.'});
}
