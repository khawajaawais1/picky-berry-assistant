import { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { setupSwagger } from './swagger.setup';

describe('setupSwagger', () => {
  it('registers the merged OpenAPI contracts at /docs', () => {
    const app = {} as INestApplication;
    const setup = jest
      .spyOn(SwaggerModule, 'setup')
      .mockImplementation(() => undefined);

    try {
      setupSwagger(app);

      const call = setup.mock.calls[0];
      expect(call?.[0]).toBe('docs');
      expect(call?.[1]).toBe(app);
      const contract = call?.[2];
      if (typeof contract !== 'object' || contract === null) {
        throw new Error('Swagger setup did not receive an OpenAPI object.');
      }
      expect(contract.paths).toHaveProperty('/auth/login');
      expect(contract.paths).toHaveProperty('/visits');
      expect(contract.paths).toHaveProperty('/zones');
      expect(call?.[3]).toEqual({ useGlobalPrefix: false });
    } finally {
      setup.mockRestore();
    }
  });
});
