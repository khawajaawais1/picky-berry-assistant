import { INestApplication } from '@nestjs/common';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';

export function setupSwagger(app: INestApplication): void {
  const zones = load(
    readFileSync(resolve(__dirname, '../../docs/openapi/zones.yaml'), 'utf8'),
  ) as OpenAPIObject;
  const auth = load(
    readFileSync(resolve(__dirname, '../../docs/openapi/auth.yaml'), 'utf8'),
  ) as OpenAPIObject;
  const visits = load(
    readFileSync(resolve(__dirname, '../../docs/openapi/visits.yaml'), 'utf8'),
  ) as OpenAPIObject;

  const contract: OpenAPIObject = {
    ...zones,
    paths: {
      ...zones.paths,
      ...auth.paths,
      ...visits.paths,
    },
    components: {
      ...zones.components,
      ...auth.components,
      ...visits.components,
      securitySchemes: {
        ...zones.components?.securitySchemes,
        ...auth.components?.securitySchemes,
        ...visits.components?.securitySchemes,
      },
      responses: {
        ...zones.components?.responses,
        ...auth.components?.responses,
        ...visits.components?.responses,
      },
      schemas: {
        ...zones.components?.schemas,
        ...auth.components?.schemas,
        ...visits.components?.schemas,
      },
    },
  };
  SwaggerModule.setup('docs', app, contract, { useGlobalPrefix: false });
}
