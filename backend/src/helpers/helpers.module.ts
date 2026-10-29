import { Module } from '@nestjs/common';
import { CookieModule } from './cookie/cookie.module.js';
import { CredentialEncryptionModule } from './credential-encryption/credential-encryption.module.js';
import { JwtHelperModule } from './jwt/jwt.module.js';
import { PasswordModule } from './password/password.module.js';
import { InstitutionDateTimeModule } from './institution-date-time/institution-date-time.module.js';
import { SystemParametersModule } from './system-parameters/system-parameters.module.js';

@Module({
  exports: [
    CookieModule,
    CredentialEncryptionModule,
    InstitutionDateTimeModule,
    JwtHelperModule,
    PasswordModule,
    SystemParametersModule,
  ],
  imports: [
    CookieModule,
    CredentialEncryptionModule,
    InstitutionDateTimeModule,
    JwtHelperModule,
    PasswordModule,
    SystemParametersModule,
  ],
})
export class HelpersModule {}
