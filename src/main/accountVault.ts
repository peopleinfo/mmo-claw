import crypto from 'crypto'

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12

export class AccountVault {
  private readonly key: Buffer

  constructor(secret: string) {
    if (!secret.trim()) {
      throw new Error('AccountVault secret cannot be empty')
    }
    this.key = crypto.createHash('sha256').update(secret).digest()
  }

  encrypt(value: string): string {
    const iv = crypto.randomBytes(IV_BYTES)
    const cipher = crypto.createCipheriv(ALGO, this.key, iv)
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return Buffer.concat([iv, tag, encrypted]).toString('base64')
  }

  decrypt(payload: string): string {
    const raw = Buffer.from(payload, 'base64')
    if (raw.length <= IV_BYTES + 16) {
      throw new Error('Invalid encrypted payload')
    }

    const iv = raw.subarray(0, IV_BYTES)
    const tag = raw.subarray(IV_BYTES, IV_BYTES + 16)
    const encrypted = raw.subarray(IV_BYTES + 16)
    const decipher = crypto.createDecipheriv(ALGO, this.key, iv)
    decipher.setAuthTag(tag)
    const plain = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return plain.toString('utf8')
  }
}
