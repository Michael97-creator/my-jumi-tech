export default function handler(req,res){
  res.setHeader('Content-Type','application/json; charset=utf-8');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).send(JSON.stringify({message:'Method not allowed.'}));}
  return res.status(410).send(JSON.stringify({message:'This legacy checkout endpoint has been retired. Submit Academy registrations through /api/academy/register.'}));
}
