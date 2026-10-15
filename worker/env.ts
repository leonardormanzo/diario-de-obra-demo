// Minimal Cloudflare typings (only what this worker uses).
export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta?: { changes?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
}

export interface R2ObjectBody {
  text(): Promise<string>;
}

export interface R2Bucket {
  put(key: string, value: string): Promise<unknown>;
  get(key: string): Promise<R2ObjectBody | null>;
  delete(keys: string | string[]): Promise<void>;
}

export interface Env {
  DB: D1Database;
  /** Photo storage (R2). When absent, photos stay in the D1 `photos.data_url` column. */
  PHOTOS?: R2Bucket;
  /** One-time code that allows creating the first coordinator (Worker secret). */
  SETUP_CODE?: string;
}

export type Role = 'coordenador' | 'engenheiro' | 'cliente';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  /** Obras assigned to this user (always empty for coordenador, who sees everything). */
  projectIds: string[];
}
