import { INestApplication } from '@nestjs/common';
import { OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load } from 'js-yaml';

const swaggerUiCdn = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.19.0';
const docsContentSecurityPolicy = [
  "default-src 'none'",
  "script-src 'self' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data:",
  "font-src 'self' data: https://cdn.jsdelivr.net",
  "connect-src 'self'",
  "base-uri 'none'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const docsHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Picky Server API</title>
    <link rel="stylesheet" href="${swaggerUiCdn}/swagger-ui.css">
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="${swaggerUiCdn}/swagger-ui-bundle.js"></script>
    <script src="${swaggerUiCdn}/swagger-ui-standalone-preset.js"></script>
    <script src="/docs-init.js"></script>
  </body>
</html>`;

const docsInitializer = `window.onload = function () {
  window.ui = SwaggerUIBundle({
    url: window.location.origin + '/docs-json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
    layout: 'StandaloneLayout'
  });
};`;

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
  const admin = load(
    readFileSync(resolve(__dirname, '../../docs/openapi/admin.yaml'), 'utf8'),
  ) as OpenAPIObject;

  const contract: OpenAPIObject = {
    ...zones,
    paths: {
      ...zones.paths,
      ...auth.paths,
      ...visits.paths,
      ...admin.paths,
    },
    components: {
      ...zones.components,
      ...auth.components,
      ...visits.components,
      securitySchemes: {
        ...zones.components?.securitySchemes,
        ...auth.components?.securitySchemes,
        ...visits.components?.securitySchemes,
        ...admin.components?.securitySchemes,
      },
      parameters: {
        ...zones.components?.parameters,
        ...auth.components?.parameters,
        ...visits.components?.parameters,
        ...admin.components?.parameters,
      },
      responses: {
        ...zones.components?.responses,
        ...auth.components?.responses,
        ...visits.components?.responses,
        ...admin.components?.responses,
      },
      schemas: {
        ...zones.components?.schemas,
        ...auth.components?.schemas,
        ...visits.components?.schemas,
        ...admin.components?.schemas,
      },
    },
  };

  const adapter = app.getHttpAdapter();
  const serveDocs = (_request: Request, response: Response) => {
    response.setHeader('Content-Security-Policy', docsContentSecurityPolicy);
    response.type('html').send(docsHtml);
  };
  adapter.get('/docs', serveDocs);
  adapter.get('/docs/', serveDocs);
  adapter.get('/docs-init.js', (_request, response: Response) => {
    response.type('application/javascript').send(docsInitializer);
  });

  SwaggerModule.setup('docs', app, contract, {
    useGlobalPrefix: false,
    ui: false,
    raw: ['json'],
  });
}
