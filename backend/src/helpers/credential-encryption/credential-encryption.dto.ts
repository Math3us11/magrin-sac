import { IsIn, IsInt, IsString, Matches, MaxLength, Min } from 'class-validator';

export const CREDENTIAL_ENCRYPTION_ALGORITHM = 'RSA-OAEP-256+A256GCM' as const;
export const CREDENTIAL_PURPOSES = [
  'first-access-password',
  'login',
  'user-deletion-confirmation',
  'user-registration',
] as const;

export type CredentialPurpose = (typeof CREDENTIAL_PURPOSES)[number];

export class EncryptedCredentialDto {
  @IsIn([CREDENTIAL_ENCRYPTION_ALGORITHM])
  declare algorithm: typeof CREDENTIAL_ENCRYPTION_ALGORITHM;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(2048)
  declare ciphertext: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]+$/)
  @MaxLength(1024)
  declare encryptedKey: string;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{16}$/)
  declare iv: string;

  @IsInt()
  @Min(0)
  declare issuedAt: number;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  declare keyId: string;

  @IsIn(CREDENTIAL_PURPOSES)
  declare purpose: CredentialPurpose;
}

export type CredentialPublicKeyDto = {
  algorithm: typeof CREDENTIAL_ENCRYPTION_ALGORITHM;
  keyId: string;
  publicKey: {
    alg: 'RSA-OAEP-256';
    e: string;
    ext: true;
    key_ops: ['encrypt'];
    kty: 'RSA';
    n: string;
  };
  serverTime: number;
};
