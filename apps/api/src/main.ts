import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { environment, logger, startTelemetry } from '@radar/config';
import type { Request, Response, NextFunction } from 'express';
import { ErrorFilter } from './common/http.js';
import { completeOpenApi } from './common/openapi.js';
await startTelemetry('radar-api');
const { AppModule } = await import('./app.module.js');
const config = environment(); // Validate before binding the HTTP listener.
const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
app.enableShutdownHooks();
app.setGlobalPrefix('api/v1');
app.use(helmet());
app.enableCors({
  origin: config.WEB_ORIGIN,
  allowedHeaders: ['Authorization', 'Content-Type', 'X-Organization-Id', 'X-Correlation-Id'],
});
app.use((request: Request & { correlationId?: string }, response: Response, next: NextFunction) => {
  const candidate = request.headers['x-correlation-id'];
  const correlationId =
    typeof candidate === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(candidate)
      ? candidate
      : randomUUID();
  request.correlationId = correlationId;
  response.setHeader('X-Correlation-Id', correlationId);
  response.on('finish', () =>
    logger.info(
      { correlationId, method: request.method, path: request.path, status: response.statusCode },
      'http',
    ),
  );
  next();
});
app.useGlobalFilters(new ErrorFilter());
const document = SwaggerModule.createDocument(
  app,
  new DocumentBuilder()
    .setTitle('Radar API')
    .setDescription(
      'Contratos v1. Recursos privados exigem Bearer OIDC e X-Organization-Id validado por associação.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Organization-Id' }, 'organization')
    .build(),
);
SwaggerModule.setup('api/docs', app, completeOpenApi(document));
await app.listen(config.API_PORT, '0.0.0.0');
logger.info({ url: `http://localhost:${config.API_PORT}/api/docs` }, 'API pronta');
