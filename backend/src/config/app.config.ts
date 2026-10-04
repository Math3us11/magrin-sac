import { registerAs } from '@nestjs/config';

export type AppConfig = {
  corsOrigin: string;
  environment: 'development' | 'test' | 'production';
  port: number;
  timeZone: string;
};

export default registerAs('app', (): AppConfig => {
  const environment = process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development';

  return {
    corsOrigin: process.env.CORS_ORIGIN as string,
    environment: environment as AppConfig['environment'],
    port: Number.parseInt(process.env.PORT as string, 10),
    timeZone: process.env.APP_TIMEZONE as string,
  };
});
