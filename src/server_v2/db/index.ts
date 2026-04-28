import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@/server_v2/db/schema';
import path from 'node:path';

/**
 * Drizzle Database Client
 * Initialized with better-sqlite3 for local performance.
 */
const sqlite = new Database(path.join(process.cwd(), 'sqlite.db'));
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite instance for LangGraph's checkpointer
export { sqlite };
