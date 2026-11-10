import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmHealthIndicator } from '@nestjs/terminus';
import request from 'supertest';
import type { App } from 'supertest/types';
import { HealthModule } from '../src/health/health.module';

// Exercises the real HTTP pipeline (routing + Terminus) with the DB indicator stubbed,
// so these tests don't need a running Postgres.
describe('GET /health (e2e)', () => {
  let app: INestApplication<App>;
  const typeOrmIndicator = { pingCheck: jest.fn() };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [HealthModule] })
      .overrideProvider(TypeOrmHealthIndicator)
      .useValue(typeOrmIndicator)
      .compile();

    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 when the database is up', async () => {
    typeOrmIndicator.pingCheck.mockResolvedValue({ database: { status: 'up' } });

    const res = await request(app.getHttpServer()).get('/health').expect(200);

    expect(res.body).toMatchObject({ status: 'ok', info: { database: { status: 'up' } } });
  });

  it('returns 503 when the database is down', async () => {
    typeOrmIndicator.pingCheck.mockResolvedValue({
      database: { status: 'down', message: 'Database unreachable' },
    });

    const res = await request(app.getHttpServer()).get('/health').expect(503);

    expect(res.body).toMatchObject({ status: 'error', error: { database: { status: 'down' } } });
  });
});
