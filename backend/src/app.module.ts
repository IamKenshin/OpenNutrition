import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDatabaseOptions } from './config/database.config';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Works whether the backend is started from backend/ (npm workspace) or the repo root.
      envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../.env')],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...buildDatabaseOptions((key) => config.get<string>(key)),
        autoLoadEntities: true,
      }),
    }),
    HealthModule,
  ],
})
export class AppModule {}
