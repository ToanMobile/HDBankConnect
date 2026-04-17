import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    bufferLogs: true,
  });

  // Security headers
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const helmetFn = require('helmet') as (opts?: Record<string, unknown>) => unknown;
  app.use(helmetFn());

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  const corsOrigins = process.env['CORS_ORIGINS']?.split(',').map((s) => s.trim()) ?? [
    'http://localhost:3001',
  ];
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-correlation-id',
      'x-forwarded-for',
    ],
  });

  // Body size limit
  app.use(require('express').json({ limit: '50mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '50mb' }));

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(),
    new ResponseInterceptor(),
  );

  // Global JWT guard (use @Public() to bypass)
  const reflector = app.get(Reflector);
  app.useGlobalGuards(new JwtAuthGuard(reflector));

  const port = parseInt(process.env['PORT'] ?? '3000', 10);
  await app.listen(port);

  console.log(
    `[Bootstrap] eCheckAI API running on http://localhost:${port}/api/v1`,
  );
}

void bootstrap();
