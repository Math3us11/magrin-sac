import { registerAs } from '@nestjs/config';

export type AuthConfig = {
  cookie: {
    name: string;
    path: string;
    sameSite: 'lax';
    secure: boolean;
  };
  jwt: {
    audience: string;
    issuer: string;
    secret: string;
    ttlSeconds: number;
  };
};

export default registerAs('auth', (): AuthConfig => ({
  cookie: {
    name: process.env.AUTH_SESSION_COOKIE_NAME as string,
    path: '/api',
    sameSite: 'lax',
    secure:
      process.env.AUTH_SESSION_COOKIE_SECURE === undefined
        ? (process.env.APP_ENV ?? process.env.NODE_ENV) === 'production'
        : process.env.AUTH_SESSION_COOKIE_SECURE === 'true',
  },
  jwt: {
    audience: process.env.AUTH_SESSION_JWT_AUDIENCE as string,
    issuer: process.env.AUTH_SESSION_JWT_ISSUER as string,
    secret: process.env.AUTH_SESSION_JWT_SECRET as string,
    ttlSeconds: Number.parseInt(process.env.AUTH_SESSION_JWT_TTL_SECONDS as string, 10),
  },
}));
