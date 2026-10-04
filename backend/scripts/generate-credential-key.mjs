import { generateKeyPairSync } from 'node:crypto';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 3072,
  publicExponent: 0x10001,
});
const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' });
const encodedPrivateKey = Buffer.from(privateKeyPem).toString('base64');

process.stdout.write(`PASSWORD_ENCRYPTION_PRIVATE_KEY_BASE64=${encodedPrivateKey}\n`);
