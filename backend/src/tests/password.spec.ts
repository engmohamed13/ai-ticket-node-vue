import { hashPassword, verifyPassword } from '../auth/password';

describe('Password hashing', () => {
  jest.setTimeout(10_000);

  it('hashPassword produces a non-plain string longer than 20 characters', async () => {
    const hash = await hashPassword('Passw0rd!');
    expect(hash).not.toBe('Passw0rd!');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifyPassword resolves true for a correct password', async () => {
    const plain = 'Passw0rd!';
    const hash = await hashPassword(plain);
    const result = await verifyPassword(plain, hash);
    expect(result).toBe(true);
  });

  it('verifyPassword resolves false for an incorrect password', async () => {
    const plain = 'Passw0rd!';
    const hash = await hashPassword(plain);
    const result = await verifyPassword('wrong', hash);
    expect(result).toBe(false);
  });

  it('two hashPassword calls with the same input produce different hashes', async () => {
    const plain = 'Passw0rd!';
    const hash1 = await hashPassword(plain);
    const hash2 = await hashPassword(plain);
    expect(hash1).not.toBe(hash2);
  });
});
