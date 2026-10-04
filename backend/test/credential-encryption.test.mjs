import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateKeyPairSync, webcrypto } from 'node:crypto';
import { CredentialEncryptionService } from '../dist/helpers/credential-encryption/credential-encryption.service.js';

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function additionalData(key, purpose) {
  return new TextEncoder().encode(
    [key.algorithm, key.keyId, purpose, key.serverTime].join(':'),
  );
}

async function encrypt(key, plaintext, purpose = 'login') {
  const publicKey = await webcrypto.subtle.importKey(
    'jwk',
    key.publicKey,
    { hash: 'SHA-256', name: 'RSA-OAEP' },
    false,
    ['encrypt'],
  );
  const aesKey = await webcrypto.subtle.generateKey(
    { length: 256, name: 'AES-GCM' },
    true,
    ['encrypt'],
  );
  const rawAesKey = await webcrypto.subtle.exportKey('raw', aesKey);
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await webcrypto.subtle.encrypt(
    { additionalData: additionalData(key, purpose), iv, name: 'AES-GCM' },
    aesKey,
    new TextEncoder().encode(plaintext),
  );
  const encryptedKey = await webcrypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    publicKey,
    rawAesKey,
  );

  return {
    algorithm: key.algorithm,
    ciphertext: toBase64Url(ciphertext),
    encryptedKey: toBase64Url(encryptedKey),
    iv: toBase64Url(iv),
    issuedAt: key.serverTime,
    keyId: key.keyId,
    purpose,
  };
}

test('descriptografa credencial híbrida somente no contexto esperado', async () => {
  const service = new CredentialEncryptionService(
    new ConfigService({ NODE_ENV: 'test' }),
  );
  const credential = await encrypt(service.getPublicKey(), 'senha-segura', 'login');

  assert.equal(
    service.decrypt(credential, { maxLength: 128, minLength: 1, purpose: 'login' }),
    'senha-segura',
  );
  assert.throws(
    () =>
      service.decrypt(credential, {
        maxLength: 128,
        minLength: 8,
        purpose: 'user-registration',
      }),
    BadRequestException,
  );
});

test('rejeita credencial adulterada ou fora da validade', async () => {
  const service = new CredentialEncryptionService(
    new ConfigService({ NODE_ENV: 'test' }),
  );
  const credential = await encrypt(service.getPublicKey(), 'senha-segura');

  assert.throws(
    () => service.decrypt({ ...credential, ciphertext: `${credential.ciphertext}A` }, {
      maxLength: 128,
      minLength: 1,
      purpose: 'login',
    }),
    BadRequestException,
  );
  assert.throws(
    () => service.decrypt({ ...credential, issuedAt: 0 }, {
      maxLength: 128,
      minLength: 1,
      purpose: 'login',
    }),
    BadRequestException,
  );
});

test('produção exige chave privada persistente e deriva keyId estável', () => {
  assert.throws(
    () => new CredentialEncryptionService(new ConfigService({ NODE_ENV: 'production' })),
    /is required in production/,
  );

  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0x10001,
  });
  const encodedPrivateKey = Buffer.from(
    privateKey.export({ format: 'pem', type: 'pkcs8' }),
  ).toString('base64');
  const configuration = new ConfigService({
    NODE_ENV: 'production',
    PASSWORD_ENCRYPTION_PRIVATE_KEY_BASE64: encodedPrivateKey,
  });
  const firstService = new CredentialEncryptionService(configuration);
  const secondService = new CredentialEncryptionService(configuration);

  assert.equal(firstService.getPublicKey().keyId, secondService.getPublicKey().keyId);
});
