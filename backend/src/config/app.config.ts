import { registerAs } from '@nestjs/config';

export type AppConfig = {
  corsOrigin: string;
  environment: 'development' | 'test' | 'production';
  host: string;
  port: number;
  serveFrontend: boolean;
  timeZone: string;
};

export default registerAs('app', (): AppConfig => {
  const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development';

  return {
    corsOrigin: process.env.CORS_ORIGIN as string,
    environment: environment as AppConfig['environment'],
    host: process.env.APP_HOST ?? '127.0.0.1',
    port: Number.parseInt(process.env.PORT as string, 10),
    serveFrontend: process.env.APP_SERVE_FRONTEND === 'true',
    timeZone: process.env.APP_TIMEZONE as string,
  };
});
