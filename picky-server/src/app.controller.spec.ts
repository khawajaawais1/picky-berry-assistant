import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { HealthService } from './health/health.service';

describe('AppController', () => {
  let appController: AppController;
  const health = { check: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: HealthService, useValue: health }],
    }).compile();

    appController = app.get<AppController>(AppController);
    health.check.mockResolvedValue({ status: 'ok', db: 'ok' });
  });

  describe('health', () => {
    it('checks database availability', async () => {
      await expect(appController.getHealth()).resolves.toEqual({
        status: 'ok',
        db: 'ok',
      });
      expect(health.check).toHaveBeenCalledTimes(1);
    });
  });
});
