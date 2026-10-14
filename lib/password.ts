import {randomBytes,scrypt,timingSafeEqual,createHash} from 'node:crypto';
const options={N:32768,r:8,p:3,maxmem:64*1024*1024};
const derive=(password:string,salt:string)=>new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,32,options,(error,key)=>error?reject(error):resolve(key)));
export function normalizedEmail(value:unknown){if(typeof value!=='string')throw Error('Informe um email válido.');const email=value.trim().toLowerCase();if(email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw Error('Informe um email válido.');return email;}
export function validPassword(value:unknown){if(typeof value!=='string'||value.length<12||value.length>128)throw Error('Use uma senha de 12 a 128 caracteres.');return value;}
export async function hashPassword(password:string){validPassword(password);const salt=randomBytes(16).toString('hex');return 'scrypt$32768$8$3$'+salt+'$'+(await derive(password,salt)).toString('hex');}
export async function verifyPassword(password:unknown,encoded:string){if(typeof password!=='string'||password.length>128)return false;const parts=encoded.split('$');if(parts.length!==6||parts[0]!=='scrypt'||parts[1]!=='32768'||parts[2]!=='8'||parts[3]!=='3'||!/^[a-f0-9]{32}$/.test(parts[4])||!/^[a-f0-9]{64}$/.test(parts[5]))return false;const actual=await derive(password,parts[4]);return timingSafeEqual(actual,Buffer.from(parts[5],'hex'));}
export const newSessionToken=()=>randomBytes(32).toString('hex');
export const tokenHash=(value:string)=>createHash('sha256').update(value).digest('hex');
export const COOKIE='__Host-uzilai_session';
export function readSessionCookie(request:Request){const raw=request.headers.get('cookie')||'';const token=raw.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);return token&&/^[a-f0-9]{64}$/.test(token)?token:null;}
export const sessionCookie=(token:string,seconds=86400)=>`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${seconds}`;
