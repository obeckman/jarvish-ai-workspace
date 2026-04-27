import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

/**
 * Sessions Table
 * Stores metadata about each conversation.
 * The actual LangGraph state is stored separately by the checkpointer.
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  userId: text('user_id'), // Optional for future Auth integration
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const sessionSummaries = sqliteTable('session_summaries', {
  sessionId: text('session_id').primaryKey().references(() => sessions.id, { onDelete: 'cascade' }),
  summaryTitle: text('summary_title').notNull(),
  userMessage: text('user_message').notNull(),
  aiAnswer: text('ai_answer').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// --- LangGraph Internal Tables (Managed by SqliteSaver) ---
// We define them here so Drizzle-Kit doesn't try to drop them.

export const checkpoints = sqliteTable('checkpoints', {
  threadId: text('thread_id').notNull(),
  checkpointNs: text('checkpoint_ns').notNull().default(''),
  checkpointId: text('checkpoint_id').notNull(),
  parentCheckpointId: text('parent_checkpoint_id'),
  type: text('type'),
  checkpoint: text('checkpoint'),
  metadata: text('metadata'),
});

export const writes = sqliteTable('writes', {
  threadId: text('thread_id').notNull(),
  checkpointNs: text('checkpoint_ns').notNull().default(''),
  checkpointId: text('checkpoint_id').notNull(),
  taskId: text('task_id').notNull(),
  idx: integer('idx').notNull(),
  channel: text('channel').notNull(),
  type: text('type'),
  value: text('value'),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type SessionSummary = typeof sessionSummaries.$inferSelect;
export type NewSessionSummary = typeof sessionSummaries.$inferInsert;
