import { config } from 'dotenv';
config({ path: '.env.local' });
import type { Config } from 'drizzle-kit';

export default {
  schema: './app/lib/**/*.schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  schemaFilter: ['public', 'mcp_nota_fiscal', 'mcp_eloa', 'mcp_otto', 'mcp_familia', 'mcp_rayssa'],
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
