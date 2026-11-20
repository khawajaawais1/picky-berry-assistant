import { Injectable } from '@nestjs/common';
import { hash, Options, verify } from 'argon2';
import { randomBytes } from 'node:crypto';

const passwordOptions: Options = {
  type: 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class PasswordService {
  private readonly dummyHash = hash(
    randomBytes(32).toString('base64url'),
    passwordOptions,
  );

  hash(password: string): Promise<string> {
    return hash(password, passwordOptions);
  }

  verify(passwordHash: string, password: string): Promise<boolean> {
    return verify(passwordHash, password);
  }

  async verifyDummy(password: string): Promise<void> {
    await verify(await this.dummyHash, password);
  }
}
