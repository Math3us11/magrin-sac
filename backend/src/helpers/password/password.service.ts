import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';

@Injectable()
export class PasswordHashService {
  private readonly decoyHash: Promise<string>;

  constructor() {
    this.decoyHash = this.hash(randomBytes(32).toString('base64url'));
  }

  async hash(password: string): Promise<string> {
    if (password.length === 0) throw new TypeError('Password cannot be empty.');

    return hash(password, { type: argon2id });
  }

  async matches(password: string, passwordHash?: string): Promise<boolean> {
    const hashToVerify = passwordHash ?? (await this.decoyHash);

    try {
      return await verify(hashToVerify, password);
    } catch {
      return false;
    }
  }
}
