import { Test } from '@nestjs/testing';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  type HealthCheckResult,
} from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  const healthCheckService = { check: jest.fn() };
  const typeOrmIndicator = { pingCheck: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: healthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: typeOrmIndicator },
      ],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('runs a database ping check and returns the result', async () => {
    const result: HealthCheckResult = {
      status: 'ok',
      info: { database: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' } },
    };
    healthCheckService.check.mockImplementation(async (indicators: (() => unknown)[]) => {
      await Promise.all(indicators.map((indicator) => indicator()));
      return result;
    });
    typeOrmIndicator.pingCheck.mockResolvedValue({ database: { status: 'up' } });

    await expect(controller.check()).resolves.toEqual(result);
    expect(typeOrmIndicator.pingCheck).toHaveBeenCalledWith('database');
  });
});
