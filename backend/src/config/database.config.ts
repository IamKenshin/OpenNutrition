import type { DataSourceOptions } from 'typeorm';

type EnvReader = (key: string) => string | undefined;

/**
 * Shared Postgres connection options used by both the Nest app and the TypeORM CLI.
 * Schema changes go through migrations — `synchronize` is always off.
 */
export function buildDatabaseOptions(env: EnvReader): DataSourceOptions {
  return {
    type: 'postgres',
    host: env('DB_HOST') ?? 'localhost',
    port: Number(env('DB_PORT') ?? 5432),
    username: env('DB_USERNAME') ?? 'nutrition',
    password: env('DB_PASSWORD') ?? 'nutrition',
    database: env('DB_NAME') ?? 'nutrition_tracker',
    logging: env('DB_LOGGING') === 'true',
    synchronize: false,
    migrations: [`${__dirname}/../migrations/*.{ts,js}`],
  };
}
