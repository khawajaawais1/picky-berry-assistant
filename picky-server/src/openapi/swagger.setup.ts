import { INestApplication } from '@nestjs/common';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';

const contractFiles = ['zones.yaml', 'auth.yaml', 'visits.yaml'];

function findOpenApiDirectory(): string {
  const directories = [
    resolve(process.cwd(), 'docs', 'openapi'),
    resolve(__dirname, '..', 'docs', 'openapi'),
    resolve(__dirname, '..', '..', 'docs', 'openapi'),
    resolve(process.cwd(), 'picky-server', 'docs', 'openapi'),
  ];
  const directory = directories.find((candidate) =>
    contractFiles.every((fileName) => existsSync(resolve(candidate, fileName))),
  );
  if (!directory) {
    throw new Error(
      `OpenAPI contracts not found. Checked: ${directories.join(', ')}`,
    );
  }
  return directory;
}

export function setupSwagger(app: INestApplication): void {
  const openApiDirectory = findOpenApiDirectory();
  const [zones, auth, visits] = contractFiles.map(
    (fileName) =>
      load(readFileSync(resolve(openApiDirectory, fileName), 'utf8')) as
        | OpenAPIObject
        | undefined,
  );
  if (!zones || !auth || !visits) {
    throw new Error('Unable to load OpenAPI contracts for Swagger UI.');
  }

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
