import { Injectable } from '@nestjs/common';
import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(pbkdf2);

const HASH_PREFIX = 'pbkdf2_sha256';
const ITERATIONS = 120_000;
const KEY_LENGTH = 32;
const DIGEST = 'sha256';

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('base64url');
    const derived = await pbkdf2Async(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
    return `${HASH_PREFIX}$${ITERATIONS}$${salt}$${derived.toString('base64url')}`;
  }

  async verify(password: string, storedHash: string): Promise<boolean> {
    const [prefix, iterationsRaw, salt, digest] = storedHash.split('$');
    if (prefix !== HASH_PREFIX || !iterationsRaw || !salt || !digest) {
      return false;
    }

    const iterations = Number(iterationsRaw);
    if (!Number.isInteger(iterations) || iterations < 1) {
      return false;
    }

    const expected = Buffer.from(digest, 'base64url');
    const actual = await pbkdf2Async(password, salt, iterations, expected.length, DIGEST);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
