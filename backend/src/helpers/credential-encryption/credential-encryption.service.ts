import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  constants,
  createDecipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  privateDecrypt,
  type KeyObject,
} from 'node:crypto';
import {
  CREDENTIAL_ENCRYPTION_ALGORITHM,
  type CredentialPublicKeyDto,
  type CredentialPurpose,
  type EncryptedCredentialDto,
} from './credential-encryption.dto.js';

const AUTH_TAG_LENGTH = 16;
const CREDENTIAL_MAX_AGE_MS = 2 * 60 * 1000;
const INVALID_CREDENTIAL_MESSAGE = 'Credencial criptografada inválida ou expirada.';
const IV_LENGTH = 12;

type DecryptCredentialOptions = {
  maxLength: number;
  minLength: number;
  purpose: CredentialPurpose;
};

function fromBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

@Injectable()
export class CredentialEncryptionService {
  private readonly keyId: string;
  private readonly privateKey: KeyObject;
  private readonly publicKey: CredentialPublicKeyDto['publicKey'];

  constructor(configService: ConfigService) {
    this.privateKey = this.loadPrivateKey(configService);
    const publicKey = createPublicKey(this.privateKey);
    const publicJwk = publicKey.export({ format: 'jwk' });

    if (publicJwk.kty !== 'RSA' || !publicJwk.e || !publicJwk.n) {
      throw new Error('PASSWORD_ENCRYPTION_PRIVATE_KEY_BASE64 must contain an RSA private key.');
    }

    const details = this.privateKey.asymmetricKeyDetails;
    if ((details?.modulusLength ?? 0) < 2048) {
      throw new Error('The password encryption RSA key must contain at least 2048 bits.');
    }

    const publicDer = publicKey.export({ format: 'der', type: 'spki' });
    this.keyId = createHash('sha256').update(publicDer).digest('base64url');
    this.publicKey = {
      alg: 'RSA-OAEP-256',
      e: publicJwk.e,
      ext: true,
      key_ops: ['encrypt'],
      kty: 'RSA',
      n: publicJwk.n,
    };
  }

  getPublicKey(): CredentialPublicKeyDto {
    return {
      algorithm: CREDENTIAL_ENCRYPTION_ALGORITHM,
      keyId: this.keyId,
      publicKey: this.publicKey,
      serverTime: Date.now(),
    };
  }

  decrypt(
    credential: EncryptedCredentialDto,
    { maxLength, minLength, purpose }: DecryptCredentialOptions,
  ): string {
    let aesKey: Buffer | undefined;
    let plaintextBuffer: Buffer | undefined;

    try {
      if (
        credential.algorithm !== CREDENTIAL_ENCRYPTION_ALGORITHM ||
        credential.keyId !== this.keyId ||
        credential.purpose !== purpose ||
        Math.abs(Date.now() - credential.issuedAt) > CREDENTIAL_MAX_AGE_MS
      ) {
        throw new Error('Credential metadata mismatch.');
      }

      const iv = fromBase64Url(credential.iv);
      const encryptedPayload = fromBase64Url(credential.ciphertext);
      if (iv.length !== IV_LENGTH || encryptedPayload.length <= AUTH_TAG_LENGTH) {
        throw new Error('Invalid encrypted payload length.');
      }

      aesKey = privateDecrypt(
        {
          key: this.privateKey,
          oaepHash: 'sha256',
          padding: constants.RSA_PKCS1_OAEP_PADDING,
        },
        fromBase64Url(credential.encryptedKey),
      );
      if (aesKey.length !== 32) throw new Error('Invalid AES key length.');

      const authTag = encryptedPayload.subarray(encryptedPayload.length - AUTH_TAG_LENGTH);
      const encryptedPassword = encryptedPayload.subarray(0, -AUTH_TAG_LENGTH);
      const decipher = createDecipheriv('aes-256-gcm', aesKey, iv);
      decipher.setAAD(Buffer.from(this.additionalData(credential), 'utf8'));
      decipher.setAuthTag(authTag);
      plaintextBuffer = Buffer.concat([decipher.update(encryptedPassword), decipher.final()]);

      const password = new TextDecoder('utf-8', { fatal: true }).decode(plaintextBuffer);
      if (password.length < minLength || password.length > maxLength) {
        throw new Error('Invalid plaintext length.');
      }

      return password;
    } catch {
      throw new BadRequestException(INVALID_CREDENTIAL_MESSAGE);
    } finally {
      aesKey?.fill(0);
      plaintextBuffer?.fill(0);
    }
  }

  private additionalData(credential: EncryptedCredentialDto): string {
    return [credential.algorithm, credential.keyId, credential.purpose, credential.issuedAt].join(
      ':',
    );
  }

  private loadPrivateKey(configService: ConfigService): KeyObject {
    const encodedPrivateKey = configService
      .get<string>('PASSWORD_ENCRYPTION_PRIVATE_KEY_BASE64')
      ?.trim();

    if (encodedPrivateKey) {
      try {
        return createPrivateKey(Buffer.from(encodedPrivateKey, 'base64').toString('utf8'));
      } catch {
        throw new Error('PASSWORD_ENCRYPTION_PRIVATE_KEY_BASE64 is not a valid private key.');
      }
    }

    const environment =
      configService.get<string>('APP_ENV') ?? configService.get<string>('NODE_ENV');
    if (environment === 'production') {
      throw new Error('PASSWORD_ENCRYPTION_PRIVATE_KEY_BASE64 is required in production.');
    }

    return generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicExponent: 0x10001,
    }).privateKey;
  }
}
