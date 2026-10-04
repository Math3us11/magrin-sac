import { webcrypto } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({ apiRequest: vi.fn() }))

vi.mock('@/services/api', () => apiMocks)

import { encryptCredential } from '@/services/credential-encryption'

function fromBase64Url(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64url'))
}

describe('criptografia de credenciais', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('crypto', webcrypto)
  })

  it('usa AES-GCM por envio e protege a chave com RSA-OAEP', async () => {
    const keyPair = await webcrypto.subtle.generateKey(
      {
        hash: 'SHA-256',
        modulusLength: 2048,
        name: 'RSA-OAEP',
        publicExponent: new Uint8Array([1, 0, 1]),
      },
      true,
      ['encrypt', 'decrypt'],
    )
    const publicKey = await webcrypto.subtle.exportKey('jwk', keyPair.publicKey)
    const key = {
      algorithm: 'RSA-OAEP-256+A256GCM' as const,
      keyId: 'test-key-id',
      publicKey,
      serverTime: Date.now(),
    }
    apiMocks.apiRequest.mockResolvedValue(key)

    const credential = await encryptCredential('senha-segura', 'login')
    const rawAesKey = await webcrypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      keyPair.privateKey,
      fromBase64Url(credential.encryptedKey),
    )
    const aesKey = await webcrypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, [
      'decrypt',
    ])
    const additionalData = new TextEncoder().encode(
      [key.algorithm, key.keyId, 'login', key.serverTime].join(':'),
    )
    const plaintext = await webcrypto.subtle.decrypt(
      {
        additionalData,
        iv: fromBase64Url(credential.iv),
        name: 'AES-GCM',
      },
      aesKey,
      fromBase64Url(credential.ciphertext),
    )

    expect(new TextDecoder().decode(plaintext)).toBe('senha-segura')
    expect(JSON.stringify(credential)).not.toContain('senha-segura')
    expect(credential.purpose).toBe('login')
    expect(apiMocks.apiRequest).toHaveBeenCalledWith('/auth/credential-key', {
      cache: 'no-store',
      notification: false,
    })
  })
})
