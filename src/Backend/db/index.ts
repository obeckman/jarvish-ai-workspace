import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@/Backend/db/schema';
import path from 'node:path';

/**
 * Drizzle Database Client
 * Initialized with better-sqlite3 for local performance.
 */
const sqlite = new Database(path.join(process.cwd(), 'sqlite.db'));
ensureLocalSchema(sqlite);
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite instance for LangGraph's checkpointer
export { sqlite };

function ensureLocalSchema(database: Database.Database): void {
  const structuredFactColumns = database
    .prepare("PRAGMA table_info(structured_facts)")
    .all()
    .map((column) => getColumnName(column));

  if (structuredFactColumns.length === 0) {
    return;
  }

  if (structuredFactColumns.includes('vector_memory_id')) {
    return;
  }

  database.exec("ALTER TABLE structured_facts ADD COLUMN vector_memory_id text");
}

function getColumnName(column: unknown): string {
  if (!column || typeof column !== 'object' || !('name' in column)) {
    return "";
  }

  const name = column.name;
  if (typeof name === 'string') {
    return name;
  }

  return "";
}
