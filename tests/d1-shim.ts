/**
 * D1 em memória para os testes: implementa só o que o worker usa (prepare/bind/first/all/run/batch)
 * sobre o SQLite embutido do Node (node:sqlite). As migrações reais de worker/migrations são aplicadas,
 * então as consultas e as regras de acesso testadas são as de produção, não um mock.
 */
import { DatabaseSync } from 'node:sqlite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { D1Database, D1PreparedStatement, D1Result, Env, R2Bucket } from '../worker/env';

type SqlValue = string | number | null;

class Statement implements D1PreparedStatement {
  constructor(
    private readonly db: DatabaseSync,
    private readonly sql: string,
    private readonly params: SqlValue[] = []
  ) {}

  bind(...values: unknown[]): D1PreparedStatement {
    return new Statement(this.db, this.sql, values as SqlValue[]);
  }

  async first<T = unknown>(): Promise<T | null> {
    return (this.db.prepare(this.sql).get(...this.params) as T | undefined) ?? null;
  }

  async all<T = unknown>(): Promise<D1Result<T>> {
    return { results: this.db.prepare(this.sql).all(...this.params) as T[], success: true };
  }

  async run(): Promise<D1Result> {
    const info = this.db.prepare(this.sql).run(...this.params);
    return { results: [], success: true, meta: { changes: Number(info.changes) } };
  }
}

export function createDatabase(): D1Database {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const dir = join(import.meta.dirname, '..', 'worker', 'migrations');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    db.exec(readFileSync(join(dir, file), 'utf8'));
  }
  return {
    prepare: (sql) => new Statement(db, sql),
    async batch(statements) {
      const results: D1Result[] = [];
      db.exec('BEGIN');
      try {
        for (const statement of statements) results.push(await statement.run());
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
      return results;
    },
  };
}

export function createFakeBucket(): R2Bucket & { size(): number } {
  const objects = new Map<string, string>();
  return {
    async put(key, value) {
      objects.set(key, value);
    },
    async get(key) {
      const value = objects.get(key);
      return value === undefined ? null : { text: async () => value };
    },
    async delete(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) objects.delete(key);
    },
    size: () => objects.size,
  };
}

export function createEnv(options: { setupCode?: string; withBucket?: boolean } = {}): Env {
  return {
    DB: createDatabase(),
    SETUP_CODE: options.setupCode,
    PHOTOS: options.withBucket ? createFakeBucket() : undefined,
  };
}
