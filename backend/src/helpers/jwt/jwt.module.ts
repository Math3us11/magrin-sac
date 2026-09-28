import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule as NestJwtModule, type JwtModuleOptions } from '@nestjs/jwt';
import type { AuthConfig } from '../../config/auth.config.js';
import { JwtSessionService } from './jwt.service.js';

@Module({
  exports: [JwtSessionService],
  imports: [
    NestJwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const auth = configService.getOrThrow<AuthConfig>('auth');

        return {
          secret: auth.jwt.secret,
          signOptions: {
            algorithm: 'HS256',
            audience: auth.jwt.audience,
            expiresIn: auth.jwt.ttlSeconds,
            issuer: auth.jwt.issuer,
          },
          verifyOptions: {
            algorithms: ['HS256'],
            audience: auth.jwt.audience,
            issuer: auth.jwt.issuer,
          },
        };
      },
    }),
  ],
  providers: [JwtSessionService],
})
export class JwtHelperModule {}
