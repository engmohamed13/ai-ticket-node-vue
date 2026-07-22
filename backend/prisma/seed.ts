import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    console.log(`User with email ${email} already exists. Skipping seed.`);
    process.exit(0);
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash('Password123!', saltRounds);

  await prisma.user.create({
    data: {
      name: 'Admin',
      email,
      passwordHash
    }
  });

  console.log(`Successfully created default admin user: ${email}`);
}

main()
  .catch((e) => {
    console.error('An error occurred during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
