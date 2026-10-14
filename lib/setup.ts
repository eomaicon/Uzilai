import {timingSafeEqual} from 'node:crypto';
import {tokenHash} from './password';
export const setupEnabled = () => (process.env.OWNER_SETUP_KEY?.length ?? 0) >= 32 && (process.env.OWNER_SETUP_KEY?.length ?? 0) <= 256;
export function validSetupKey(value: unknown) {
  if (!setupEnabled() || typeof value !== 'string' || value.length > 256) return false;
  return timingSafeEqual(Buffer.from(tokenHash(value)), Buffer.from(tokenHash(process.env.OWNER_SETUP_KEY!)));
}
