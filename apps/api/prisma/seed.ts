// prisma/seed.ts
import {
  PrismaClient,
  PriorityLevel,
  UserRole,
  EscalationNotifyRole,
  SlaType,
} from '@prisma/client';
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

// bcrypt hash of "password"
const DEFAULT_PASSWORD_HASH =
  '$2b$10$jXykLq8p2eKYgKRhl0W5.uKLMF91.Nl2FbDXeNA83TnI98w9XAjoS';

async function main() {
  console.log('🌱 Seeding database...');

  // ─── SLA Policies ────────────────────────────────────────────────────────────
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

  // ─── Ticket Categories ────────────────────────────────────────────────────────
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

  // ─── Base Department (required for DepartmentHead) ────────────────────────────
  console.log('🏢 Seeding base department...');
  const itDepartment = await prisma.department.upsert({
    where: { id: 'dept_it' },
    update: {},
    create: {
      id: 'dept_it',
      name: 'IT Department',
    },
  });
  console.log(`  ✅ Department: ${itDepartment.name}`);

  // ─── Base Users ───────────────────────────────────────────────────────────────
  console.log('👤 Seeding base users...');

  const baseUsers = [
    {
      id: 'user_admin',
      email: 'admin@admin.com',
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.Admin,
      departmentId: null,
    },
    {
      id: 'user_it_staff',
      email: 'itstaff@itstaff.com',
      firstName: 'IT',
      lastName: 'Staff',
      role: UserRole.ItStaff,
      departmentId: itDepartment.id,
    },
    {
      id: 'user_employee',
      email: 'employee@employee.com',
      firstName: 'Sample',
      lastName: 'Employee',
      role: UserRole.Employee,
      departmentId: itDepartment.id,
    },
    {
      id: 'user_dept_head',
      email: 'departmenthead@departmenthead.com',
      firstName: 'Department',
      lastName: 'Head',
      role: UserRole.DepartmentHead,
      departmentId: itDepartment.id,
    },
  ];

  for (const user of baseUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        id: user.id,
        email: user.email,
        passwordHash: DEFAULT_PASSWORD_HASH,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId,
        isActive: true,
      },
    });
    console.log(`  ✅ User: ${user.email} (${user.role})`);
  }

  // Assign the DepartmentHead user as the head of the IT department
  await prisma.department.update({
    where: { id: itDepartment.id },
    data: { headUserId: 'user_dept_head' },
  });
  console.log(`  🔗 Linked department head to IT Department`);

  // ─── Escalation Rules ─────────────────────────────────────────────────────────
  console.log('🚨 Seeding escalation rules...');

  const escalationRules = [
    // ── Critical ──────────────────────────────────────────────────────────────
    // Ack SLA = 15 min → L1 notify IT staff-level (admin) at 50%, L2 at 100%
    {
      priorityLevel: PriorityLevel.Critical,
      slaType: SlaType.Acknowledgement,
      escalationLevel: 1,
      triggerAfterMinutes: 8,
      notifyRole: EscalationNotifyRole.Admin,
    },
    {
      priorityLevel: PriorityLevel.Critical,
      slaType: SlaType.Acknowledgement,
      escalationLevel: 2,
      triggerAfterMinutes: 15,
      notifyRole: EscalationNotifyRole.DepartmentHead,
    },
    // Res SLA = 240 min → L1 at 50% (120), L2 at 75% (180), L3 at 100% (240)
    {
      priorityLevel: PriorityLevel.Critical,
      slaType: SlaType.Resolution,
      escalationLevel: 1,
      triggerAfterMinutes: 120,
      notifyRole: EscalationNotifyRole.Admin,
    },
    {
      priorityLevel: PriorityLevel.Critical,
      slaType: SlaType.Resolution,
      escalationLevel: 2,
      triggerAfterMinutes: 180,
      notifyRole: EscalationNotifyRole.DepartmentHead,
    },
    {
      priorityLevel: PriorityLevel.Critical,
      slaType: SlaType.Resolution,
      escalationLevel: 3,
      triggerAfterMinutes: 240,
      notifyRole: EscalationNotifyRole.DepartmentHead,
    },

    // ── High ──────────────────────────────────────────────────────────────────
    // Ack SLA = 30 min
    {
      priorityLevel: PriorityLevel.High,
      slaType: SlaType.Acknowledgement,
      escalationLevel: 1,
      triggerAfterMinutes: 15,
      notifyRole: EscalationNotifyRole.Admin,
    },
    {
      priorityLevel: PriorityLevel.High,
      slaType: SlaType.Acknowledgement,
      escalationLevel: 2,
      triggerAfterMinutes: 30,
      notifyRole: EscalationNotifyRole.DepartmentHead,
    },
    // Res SLA = 480 min
    {
      priorityLevel: PriorityLevel.High,
      slaType: SlaType.Resolution,
      escalationLevel: 1,
      triggerAfterMinutes: 240,
      notifyRole: EscalationNotifyRole.Admin,
    },
    {
      priorityLevel: PriorityLevel.High,
      slaType: SlaType.Resolution,
      escalationLevel: 2,
      triggerAfterMinutes: 360,
      notifyRole: EscalationNotifyRole.DepartmentHead,
    },
    {
      priorityLevel: PriorityLevel.High,
      slaType: SlaType.Resolution,
      escalationLevel: 3,
      triggerAfterMinutes: 480,
      notifyRole: EscalationNotifyRole.DepartmentHead,
    },

    // ── Medium ────────────────────────────────────────────────────────────────
    // Ack SLA = 60 min
    {
      priorityLevel: PriorityLevel.Medium,
      slaType: SlaType.Acknowledgement,
      escalationLevel: 1,
      triggerAfterMinutes: 30,
      notifyRole: EscalationNotifyRole.Admin,
    },
    {
      priorityLevel: PriorityLevel.Medium,
      slaType: SlaType.Acknowledgement,
      escalationLevel: 2,
      triggerAfterMinutes: 60,
      notifyRole: EscalationNotifyRole.DepartmentHead,
    },
    // Res SLA = 1440 min (24h)
    {
      priorityLevel: PriorityLevel.Medium,
      slaType: SlaType.Resolution,
      escalationLevel: 1,
      triggerAfterMinutes: 720,
      notifyRole: EscalationNotifyRole.Admin,
    },
    {
      priorityLevel: PriorityLevel.Medium,
      slaType: SlaType.Resolution,
      escalationLevel: 2,
      triggerAfterMinutes: 1080,
      notifyRole: EscalationNotifyRole.DepartmentHead,
    },

    // ── Low ───────────────────────────────────────────────────────────────────
    // Ack SLA = 240 min
    {
      priorityLevel: PriorityLevel.Low,
      slaType: SlaType.Acknowledgement,
      escalationLevel: 1,
      triggerAfterMinutes: 120,
      notifyRole: EscalationNotifyRole.Admin,
    },
    {
      priorityLevel: PriorityLevel.Low,
      slaType: SlaType.Acknowledgement,
      escalationLevel: 2,
      triggerAfterMinutes: 240,
      notifyRole: EscalationNotifyRole.DepartmentHead,
    },
    // Res SLA = 2880 min (48h)
    {
      priorityLevel: PriorityLevel.Low,
      slaType: SlaType.Resolution,
      escalationLevel: 1,
      triggerAfterMinutes: 1440,
      notifyRole: EscalationNotifyRole.Admin,
    },
    {
      priorityLevel: PriorityLevel.Low,
      slaType: SlaType.Resolution,
      escalationLevel: 2,
      triggerAfterMinutes: 2880,
      notifyRole: EscalationNotifyRole.DepartmentHead,
    },
  ];

  for (const rule of escalationRules) {
    await prisma.escalationRule.create({ data: rule });
    console.log(
      `  ✅ Escalation Rule: ${rule.priorityLevel} / ${rule.slaType} / L${rule.escalationLevel} → ${rule.notifyRole} at ${rule.triggerAfterMinutes}min`,
    );
  }

  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('📝 Seeded credentials (password: "password" for all):');
  console.log('   admin@admin.com               → Admin');
  console.log('   itstaff@itstaff.com           → IT Staff');
  console.log('   employee@employee.com         → Employee');
  console.log('   departmenthead@departmenthead.com → Department Head');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
