// prisma/seed.ts
import { PrismaClient, PriorityLevel } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import 'dotenv/config';

const dbUrl = process.env['DATABASE_URL'];

if (!dbUrl) {
  throw new Error('DATABASE_URL is missing');
}

const url = new URL(dbUrl);
const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
});

const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

async function main() {
  console.log('🌱 Seeding database...');

  // Seed SLA Policies
  console.log('📋 Seeding SLA policies...');
  const slaPolicies = [
    {
      priorityLevel: PriorityLevel.Critical,
      acknowledgementMinutes: 15,
      resolutionMinutes: 240,
    },
    {
      priorityLevel: PriorityLevel.High,
      acknowledgementMinutes: 30,
      resolutionMinutes: 480,
    },
    {
      priorityLevel: PriorityLevel.Medium,
      acknowledgementMinutes: 60,
      resolutionMinutes: 1440,
    },
    {
      priorityLevel: PriorityLevel.Low,
      acknowledgementMinutes: 240,
      resolutionMinutes: 2880,
    },
  ];

  for (const policy of slaPolicies) {
    await prisma.slaPolicy.upsert({
      where: { priorityLevel: policy.priorityLevel },
      update: {},
      create: policy,
    });
    console.log(
      `  ✅ SLA Policy: ${policy.priorityLevel} (Ack: ${policy.acknowledgementMinutes}min, Res: ${policy.resolutionMinutes}min)`,
    );
  }

  // Seed Ticket Categories (optional but recommended)
  console.log('📂 Seeding ticket categories...');
  const categories = [
    {
      name: 'Hardware',
      description:
        'Issues with physical devices like laptops, desktops, printers, monitors',
    },
    {
      name: 'Software',
      description:
        'Issues with applications, operating systems, or software installations',
    },
    {
      name: 'Network',
      description: 'Issues with internet, VPN, Wi-Fi, or network connectivity',
    },
    {
      name: 'Access',
      description:
        'Password resets, permission requests, or account access issues',
    },
    {
      name: 'Email',
      description: 'Issues with email sending, receiving, or configuration',
    },
    {
      name: 'Security',
      description:
        'Security incidents, suspicious activity, or compliance concerns',
    },
    {
      name: 'Other',
      description: 'Issues that do not fit into other categories',
    },
  ];

  for (const category of categories) {
    await prisma.ticketCategory.upsert({
      where: { id: category.name.toLowerCase().replace(/\s/g, '_') },
      update: {},
      create: {
        id: category.name.toLowerCase().replace(/\s/g, '_'),
        name: category.name,
        description: category.description,
        isActive: true,
      },
    });
    console.log(`  ✅ Category: ${category.name}`);
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
