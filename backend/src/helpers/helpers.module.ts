import { Module } from '@nestjs/common';
import { CookieModule } from './cookie/cookie.module.js';
import { JwtHelperModule } from './jwt/jwt.module.js';
import { PasswordModule } from './password/password.module.js';

@Module({
  exports: [CookieModule, JwtHelperModule, PasswordModule],
  imports: [CookieModule, JwtHelperModule, PasswordModule],
})
export class HelpersModule {}
