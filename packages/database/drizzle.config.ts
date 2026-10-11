import { defineConfig } from 'drizzle-kit';
import { environment } from '@radar/config';
export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: { url: environment().DATABASE_URL },
});
