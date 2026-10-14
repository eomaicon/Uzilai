import {setupEnabled,validSetupKey} from '../../../lib/setup';
import {env} from '../../../lib/database';
import {getAdministrator,authenticatedAdministrator} from '../../../lib/admin-auth';
import {hashPassword,verifyPassword,normalizedEmail,validPassword,newSessionToken,tokenHash,readSessionCookie,sessionCookie} from '../../../lib/password';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200,cookie?:string)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});
async function issueSession(){const token=newSessionToken();await env.DB!.prepare('DELETE FROM admin_sessions WHERE expires <= ?').bind(Date.now()).run();await env.DB!.prepare('INSERT INTO admin_sessions (id, expires) VALUES (?, ?)').bind(tokenHash(token),Date.now()+86400000).run();return sessionCookie(token);}
export async function GET(request:Request){try{const admin=await getAdministrator(),auth=admin?await authenticatedAdministrator(request):null;return json({configured:!!admin,authenticated:!!auth,email:auth?.email||null,canSetup:!admin&&setupEnabled()});}catch{return json({error:'Não foi possível verificar o acesso. Tente novamente.'},503);}}
export async function POST(request:Request){
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Origem inválida.'},403);
 let d:any;try{const raw=await request.text();if(raw.length>4096)return json({error:'Solicitação muito grande.'},413);d=JSON.parse(raw);if(!d||typeof d!=='object'||Array.isArray(d))return json({error:'Solicitação inválida.'},400);}catch{return json({error:'Solicitação inválida.'},400);}
 try{
  if(d.action==='logout'){const token=readSessionCookie(request);if(token)await env.DB!.prepare('DELETE FROM admin_sessions WHERE id = ?').bind(tokenHash(token)).run();return json({ok:true},200,sessionCookie('',0));}
  const admin=await getAdministrator();
  if(d.action==='setup'){
   const native='owner';if(admin)return json({error:'O administrador já foi configurado.'},409);if(!validSetupKey(d.setupKey))return json({error:'Código de configuração inválido.'},403);
   let email,password;try{email=normalizedEmail(d.email);password=validPassword(d.password);}catch(e){return json({error:e instanceof Error?e.message:'Dados inválidos.'},400);}
   const hash=await hashPassword(password);
   const result=await env.DB!.prepare('INSERT OR IGNORE INTO administrator (id, email, password_hash, store_id) VALUES (?, ?, ?, ?)').bind('owner',email,hash,native).run();
   if(result.meta.changes!==1)return json({error:'O administrador já foi configurado.'},409);
   return json({ok:true,email},200,await issueSession());
  }
  if(d.action==='login'){
   if(!admin)return json({error:'O acesso ainda precisa ser configurado pelo proprietário.'},403);
   const ip=request.headers.get('x-forwarded-for')||'unknown',bucket=Math.floor(Date.now()/900000),key=tokenHash(ip)+'-'+bucket;
   await env.DB!.prepare('DELETE FROM login_limits WHERE expires <= ?').bind(Date.now()).run();
   const limit=await env.DB!.prepare('INSERT INTO login_limits (id, attempts, expires) VALUES (?, 1, ?) ON CONFLICT(id) DO UPDATE SET attempts = attempts + 1 RETURNING attempts').bind(key,(bucket+1)*900000).first<{attempts:number}>();
   if(!limit||limit.attempts>10)return json({error:'Muitas tentativas de acesso. Aguarde até 15 minutos e tente novamente.'},429);
   let email;try{email=normalizedEmail(d.email);}catch{return json({error:'Email ou senha incorretos.'},401);}
   // Always verify the password so the error does not reveal which email is configured.
   const passwordOk=await verifyPassword(d.password,admin.password_hash);if(!passwordOk||email!==admin.email)return json({error:'Email ou senha incorretos.'},401);
   return json({ok:true,email:admin.email},200,await issueSession());
  }
  if(d.action==='change-password'){
   const authenticated=await authenticatedAdministrator(request);if(!authenticated)return json({error:'Entre para alterar a senha.'},401);
   if(!await verifyPassword(d.currentPassword,authenticated.password_hash))return json({error:'A senha atual está incorreta.'},401);
   let password;try{password=validPassword(d.password);}catch(e){return json({error:e instanceof Error?e.message:'Senha inválida.'},400);}
   const hash=await hashPassword(password);await env.DB!.batch([env.DB!.prepare('UPDATE administrator SET password_hash = ? WHERE id = ?').bind(hash,'owner'),env.DB!.prepare('DELETE FROM admin_sessions')]);
   return json({ok:true},200,await issueSession());
  }
  return json({error:'Ação inválida.'},400);
 }catch{return json({error:'Não foi possível concluir o acesso. Tente novamente.'},503);}
}
