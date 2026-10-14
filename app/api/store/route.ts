import { env } from '../../../lib/database';
import { applyCommand, emptyStore, type Store } from '../../../lib/store';
import {storeOwner} from '../../../lib/admin-auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
// After initial setup, only a valid owner session can read or mutate business records.
export async function GET(request:Request){
 let user:string|null;try{user=await storeOwner(request);}catch{return json({error:'Não foi possível verificar o acesso.'},503);} if(!user) return json({error:'Entre com sua conta para acessar os dados.'},401);
 try { const row=await env.DB!.prepare('SELECT payload FROM stores WHERE id = ?').bind(user).first<{payload:string}>(); return json({store:row?JSON.parse(row.payload):emptyStore()}); } catch {return json({error:'Não foi possível carregar os dados. Tente novamente.'},503);}
}
export async function POST(request:Request){
 let user:string|null;try{user=await storeOwner(request);}catch{return json({error:'Não foi possível verificar o acesso.'},503);} if(!user) return json({error:'Entre com sua conta para salvar.'},401);
 if(request.headers.get('origin')!==new URL(request.url).origin) return json({error:'Origem inválida.'},403);
 let cmd; try {const raw=await request.text(); if(raw.length>50000) return json({error:'Pedido muito grande.'},413); cmd=JSON.parse(raw);} catch {return json({error:'Pedido inválido.'},400);}
 try {
  await env.DB!.prepare('INSERT OR IGNORE INTO stores (id, payload, revision) VALUES (?, ?, 0)').bind(user,JSON.stringify(emptyStore())).run();
  for(let attempt=0;attempt<4;attempt++){
   const row=await env.DB!.prepare('SELECT payload, revision FROM stores WHERE id = ?').bind(user).first<{payload:string;revision:number}>(); if(!row) throw new Error('Dados não encontrados.');
   let store:Store; try {store=applyCommand(JSON.parse(row.payload),cmd);} catch(e){return json({error:e instanceof Error?e.message:'Dados inválidos.'},400);}
   const result=await env.DB!.prepare('UPDATE stores SET payload = ?, revision = revision + 1 WHERE id = ? AND revision = ?').bind(JSON.stringify(store),user,row.revision).run();
   if(result.meta.changes===1) return json({store});
  }
  return json({error:'Outro registro foi atualizado ao mesmo tempo. Tente novamente.'},409);
 } catch {return json({error:'Não foi possível salvar. Seus dados anteriores foram preservados.'},503);}
}
