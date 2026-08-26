import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { channelAdapters } from '../src/channels/registry';
import { PERMISSIONS, PERMISSION_DESCRIPTIONS } from '../src/auth/permissions';
import { hashPassword } from '../src/auth/password';
import { ROLES, ROLE_LABELS, ROLE_PERMISSIONS } from '../src/auth/roles';
import {
  DEFAULT_RESOLUTION_TIME_MINUTES,
  DEFAULT_RESPONSE_TIME_MINUTES,
  TICKET_CATEGORIES_PREDEFINED
} from '../src/tickets/types';
import type { TicketCategoryPredefined } from '../src/tickets/types';

/** Display colours for the seeded categories — used by the frontend category chips. */
const TICKET_CATEGORY_COLORS: Record<TicketCategoryPredefined, string> = {
  'Technical Support': '#3b82f6',
  Billing: '#f59e0b',
  'Feature Request': '#8b5cf6',
  'Bug Report': '#ef4444',
  'General Inquiry': '#64748b'
};

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
});

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

  const customer = await prisma.customer.upsert({
    where: { email: 'demo.customer@example.com' },
    update: {},
    create: {
      name: 'Demo Customer',
      email: 'demo.customer@example.com',
      phone: '+1-555-0100',
      company: 'Acme Logistics',
      address: '400 Market Street',
      city: 'San Francisco',
      country: 'USA',
      status: 'ACTIVE'
    }
  });

  // --- Ticket categories. The global list every ticket picks from (Story 13).
  const categoryIdByName = new Map<string, number>();
  for (const name of TICKET_CATEGORIES_PREDEFINED) {
    const category = await prisma.ticketCategory.upsert({
      where: { name },
      update: {},
      create: { name, color: TICKET_CATEGORY_COLORS[name] }
    });
    categoryIdByName.set(name, category.id);
  }

  let ticket = await prisma.ticket.findFirst({
    where: { customerId: customer.id, subject: 'Cannot log in to my account' }
  });
  if (!ticket) {
    ticket = await prisma.ticket.create({
      data: {
        subject: 'Cannot log in to my account',
        status: 'Open',
        priority: 'High',
        categoryId: categoryIdByName.get('Technical Support'),
        customerId: customer.id,
        responseTimeMinutes: DEFAULT_RESPONSE_TIME_MINUTES,
        resolutionTimeMinutes: DEFAULT_RESOLUTION_TIME_MINUTES
      }
    });
  }

  for (const adapter of Object.values(channelAdapters)) {
    const existingInteraction = await prisma.interaction.findFirst({
      where: { customerId: customer.id, channel: adapter.channel }
    });
    if (existingInteraction) continue;

    const message = adapter.simulateInbound({
      subject: 'Login issue',
      body: `Demo ${adapter.channel} message: I cannot log in to my account.`
    });
    await prisma.interaction.create({
      data: { ...message, customerId: customer.id, ticketId: ticket.id }
    });
  }

  // --- Branches ---
  const headOffice = await prisma.branch.upsert({
    where: { code: 'HQ' },
    update: {},
    create: { name: 'Head Office', code: 'HQ' }
  });
  const riyadhBranch = await prisma.branch.upsert({
    where: { code: 'RUH' },
    update: {},
    create: { name: 'Riyadh Branch', code: 'RUH' }
  });

  // --- Departments (unique per branch + name) ---
  const crmOperations = await prisma.department.upsert({
    where: { branchId_name: { branchId: headOffice.id, name: 'CRM Operations' } },
    update: {},
    create: { name: 'CRM Operations', branchId: headOffice.id }
  });
  const headOfficeSupport = await prisma.department.upsert({
    where: { branchId_name: { branchId: headOffice.id, name: 'Customer Support' } },
    update: {},
    create: { name: 'Customer Support', branchId: headOffice.id }
  });
  const riyadhSupport = await prisma.department.upsert({
    where: { branchId_name: { branchId: riyadhBranch.id, name: 'Customer Support' } },
    update: {},
    create: { name: 'Customer Support', branchId: riyadhBranch.id }
  });

  // --- Permissions ---
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: { description: PERMISSION_DESCRIPTIONS[key] },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] }
    });
  }

  // --- Roles and their permissions. ROLE_PERMISSIONS is authoritative: reseeding
  // --- resets any role-permission edits made through the API.
  const roleIdByKey = new Map<string, number>();
  for (const roleKey of ROLES) {
    const role = await prisma.role.upsert({
      where: { key: roleKey },
      update: { name: ROLE_LABELS[roleKey] },
      create: { key: roleKey, name: ROLE_LABELS[roleKey] }
    });
    roleIdByKey.set(roleKey, role.id);

    const permissions = await prisma.permission.findMany({
      where: { key: { in: [...ROLE_PERMISSIONS[roleKey]] } }
    });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id }))
    });
  }

  // --- Demo users: one per role, all sharing the same demo password.
  // --- DEMO ONLY. Never ship this password or this seed to a production database.
  const DEMO_PASSWORD = 'Passw0rd!';
  const demoPasswordHash = await hashPassword(DEMO_PASSWORD);

  const demoUsers = [
    {
      name: 'System Administrator',
      email: 'admin@crm.local',
      roleKey: 'SYSTEM_ADMINISTRATOR',
      branchId: headOffice.id,
      departmentId: crmOperations.id,
      customerId: null
    },
    {
      name: 'CRM Manager',
      email: 'manager@crm.local',
      roleKey: 'CRM_MANAGER',
      branchId: headOffice.id,
      departmentId: crmOperations.id,
      customerId: null
    },
    {
      name: 'Support Supervisor',
      email: 'supervisor@crm.local',
      roleKey: 'SUPPORT_SUPERVISOR',
      branchId: headOffice.id,
      departmentId: headOfficeSupport.id,
      customerId: null
    },
    {
      name: 'Support Agent',
      email: 'agent@crm.local',
      roleKey: 'SUPPORT_AGENT',
      branchId: riyadhBranch.id,
      departmentId: riyadhSupport.id,
      customerId: null
    },
    {
      name: 'Reporting User',
      email: 'reports@crm.local',
      roleKey: 'REPORTING_USER',
      branchId: headOffice.id,
      departmentId: crmOperations.id,
      customerId: null
    },
    {
      name: 'Demo Customer',
      email: 'demo.customer@example.com',
      roleKey: 'CUSTOMER',
      branchId: null,
      departmentId: null,
      customerId: customer.id
    }
  ] as const;

  for (const demoUser of demoUsers) {
    const roleId = roleIdByKey.get(demoUser.roleKey);
    if (roleId === undefined) throw new Error(`Seed error: role ${demoUser.roleKey} was not created`);

    await prisma.user.upsert({
      where: { email: demoUser.email },
      // passwordHash is deliberately absent from `update` so a password changed
      // through the API survives a reseed.
      update: {
        name: demoUser.name,
        roleId,
        branchId: demoUser.branchId,
        departmentId: demoUser.departmentId,
        customerId: demoUser.customerId,
        isActive: true
      },
      create: {
        name: demoUser.name,
        email: demoUser.email,
        passwordHash: demoPasswordHash,
        roleId,
        branchId: demoUser.branchId,
        departmentId: demoUser.departmentId,
        customerId: demoUser.customerId
      }
    });
  }

  const supportAgent = await prisma.user.findUniqueOrThrow({ where: { email: 'agent@crm.local' } });
  const existingNote = await prisma.customerNote.findFirst({ where: { customerId: customer.id } });
  if (!existingNote) {
    await prisma.customerNote.create({
      data: {
        customerId: customer.id,
        authorId: supportAgent.id,
        body: 'Called about the login issue; advised the customer to reset their password via the email on file.'
      }
    });
  }

  // The demo ticket is assigned only once the agent user exists. `assignedToUserId` is
  // deliberately not part of the ticket create above so a reassignment made through the
  // API (Story 14) is not silently reverted on the next reseed.
  if (ticket.assignedToUserId === null) {
    ticket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { assignedToUserId: supportAgent.id }
    });
  }

  // Backfill a demo ticket that was seeded before Story 13 added the workflow/SLA columns.
  // Such a row exists (so the create above was skipped) but has nothing in the new nullable
  // fields, which would leave the demo with no category and no SLA targets to display.
  // Guarded on all three still being null, so this runs once at the migration boundary and
  // never overwrites a category or target an agent has since set through the API.
  if (
    ticket.categoryId === null &&
    ticket.responseTimeMinutes === null &&
    ticket.resolutionTimeMinutes === null
  ) {
    ticket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        priority: 'High',
        categoryId: categoryIdByName.get('Technical Support'),
        responseTimeMinutes: DEFAULT_RESPONSE_TIME_MINUTES,
        resolutionTimeMinutes: DEFAULT_RESOLUTION_TIME_MINUTES
      }
    });
  }

  const existingComment = await prisma.ticketComment.findFirst({ where: { ticketId: ticket.id } });
  if (!existingComment) {
    await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        authorId: supportAgent.id,
        body: 'Reproduced the login failure on staging. Password reset e-mail is not being delivered — escalating to the platform team.'
      }
    });
  }

  // --- Knowledge base. Two categories and three published articles (Story 18) so the
  // search, category filter, and "most read" dashboard panel all have real data to show.
  const KB_SEED = [
    {
      category: 'Getting Started',
      categoryDescription: 'First steps for new customers',
      title: 'How do I raise a support ticket?',
      summary: 'Open a request from the portal and track it through to resolution.',
      body: [
        '# Raising a support ticket',
        '',
        'Sign in and open **My Tickets** from the sidebar. Every request you have raised is',
        'listed there with its current status.',
        '',
        '- **New** and **Open** mean we have your request and it is queued.',
        '- **In Progress** means an agent is actively working on it.',
        '- **Pending** means we are waiting on something from you.',
        '- **Resolved** and **Closed** mean the work is finished.',
        '',
        'Once a request is resolved you can rate it from the ticket page.'
      ].join('\n')
    },
    {
      category: 'Getting Started',
      categoryDescription: 'First steps for new customers',
      title: 'What do the ticket priorities mean?',
      summary: 'Low, Medium, High, and Urgent, and the response time each one targets.',
      body: [
        '# Ticket priorities',
        '',
        'Priority sets the order in which our agents pick work up.',
        '',
        '- **Urgent** — a complete outage or something blocking payment.',
        '- **High** — a major feature is unusable and there is no workaround.',
        '- **Medium** — the default: something is wrong but you can still work.',
        '- **Low** — a question, or a cosmetic problem.',
        '',
        'An agent may re-prioritise a ticket after reading it.'
      ].join('\n')
    },
    {
      category: 'Troubleshooting',
      categoryDescription: 'Fixes for the problems we are asked about most',
      title: 'I cannot sign in to my account',
      summary: 'Password resets, locked accounts, and what to send us if neither helps.',
      body: [
        '# Cannot sign in',
        '',
        '## Reset your password',
        'Use the password reset link on the sign-in screen. The e-mail arrives within a few',
        'minutes — check your spam folder before trying again.',
        '',
        '## Still locked out?',
        'Raise a ticket with the e-mail address on the account and the time of your last',
        'successful sign-in. Never send us your password.'
      ].join('\n')
    }
  ];

  const kbCategoryIdByName = new Map<string, number>();
  for (const entry of KB_SEED) {
    if (kbCategoryIdByName.has(entry.category)) continue;
    const category = await prisma.kbCategory.upsert({
      where: { name: entry.category },
      update: {},
      create: { name: entry.category, description: entry.categoryDescription }
    });
    kbCategoryIdByName.set(entry.category, category.id);
  }

  for (const entry of KB_SEED) {
    const existing = await prisma.kbArticle.findFirst({ where: { title: entry.title } });
    if (existing) continue;
    await prisma.kbArticle.create({
      data: {
        title: entry.title,
        summary: entry.summary,
        body: entry.body,
        categoryId: kbCategoryIdByName.get(entry.category)!,
        isPublished: true,
        authorId: supportAgent.id
      }
    });
  }

  // A second, already-finished ticket so the customer portal (Story 17) has something to rate.
  // The live demo ticket above stays Open on purpose — the portal needs one of each so
  // "track an open ticket" and "rate a closed one" can both be shown.
  let resolvedTicket = await prisma.ticket.findFirst({
    where: { customerId: customer.id, subject: 'Invoice shows the wrong billing address' }
  });
  if (!resolvedTicket) {
    const resolvedAt = new Date();
    resolvedTicket = await prisma.ticket.create({
      data: {
        subject: 'Invoice shows the wrong billing address',
        status: 'Resolved',
        priority: 'Medium',
        categoryId: categoryIdByName.get('Billing'),
        customerId: customer.id,
        assignedToUserId: supportAgent.id,
        responseTimeMinutes: DEFAULT_RESPONSE_TIME_MINUTES,
        resolutionTimeMinutes: DEFAULT_RESOLUTION_TIME_MINUTES,
        respondedAt: resolvedAt,
        resolvedAt
      }
    });
  }

  const existingFeedback = await prisma.ticketFeedback.findUnique({
    where: { ticketId: resolvedTicket.id }
  });
  if (!existingFeedback) {
    await prisma.ticketFeedback.create({
      data: {
        ticketId: resolvedTicket.id,
        customerId: customer.id,
        rating: 5,
        comment: 'Sorted out the same day and the corrected invoice arrived straight away. Thank you!'
      }
    });
  }

  console.log(
    'Seed complete: system_info, 1 customer, 2 tickets (1 open + assigned with 1 comment, ' +
      '1 resolved with 5-star feedback), 5 interactions (one per channel), ' +
      `1 customer note, ${TICKET_CATEGORIES_PREDEFINED.length} ticket categories, ` +
      `${kbCategoryIdByName.size} KB categories, ${KB_SEED.length} published KB articles, 2 branches, 3 departments, ` +
      `${PERMISSIONS.length} permissions, ${ROLES.length} roles, ` +
      `${demoUsers.length} demo users (password: ${DEMO_PASSWORD})`
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
