import { Module } from '@nestjs/common';
import { CredentialEncryptionService } from './credential-encryption.service.js';

@Module({
  exports: [CredentialEncryptionService],
  providers: [CredentialEncryptionService],
})
export class CredentialEncryptionModule {}
