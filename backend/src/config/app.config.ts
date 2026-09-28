import { registerAs } from '@nestjs/config';

export type AppConfig = {
  corsOrigin: string;
  environment: 'development' | 'test' | 'production';
  port: number;
};

export default registerAs('app', (): AppConfig => ({
  corsOrigin: process.env.CORS_ORIGIN as string,
  environment: process.env.NODE_ENV as AppConfig['environment'],
  port: Number.parseInt(process.env.PORT as string, 10),
}));
