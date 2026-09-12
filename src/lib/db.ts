import { getCloudflareContext } from '@opennextjs/cloudflare';

export interface D1Stmt { bind(...values: unknown[]): D1Stmt; first<T = unknown>(): Promise<T | null>; run(): Promise<{ meta: { changes: number } }>; }
export interface D1 { prepare(sql: string): D1Stmt; }

export async function db(): Promise<D1> {
  const { env } = await getCloudflareContext({ async: true });
  const database = (env as unknown as { DB?: D1 }).DB;
  if (!database) throw new Error('D1 binding "DB" is not configured');
  return database;
}
