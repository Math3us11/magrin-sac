import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppModule } from './app.module.js';
import type { AppConfig } from './config/app.config.js';

const FRONTEND_DIST_PATH = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
const FRONTEND_INDEX_PATH = join(FRONTEND_DIST_PATH, 'index.html');

function configureFrontend(app: NestExpressApplication, appConfig: AppConfig): void {
  if (!appConfig.serveFrontend) return;

  if (!existsSync(FRONTEND_INDEX_PATH)) {
    throw new Error(
      `Frontend build not found at ${FRONTEND_INDEX_PATH}. Run \`pnpm build\` before starting the remote environment.`,
    );
  }

  app.useStaticAssets(FRONTEND_DIST_PATH, {
    dotfiles: 'allow',
    index: false,
  });
  app.use((request: Request, response: Response, next: NextFunction) => {
    const isApiRequest = request.path === '/api' || request.path.startsWith('/api/');
    const acceptsHtml = request.accepts('html');

    if (request.method !== 'GET' || isApiRequest || !acceptsHtml) {
      next();
      return;
    }

    response.sendFile(FRONTEND_INDEX_PATH, { dotfiles: 'allow' });
  });
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const appConfig = configService.getOrThrow<AppConfig>('app');

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    credentials: true,
    origin: appConfig.corsOrigin,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  configureFrontend(app, appConfig);

  await app.listen(appConfig.port, appConfig.host);
}

await bootstrap();
