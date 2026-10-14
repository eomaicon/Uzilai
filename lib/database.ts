import {createClient, type Client, type InValue} from '@libsql/client/web';

// SQLite remoto: mantém as operações e a concorrência dos registros da loja.
let client: Client | undefined;
let initialization: Promise<void> | undefined;
const schema = [
  'CREATE TABLE IF NOT EXISTS stores (id TEXT PRIMARY KEY, payload TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)',
  'CREATE TABLE IF NOT EXISTS administrator (id TEXT PRIMARY KEY, email TEXT NOT NULL, password_hash TEXT NOT NULL, store_id TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS admin_sessions (id TEXT PRIMARY KEY, expires INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS login_limits (id TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL)',
];
export async function database(): Promise<Client> {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error('Configure TURSO_DATABASE_URL no servidor.');
    if (process.env.NODE_ENV === 'production' && (!url.startsWith('libsql://') && !url.startsWith('https://'))) throw new Error('Use um banco remoto em produção.');
    client = createClient({url, authToken: process.env.TURSO_AUTH_TOKEN});
  }
  initialization ??= client.batch(schema, 'write').then(() => {}).catch(error => {initialization = undefined; throw error;});
  await initialization;
  return client;
}
class Query {
  constructor(public sql: string, public args: InValue[] = []) {}
  bind(...args: InValue[]) {return new Query(this.sql, args);}
  async first<T>() {const result = await (await database()).execute({sql:this.sql, args:this.args}); return (result.rows[0] as unknown as T) ?? null;}
  async run() {const result = await (await database()).execute({sql:this.sql, args:this.args}); return {meta:{changes:result.rowsAffected}};}
}
export const env = {DB:{
  prepare: (sql: string) => new Query(sql),
  batch: async (queries: Query[]) => (await database()).batch(queries.map(q => ({sql:q.sql, args:q.args})), 'write'),
}};
