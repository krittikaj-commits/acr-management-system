import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── 1. Seed Roles ────────────────────────────────────────────────────────────

  const roles = [
    {
      name: 'requester',
      permissions: {
        changeRequest: ['create', 'read_own', 'update_own'],
        attachment: ['upload', 'download_own'],
        notification: ['read_own'],
      },
    },
    {
      name: 'approver_request',
      permissions: {
        changeRequest: ['read_assigned'],
        approval: ['approve', 'reject'],
        notification: ['read_own'],
      },
    },
    {
      name: 'call_center',
      permissions: {
        changeRequest: ['read_all', 'assign'],
        notification: ['read_own'],
      },
    },
    {
      name: 'it_reviewer',
      permissions: {
        changeRequest: ['read_assigned', 'update_assigned', 'submit_for_approval'],
        attachment: ['upload', 'download'],
        notification: ['read_own'],
      },
    },
    {
      name: 'approver',
      permissions: {
        changeRequest: ['read_all'],
        approval: ['approve', 'reject'],
        notification: ['read_own'],
      },
    },
    {
      name: 'implementer',
      permissions: {
        changeRequest: ['read_assigned', 'update_implementation'],
        attachment: ['upload', 'download'],
        notification: ['read_own'],
      },
    },
    {
      name: 'auditor',
      permissions: {
        changeRequest: ['read_all'],
        auditLog: ['read_all'],
        attachment: ['download'],
        reporting: ['view', 'export'],
        notification: ['read_own'],
      },
    },
    {
      name: 'admin',
      permissions: {
        changeRequest: ['create', 'read_all', 'update_all', 'delete'],
        approval: ['approve', 'reject'],
        user: ['create', 'read_all', 'update_all', 'deactivate'],
        role: ['read_all'],
        workflow: ['create', 'read_all', 'update', 'activate', 'deactivate'],
        masterData: ['create', 'read_all', 'update', 'deactivate'],
        auditLog: ['read_all'],
        attachment: ['upload', 'download', 'delete'],
        reporting: ['view', 'export'],
        notification: ['read_all'],
      },
    },
  ];

  const createdRoles: Record<string, string> = {};

  for (const role of roles) {
    const upserted = await prisma.role.upsert({
      where: { name: role.name },
      update: { permissions: role.permissions },
      create: {
        name: role.name,
        permissions: role.permissions,
      },
    });
    createdRoles[role.name] = upserted.id;
    console.log(`  ✓ Role: ${role.name}`);
  }

  // ─── 2. Seed Admin User ───────────────────────────────────────────────────────

  const adminEmail = 'admin@dits.co.th';
  const adminPassword = 'Admin@123!';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      position: 'System Administrator',
      roleId: createdRoles['admin'],
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash,
      firstName: 'System',
      lastName: 'Admin',
      position: 'System Administrator',
      roleId: createdRoles['admin'],
      isActive: true,
    },
  });

  console.log(`  ✓ Admin user: ${adminEmail}`);

  // ─── 3. Seed Default Workflow Definition ──────────────────────────────────────

  const existingWorkflow = await prisma.workflowDefinition.findFirst({
    where: { isDefault: true },
  });

  if (!existingWorkflow) {
    const workflow = await prisma.workflowDefinition.create({
      data: {
        name: 'Default Change Request Workflow',
        versionNumber: 1,
        isActive: true,
        isDefault: true,
        metadata: {
          description: 'Standard workflow for normal change requests',
          supportedChangeTypes: ['normal', 'emergency'],
        },
        createdById: adminUser.id,
      },
    });

    // Create workflow steps in order
    const stepsData = [
      {
        name: 'Draft',
        stepType: 'start',
        assignedRole: 'requester',
        requiredFields: ['changeType', 'impactLevel', 'affectedService', 'description', 'requesterName', 'requesterEmail'],
        sortOrder: 1,
      },
      {
        name: 'Submitted',
        stepType: 'review',
        assignedRole: 'call_center',
        requiredFields: ['assignedToId'],
        sortOrder: 2,
      },
      {
        name: 'IT Review',
        stepType: 'review',
        assignedRole: 'it_reviewer',
        requiredFields: ['impactAnalysis', 'riskAssessment', 'implementationPlan', 'rolloutPlan', 'rollbackPlan'],
        sortOrder: 3,
      },
      {
        name: 'Approval',
        stepType: 'approval',
        assignedRole: 'approver',
        requiredFields: [],
        sortOrder: 4,
      },
      {
        name: 'Implementation',
        stepType: 'implementation',
        assignedRole: 'implementer',
        requiredFields: ['testResult', 'versionBefore', 'versionAfter'],
        sortOrder: 5,
      },
      {
        name: 'Verification',
        stepType: 'verification',
        assignedRole: 'it_reviewer',
        requiredFields: ['verificationResult'],
        sortOrder: 6,
      },
      {
        name: 'Closed',
        stepType: 'end',
        assignedRole: 'admin',
        requiredFields: [],
        sortOrder: 7,
      },
    ];

    // Create steps
    const createdSteps: Record<string, string> = {};

    for (const stepData of stepsData) {
      const step = await prisma.workflowStep.create({
        data: {
          workflowDefinitionId: workflow.id,
          name: stepData.name,
          stepType: stepData.stepType,
          assignedRole: stepData.assignedRole,
          requiredFields: stepData.requiredFields,
          sortOrder: stepData.sortOrder,
        },
      });
      createdSteps[stepData.name] = step.id;
      console.log(`  ✓ Workflow step: ${stepData.name}`);
    }

    // Link steps via defaultNextStepId
    const stepLinks: [string, string][] = [
      ['Draft', 'Submitted'],
      ['Submitted', 'IT Review'],
      ['IT Review', 'Approval'],
      ['Approval', 'Implementation'],
      ['Implementation', 'Verification'],
      ['Verification', 'Closed'],
    ];

    for (const [fromName, toName] of stepLinks) {
      await prisma.workflowStep.update({
        where: { id: createdSteps[fromName] },
        data: { defaultNextStepId: createdSteps[toName] },
      });
    }

    // Create workflow conditions (example: emergency change skips approval)
    await prisma.workflowCondition.create({
      data: {
        workflowDefinitionId: workflow.id,
        fromStepId: createdSteps['IT Review'],
        toStepId: createdSteps['Implementation'],
        fieldName: 'changeType',
        operator: 'equals',
        value: 'emergency',
        priority: 1,
      },
    });

    console.log('  ✓ Workflow condition: Emergency skips Approval');
    console.log(`  ✓ Default workflow created: "${workflow.name}"`);
  } else {
    console.log('  ⏭ Default workflow already exists, skipping...');
  }

  console.log('\n✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
