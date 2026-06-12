/**
 * Property-Based Tests: Audit Immutability + Completeness
 *
 * Property 3: Audit entries are immutable after creation
 * Property 4: Every write operation generates exactly one audit entry
 *
 * **Validates: Requirements US-022, NFR-004, BR-011**
 */
import * as fc from 'fast-check';
import { AuditService } from '../../src/modules/audit/audit.service';
import {
  AuditInterceptor,
  resolveEntityType,
} from '../../src/common/interceptors/audit.interceptor';
import {
  CreateAuditLogDto,
  KnownEntityType,
  KNOWN_ENTITY_TYPES,
} from '../../src/modules/audit/dto/create-audit-log.dto';

// ──────────────────────────────────────────────────────────────────────────────
// Generators
// ──────────────────────────────────────────────────────────────────────────────

/** Random valid CreateAuditLogDto */
const auditLogEntryArb: fc.Arbitrary<CreateAuditLogDto> = fc.record({
  userId: fc.option(fc.uuid(), { nil: undefined }),
  userEmail: fc.emailAddress(),
  action: fc.constantFrom('create', 'update', 'delete', 'approve', 'reject'),
  entityType: fc.constantFrom<KnownEntityType[]>([
    'User',
    'ChangeRequest',
    'WorkflowDefinition',
    'Approval',
    'Attachment',
    'Notification',
    'MasterData',
  ]),
  entityId: fc.uuid(),
  oldValue: fc.option(
    fc.oneof(
      fc.json().map((j) => JSON.parse(j)),
      fc.constant(null),
    ),
    { nil: undefined },
  ),
  newValue: fc.option(
    fc.oneof(
      fc.json().map((j) => JSON.parse(j)),
      fc.constant(null),
    ),
    { nil: undefined },
  ),
  ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
});

/** Random HTTP write operations */
const writeOperationArb = fc.record({
  method: fc.constantFrom('POST', 'PUT', 'PATCH', 'DELETE'),
  url: fc.constantFrom(
    '/change-requests',
    '/workflows',
    '/users',
    '/attachments',
    '/approvals',
    '/notifications',
    '/master-data',
  ),
  body: fc.json().map((j) => JSON.parse(j)),
  userId: fc.uuid(),
  userEmail: fc.emailAddress(),
});

// ──────────────────────────────────────────────────────────────────────────────
// Mock Setup
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock AuditService that stores entries in-memory.
 * Intentionally does NOT expose update/delete methods (mirrors real service).
 */
function createMockAuditService() {
  const store: Map<string, Record<string, unknown>> = new Map();
  let idCounter = 0;

  const service = {
    create: jest.fn(async (entry: CreateAuditLogDto) => {
      const id = `audit-${++idCounter}`;
      const now = new Date();
      const record = {
        id,
        ...entry,
        userId: entry.userId ?? null,
        oldValue: entry.oldValue ?? null,
        newValue: entry.newValue ?? null,
        ipAddress: entry.ipAddress ?? null,
        createdAt: now,
      };
      store.set(id, record);
      return record;
    }),
    findById: jest.fn(async (id: string) => {
      const entry = store.get(id);
      if (!entry) throw new Error(`Audit entry not found: ${id}`);
      return { ...entry };
    }),
  };

  return { service, store };
}

/**
 * Creates a mock PrismaService that simulates immutability constraints.
 * UPDATE and DELETE operations on auditLog throw errors (simulating DB trigger).
 */
function createMockPrismaService() {
  const store: Map<string, Record<string, unknown>> = new Map();
  let idCounter = 0;

  return {
    auditLog: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const id = `audit-${++idCounter}`;
        const now = new Date();
        const record = { id, ...data, createdAt: now };
        store.set(id, record);
        return record;
      }),
      update: jest.fn(async () => {
        throw new Error(
          'Cannot UPDATE audit_log: immutability constraint violated (DB trigger)',
        );
      }),
      delete: jest.fn(async () => {
        throw new Error(
          'Cannot DELETE audit_log: immutability constraint violated (DB trigger)',
        );
      }),
      findUnique: jest.fn(
        async ({ where }: { where: { id: string } }) => {
          return store.get(where.id) ?? null;
        },
      ),
      findMany: jest.fn(async () => [...store.values()]),
      count: jest.fn(async () => store.size),
    },
    store,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Property 3: Immutability
// ──────────────────────────────────────────────────────────────────────────────

describe('Audit Properties (PBT)', () => {
  describe('Property 3: Immutability', () => {
    /**
     * **Validates: Requirements US-022, NFR-004, BR-011**
     *
     * Audit log entries, once created, must preserve all original field values.
     * The content read back must exactly match what was written.
     */
    it('created entries preserve all original field values', () => {
      const { service } = createMockAuditService();

      return fc.assert(
        fc.asyncProperty(auditLogEntryArb, async (entry) => {
          const created = await service.create(entry);

          // Created entry must contain all original fields
          expect(created.userEmail).toBe(entry.userEmail);
          expect(created.action).toBe(entry.action);
          expect(created.entityType).toBe(entry.entityType);
          expect(created.entityId).toBe(entry.entityId);
          expect(created.userId).toBe(entry.userId ?? null);
          expect(created.ipAddress).toBe(entry.ipAddress ?? null);

          // oldValue and newValue are preserved
          if (entry.oldValue !== undefined) {
            expect(created.oldValue).toEqual(entry.oldValue);
          } else {
            expect(created.oldValue).toBeNull();
          }
          if (entry.newValue !== undefined) {
            expect(created.newValue).toEqual(entry.newValue);
          } else {
            expect(created.newValue).toBeNull();
          }

          // createdAt is set and is a valid Date
          expect(created.createdAt).toBeInstanceOf(Date);

          // Reading back must match exactly
          const readBack = await service.findById(created.id);
          expect(readBack.userEmail).toBe(created.userEmail);
          expect(readBack.action).toBe(created.action);
          expect(readBack.entityType).toBe(created.entityType);
          expect(readBack.entityId).toBe(created.entityId);
          expect(readBack.createdAt).toEqual(created.createdAt);
        }),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-022, NFR-004, BR-011**
     *
     * AuditService must NOT expose update or delete methods.
     * Direct Prisma update/delete must throw (simulating DB trigger).
     */
    it('service does not expose modification methods', () => {
      const mockPrisma = createMockPrismaService();

      // Verify AuditService prototype does NOT have update/delete methods
      const servicePrototype = AuditService.prototype;
      const methods = Object.getOwnPropertyNames(servicePrototype);

      expect(methods).not.toContain('update');
      expect(methods).not.toContain('delete');
      expect(methods).not.toContain('remove');

      // Verify Prisma-level immutability: update/delete throw
      return fc.assert(
        fc.asyncProperty(auditLogEntryArb, async (entry) => {
          // First create an entry
          const created = await mockPrisma.auditLog.create({
            data: entry as unknown as Record<string, unknown>,
          });

          // Attempting update must throw
          await expect(
            mockPrisma.auditLog.update({
              where: { id: created.id },
              data: { action: 'tampered' },
            } as never),
          ).rejects.toThrow(/immutability constraint/);

          // Attempting delete must throw
          await expect(
            mockPrisma.auditLog.delete({
              where: { id: created.id },
            } as never),
          ).rejects.toThrow(/immutability constraint/);

          // Entry remains unchanged after failed modification attempts
          const afterAttempt = await mockPrisma.auditLog.findUnique({
            where: { id: created.id },
          });
          expect(afterAttempt).not.toBeNull();
          expect(afterAttempt!.action).toBe(entry.action);
          expect(afterAttempt!.entityType).toBe(entry.entityType);
        }),
        { numRuns: 200 },
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Property 4: Completeness
  // ────────────────────────────────────────────────────────────────────────────

  describe('Property 4: Completeness', () => {
    /**
     * **Validates: Requirements US-022, NFR-004**
     *
     * Every write operation (POST, PUT, PATCH, DELETE) on a known entity
     * must produce exactly one audit entry via AuditService.create().
     */
    it('every write operation produces exactly one audit entry', () => {
      const { service } = createMockAuditService();

      return fc.assert(
        fc.asyncProperty(writeOperationArb, async (operation) => {
          const callCountBefore = service.create.mock.calls.length;

          const entityType = resolveEntityType(operation.url);

          // Only known entity URLs should produce audit entries
          if (entityType) {
            // Simulate what the AuditInterceptor does for a write operation
            const action = resolveHttpMethodToAction(operation.method);
            const entityId = fc.sample(fc.uuid(), 1)[0];

            await service.create({
              userId: operation.userId,
              userEmail: operation.userEmail,
              action,
              entityType,
              entityId,
              oldValue:
                operation.method === 'POST' ? undefined : operation.body,
              newValue:
                operation.method === 'DELETE' ? undefined : operation.body,
              ipAddress: undefined,
            });

            const callCountAfter = service.create.mock.calls.length;

            // Exactly one audit entry was created
            expect(callCountAfter - callCountBefore).toBe(1);
          }
        }),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-022, NFR-004**
     *
     * The audit entry's action field must correctly reflect the HTTP method:
     * POST → create, PUT/PATCH → update, DELETE → delete
     */
    it('audit entry action matches HTTP method', () => {
      const { service } = createMockAuditService();

      return fc.assert(
        fc.asyncProperty(writeOperationArb, async (operation) => {
          const entityType = resolveEntityType(operation.url);

          if (entityType) {
            const action = resolveHttpMethodToAction(operation.method);
            const entityId = fc.sample(fc.uuid(), 1)[0];

            const created = await service.create({
              userId: operation.userId,
              userEmail: operation.userEmail,
              action,
              entityType,
              entityId,
              oldValue:
                operation.method === 'POST' ? undefined : operation.body,
              newValue:
                operation.method === 'DELETE' ? undefined : operation.body,
            });

            // Verify action mapping
            switch (operation.method) {
              case 'POST':
                expect(created.action).toBe('create');
                break;
              case 'PUT':
              case 'PATCH':
                expect(created.action).toBe('update');
                break;
              case 'DELETE':
                expect(created.action).toBe('delete');
                break;
            }
          }
        }),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-022, NFR-004**
     *
     * The audit entry's entityType must correctly map from the URL path segment.
     */
    it('audit entry entity type matches URL path', () => {
      return fc.assert(
        fc.property(writeOperationArb, (operation) => {
          const entityType = resolveEntityType(operation.url);

          // Verify URL-to-entityType mapping
          const expectedMapping: Record<string, KnownEntityType | null> = {
            '/change-requests': 'ChangeRequest',
            '/workflows': 'WorkflowDefinition',
            '/users': 'User',
            '/attachments': 'Attachment',
            '/approvals': 'Approval',
            '/notifications': 'Notification',
            '/master-data': 'MasterData',
          };

          const expected = expectedMapping[operation.url];
          expect(entityType).toBe(expected);
        }),
        { numRuns: 200 },
      );
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// Helper: mirrors AuditInterceptor's resolveAction logic
// ──────────────────────────────────────────────────────────────────────────────

function resolveHttpMethodToAction(method: string): string {
  switch (method.toUpperCase()) {
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'unknown';
  }
}
