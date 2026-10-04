export const CREDENTIAL_ENCRYPTION_ALGORITHM = 'RSA-OAEP-256+A256GCM' as const

export type CredentialPurpose =
  'first-access-password' | 'login' | 'user-deletion-confirmation' | 'user-registration'

export type EncryptedCredential = {
  algorithm: typeof CREDENTIAL_ENCRYPTION_ALGORITHM
  ciphertext: string
  encryptedKey: string
  iv: string
  issuedAt: number
  keyId: string
  purpose: CredentialPurpose
}

export type CredentialPublicKeyResponse = {
  algorithm: typeof CREDENTIAL_ENCRYPTION_ALGORITHM
  keyId: string
  publicKey: JsonWebKey
  serverTime: number
}
