// DataSource used by the TypeORM CLI (see the `typeorm` / `migration:*` npm scripts).
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { buildDatabaseOptions } from './config/database.config';

config({ path: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')], quiet: true });

export default new DataSource({
  ...buildDatabaseOptions((key) => process.env[key]),
  entities: [`${__dirname}/**/*.entity.{ts,js}`],
});
