import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/server_v2/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'sqlite.db',
  },
});
