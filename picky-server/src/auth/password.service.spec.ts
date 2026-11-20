import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes with a verifiable Argon2id digest', async () => {
    const encoded = await service.hash('correct horse battery staple');

    expect(encoded.startsWith('$argon2id$')).toBe(true);
    await expect(
      service.verify(encoded, 'correct horse battery staple'),
    ).resolves.toBe(true);
    await expect(service.verify(encoded, 'wrong password')).resolves.toBe(
      false,
    );
  });

  it('runs a dummy Argon2 verification for unknown accounts', async () => {
    await expect(service.verifyDummy('unknown-account-password')).resolves.toBe(
      undefined,
    );
  });
});
