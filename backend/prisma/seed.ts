import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';

  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash('Password123!', saltRounds);

    user = await prisma.user.create({
      data: {
        name: 'Admin',
        email,
        passwordHash
      }
    });
    console.log(`Successfully created default admin user: ${email}`);
  } else {
    console.log(`Admin user ${email} already exists.`);
  }

  // Add demo tickets if none exist
  const ticketCount = await prisma.ticket.count();
  if (ticketCount === 0) {
    console.log('Creating demo tickets and comments...');
    
    // Ticket 1: Open
    await prisma.ticket.create({
      data: {
        title: 'Login screen styling alignment mismatch',
        description: 'The EN/Arabic language switcher buttons on the login dashboard overlap slightly on screen resolutions under 360px.',
        status: 'Open',
        priority: 'Medium',
        createdBy: user.id
      }
    });

    // Ticket 2: In Progress
    const ticket2 = await prisma.ticket.create({
      data: {
        title: 'Database migration failing on Postgres 16',
        description: 'Encountered relation already exists errors when running npx prisma migrate dev on fresh PostgreSQL v16.3 instances. Need to check migration lock.',
        status: 'In Progress',
        priority: 'High',
        createdBy: user.id
      }
    });

    // Add comment to Ticket 2
    await prisma.comment.create({
      data: {
        ticketId: ticket2.id,
        content: 'I noticed this happens because of directory permission issues in Windows environments. Using admin command line fixes it temporarily.',
        createdBy: user.id
      }
    });

    // Ticket 3: Closed
    const ticket3 = await prisma.ticket.create({
      data: {
        title: 'Add support for JWT token refresh cycles',
        description: 'Access tokens expire after 1 hour, causing user session lockouts. We need to implement httpOnly cookie-based refresh tokens for seamless session renewals.',
        status: 'Closed',
        priority: 'Low',
        createdBy: user.id
      }
    });

    // Add comment to Ticket 3
    await prisma.comment.create({
      data: {
        ticketId: ticket3.id,
        content: 'Implemented and documented under the roadmap section of the repository README.',
        createdBy: user.id
      }
    });

    console.log('Successfully created demo tickets and comments.');
  } else {
    console.log('Tickets already exist. Skipping demo data creation.');
  }
}

main()
  .catch((e) => {
    console.error('An error occurred during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

