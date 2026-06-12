/**
 * Property-Based Tests: RBAC Permission Enforcement
 *
 * Property 5: Unauthorized operations always return 403
 *
 * **Validates: Requirements US-027, NFR-002, NFR-003, EX-008**
 */
import * as fc from 'fast-check';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/common/guards/roles.guard';
// ROLES_KEY imported for reference — used internally by RolesGuard via Reflector
// import { ROLES_KEY } from '../../src/common/decorators/roles.decorator';

// ──────────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────────

/** All system roles */
const SYSTEM_ROLES = [
  'requester',
  'approver_request',
  'call_center',
  'it_reviewer',
  'approver',
  'implementer',
  'auditor',
  'admin',
] as const;

type SystemRole = (typeof SYSTEM_ROLES)[number];

/** Endpoint + allowed roles mapping */
interface EndpointDefinition {
  method: string;
  path: string;
  allowedRoles: SystemRole[];
}

const ENDPOINTS: EndpointDefinition[] = [
  { method: 'POST', path: '/auth/register', allowedRoles: ['admin'] },
  { method: 'POST', path: '/change-requests/:id/assign', allowedRoles: ['call_center', 'admin'] },
  { method: 'POST', path: '/change-requests/:id/submit-for-approval', allowedRoles: ['it_reviewer', 'admin'] },
  { method: 'POST', path: '/change-requests/:id/approve', allowedRoles: ['approver', 'admin'] },
  { method: 'POST', path: '/change-requests/:id/reject', allowedRoles: ['approver', 'admin'] },
  { method: 'POST', path: '/change-requests/:id/implement', allowedRoles: ['implementer', 'admin'] },
  { method: 'POST', path: '/change-requests/:id/verify', allowedRoles: ['it_reviewer', 'admin'] },
  { method: 'POST', path: '/change-requests/:id/close', allowedRoles: ['admin'] },
  { method: 'GET', path: '/change-requests/:id/history', allowedRoles: ['auditor', 'admin'] },
  { method: 'GET', path: '/audit-logs', allowedRoles: ['auditor', 'admin'] },
  { method: 'GET', path: '/workflows', allowedRoles: ['admin'] },
  { method: 'POST', path: '/workflows', allowedRoles: ['admin'] },
  { method: 'GET', path: '/approvals/pending', allowedRoles: ['approver', 'admin'] },
  { method: 'POST', path: '/approvals/post-approve', allowedRoles: ['approver', 'admin'] },
];

// ──────────────────────────────────────────────────────────────────────────────
// Generators
// ──────────────────────────────────────────────────────────────────────────────

/** Random system role */
const roleArb: fc.Arbitrary<SystemRole> = fc.constantFrom(...SYSTEM_ROLES);

/** Random endpoint definition */
const endpointArb: fc.Arbitrary<EndpointDefinition> = fc.constantFrom(...ENDPOINTS);

/** Random role + endpoint combination */
const roleEndpointArb = fc.tuple(roleArb, endpointArb);

// ──────────────────────────────────────────────────────────────────────────────
// Mock Helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Creates a mock ExecutionContext that simulates a request from a user with
 * the given role, hitting an endpoint guarded by the specified allowed roles.
 */
function createMockExecutionContext(
  userRole: string | null,
  requiredRoles: string[] | undefined,
) {
  const mockHandler = jest.fn();
  const mockClass = jest.fn();

  const context = {
    getHandler: () => mockHandler,
    getClass: () => mockClass,
    switchToHttp: () => ({
      getRequest: () => ({
        user: userRole ? { sub: 'test-user-id', email: 'test@dits.co.th', role: userRole } : null,
      }),
    }),
  };

  // Create a Reflector that returns the required roles for the endpoint
  const reflector = new Reflector();
  jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

  return { context, reflector };
}

// ──────────────────────────────────────────────────────────────────────────────
// Property 5: RBAC Permission Enforcement
// ──────────────────────────────────────────────────────────────────────────────

describe('RBAC Permission Enforcement Properties (PBT)', () => {
  describe('Property 5: Unauthorized operations return 403', () => {
    /**
     * **Validates: Requirements US-027, NFR-002, NFR-003, EX-008**
     *
     * For any role + endpoint combination where the role is NOT in the
     * endpoint's allowed roles, RolesGuard must throw ForbiddenException.
     */
    it('RolesGuard denies access for unauthorized role + endpoint combinations', () => {
      fc.assert(
        fc.property(roleEndpointArb, ([role, endpoint]) => {
          const isAllowed = endpoint.allowedRoles.includes(role);

          // Only test unauthorized combinations
          if (isAllowed) return; // skip — covered in the "allows" test

          const { context, reflector } = createMockExecutionContext(
            role,
            endpoint.allowedRoles,
          );

          const guard = new RolesGuard(reflector);

          expect(() => {
            guard.canActivate(context as any);
          }).toThrow(ForbiddenException);
        }),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-027, NFR-002, NFR-003, EX-008**
     *
     * For any role + endpoint combination where the role IS in the
     * endpoint's allowed roles, RolesGuard must allow access (return true).
     */
    it('RolesGuard allows access for authorized role + endpoint combinations', () => {
      fc.assert(
        fc.property(roleEndpointArb, ([role, endpoint]) => {
          const isAllowed = endpoint.allowedRoles.includes(role);

          // Only test authorized combinations
          if (!isAllowed) return; // skip — covered in the "denies" test

          const { context, reflector } = createMockExecutionContext(
            role,
            endpoint.allowedRoles,
          );

          const guard = new RolesGuard(reflector);

          const result = guard.canActivate(context as any);
          expect(result).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-027, NFR-002, NFR-003, EX-008**
     *
     * The admin role must always have access to all restricted endpoints.
     * This is a universal property: admin ∈ allowedRoles for every endpoint.
     */
    it('admin role always has access to all restricted endpoints', () => {
      fc.assert(
        fc.property(endpointArb, (endpoint) => {
          const { context, reflector } = createMockExecutionContext(
            'admin',
            endpoint.allowedRoles,
          );

          const guard = new RolesGuard(reflector);

          const result = guard.canActivate(context as any);
          expect(result).toBe(true);
        }),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-027, NFR-002, NFR-003, EX-008**
     *
     * When no user/role is present on the request, RolesGuard must throw
     * ForbiddenException for any role-restricted endpoint.
     */
    it('RolesGuard denies access when no user role is present', () => {
      fc.assert(
        fc.property(endpointArb, (endpoint) => {
          const { context, reflector } = createMockExecutionContext(
            null, // no user
            endpoint.allowedRoles,
          );

          const guard = new RolesGuard(reflector);

          expect(() => {
            guard.canActivate(context as any);
          }).toThrow(ForbiddenException);
        }),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-027, NFR-002, NFR-003, EX-008**
     *
     * When no @Roles() decorator is present (requiredRoles is undefined/empty),
     * RolesGuard allows access for any authenticated user regardless of role.
     */
    it('RolesGuard allows access to unguarded endpoints for any role', () => {
      fc.assert(
        fc.property(roleArb, (role) => {
          // No @Roles() decorator = undefined/empty required roles
          const { context, reflector } = createMockExecutionContext(
            role,
            undefined, // no roles restriction
          );

          const guard = new RolesGuard(reflector);

          const result = guard.canActivate(context as any);
          expect(result).toBe(true);
        }),
        { numRuns: 200 },
      );
    });
  });
});
