import { neon } from '@neondatabase/serverless';

// Lazy-initialized singleton — safe for serverless/edge environments
// The DATABASE_URL check is deferred to first use (runtime, not build time)
let _sql: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL environment variable is not set');
    _sql = neon(url);
  }
  return _sql;
}

export { neon };
