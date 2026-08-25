import { prisma } from '../src/db/prisma';

const main = async (): Promise<void> => {
  await prisma.systemInfo.upsert({
    where: { key: 'schemaVersion' },
    update: { value: '1' },
    create: { key: 'schemaVersion', value: '1' }
  });
  await prisma.systemInfo.upsert({
    where: { key: 'appName' },
    update: { value: 'CustomerSupportCRM' },
    create: { key: 'appName', value: 'CustomerSupportCRM' }
  });
  console.log('Seed complete: system_info');
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
