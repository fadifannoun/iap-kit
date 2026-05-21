import path from 'node:path';
import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';

export default defineConfig({
  schema: path.join(__dirname, 'schema.prisma'),
  migrate: {
    async adapter(env) {
      return new PrismaPg({ connectionString: env['DATABASE_URL'] as string });
    },
  },
});
