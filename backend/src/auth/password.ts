import bcrypt from 'bcryptjs';

/** 10 rounds ≈ 60 ms per hash on the target hardware — enough work factor without slowing the demo login. */
const SALT_ROUNDS = 10;

export const hashPassword = (plain: string): Promise<string> => bcrypt.hash(plain, SALT_ROUNDS);

export const verifyPassword = (plain: string, passwordHash: string): Promise<boolean> =>
  bcrypt.compare(plain, passwordHash);
