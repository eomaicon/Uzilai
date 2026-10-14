import {env} from './database';
import {readSessionCookie,tokenHash} from './password';
export type Admin={id:string;email:string;password_hash:string;store_id:string};
export const getAdministrator=()=>env.DB!.prepare('SELECT id, email, password_hash, store_id FROM administrator WHERE id = ?').bind('owner').first<Admin>();
export async function authenticatedAdministrator(request:Request){const token=readSessionCookie(request);if(!token)return null;const session=await env.DB!.prepare('SELECT id FROM admin_sessions WHERE id = ? AND expires > ?').bind(tokenHash(token),Date.now()).first();return session?getAdministrator():null;}
export async function storeOwner(request:Request){const admin=await getAdministrator();if(admin){const authenticated=await authenticatedAdministrator(request);return authenticated?.store_id||null;}return null;}
