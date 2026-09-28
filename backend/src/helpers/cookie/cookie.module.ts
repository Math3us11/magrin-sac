import { Module } from '@nestjs/common';
import { SessionCookieService } from './cookie.service.js';

@Module({
  exports: [SessionCookieService],
  providers: [SessionCookieService],
})
export class CookieModule {}
