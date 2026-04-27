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

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
