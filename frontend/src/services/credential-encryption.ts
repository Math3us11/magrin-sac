import { apiRequest } from '@/services/api'
import {
  CREDENTIAL_ENCRYPTION_ALGORITHM,
  type CredentialPublicKeyResponse,
  type CredentialPurpose,
  type EncryptedCredential,
} from '@/types/credential-encryption'

const AES_KEY_LENGTH = 256
const IV_LENGTH = 12

function toBase64Url(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
  let binary = ''

  for (const byte of bytes) binary += String.fromCharCode(byte)

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')
}

function additionalData(
  key: CredentialPublicKeyResponse,
  purpose: CredentialPurpose,
): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode([key.algorithm, key.keyId, purpose, key.serverTime].join(':'))
}

export async function encryptCredential(
  plaintext: string,
  purpose: CredentialPurpose,
): Promise<EncryptedCredential> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('A criptografia de credenciais não está disponível neste navegador.')
  }

  const key = await apiRequest<CredentialPublicKeyResponse>('/auth/credential-key', {
    cache: 'no-store',
    notification: false,
  })
  if (key.algorithm !== CREDENTIAL_ENCRYPTION_ALGORITHM) {
    throw new Error('O servidor informou um algoritmo de credenciais incompatível.')
  }

  const publicKey = await crypto.subtle.importKey(
    'jwk',
    key.publicKey,
    { hash: 'SHA-256', name: 'RSA-OAEP' },
    false,
    ['encrypt'],
  )
  const aesKey = await crypto.subtle.generateKey(
    { length: AES_KEY_LENGTH, name: 'AES-GCM' },
    true,
    ['encrypt'],
  )
  const rawAesKey = new Uint8Array(await crypto.subtle.exportKey('raw', aesKey))
  const encodedPassword = new TextEncoder().encode(plaintext)
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))

  try {
    const [ciphertext, encryptedKey] = await Promise.all([
      crypto.subtle.encrypt(
        { additionalData: additionalData(key, purpose), iv, name: 'AES-GCM' },
        aesKey,
        encodedPassword,
      ),
      crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey),
    ])

    return {
      algorithm: CREDENTIAL_ENCRYPTION_ALGORITHM,
      ciphertext: toBase64Url(ciphertext),
      encryptedKey: toBase64Url(encryptedKey),
      iv: toBase64Url(iv),
      issuedAt: key.serverTime,
      keyId: key.keyId,
      purpose,
    }
  } finally {
    encodedPassword.fill(0)
    rawAesKey.fill(0)
  }
}
