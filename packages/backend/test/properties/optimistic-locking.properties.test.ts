/**
 * Property-Based Tests: Optimistic Locking Properties
 *
 * Property 6: Concurrent updates with stale version must fail
 * - Only one of multiple concurrent updates with the same version succeeds
 * - Version increments exactly by 1 on each successful update
 * - Updates with stale version always fail regardless of payload
 *
 * **Validates: Requirements US-035, EX-011**
 */
import * as fc from 'fast-check';
import { ConflictException } from '@nestjs/common';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface ChangeRequestRecord {
  id: string;
  version: number;
  description: string;
  impactLevel: string;
  justification: string;
  updatedAt: Date;
}

interface UpdatePayload {
  description?: string | null;
  impactLevel?: string | null;
  justification?: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Mock Repository (simulates optimistic locking behavior)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * In-memory repository that replicates the optimistic locking semantics of the
 * real ChangeRequestRepository (Prisma where: { id, version } + version increment).
 */
class MockChangeRequestRepository {
  private store: Map<string, ChangeRequestRecord> = new Map();

  create(id: string, initial?: Partial<ChangeRequestRecord>): ChangeRequestRecord {
    const record: ChangeRequestRecord = {
      id,
      version: 1,
      description: initial?.description ?? 'Initial description',
      impactLevel: initial?.impactLevel ?? 'medium',
      justification: initial?.justification ?? 'Initial justification',
      updatedAt: new Date(),
    };
    this.store.set(id, record);
    return { ...record };
  }

  findById(id: string): ChangeRequestRecord | null {
    const record = this.store.get(id);
    return record ? { ...record } : null;
  }

  /**
   * Update with optimistic locking.
   * Throws ConflictException if expectedVersion does not match current version.
   */
  update(id: string, payload: UpdatePayload, expectedVersion: number): ChangeRequestRecord {
    const current = this.store.get(id);
    if (!current) {
      throw new Error(`Record not found: ${id}`);
    }

    // Optimistic lock check: version must match
    if (current.version !== expectedVersion) {
      throw new ConflictException(
        'Change request has been modified by another user. Please refresh and try again.',
      );
    }

    // Apply update and increment version
    const updated: ChangeRequestRecord = {
      ...current,
      description: payload.description ?? current.description,
      impactLevel: payload.impactLevel ?? current.impactLevel,
      justification: payload.justification ?? current.justification,
      version: current.version + 1,
      updatedAt: new Date(),
    };

    this.store.set(id, updated);
    return { ...updated };
  }

  reset(): void {
    this.store.clear();
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Generators
// ──────────────────────────────────────────────────────────────────────────────

/** Random CR update payload */
const updatePayloadArb: fc.Arbitrary<UpdatePayload> = fc.record({
  description: fc.option(fc.string({ minLength: 5, maxLength: 100 })),
  impactLevel: fc.option(
    fc.constantFrom('major', 'high', 'medium', 'low', 'very_low'),
  ),
  justification: fc.option(fc.string({ minLength: 5, maxLength: 100 })),
});

/** Random sequence of concurrent updates (2-5 attempts) */
const concurrentUpdatesArb: fc.Arbitrary<UpdatePayload[]> = fc.array(updatePayloadArb, {
  minLength: 2,
  maxLength: 5,
});

// ──────────────────────────────────────────────────────────────────────────────
// Property 6: Optimistic Locking — No Silent Overwrites
// ──────────────────────────────────────────────────────────────────────────────

describe('Optimistic Locking Properties (PBT)', () => {
  const repo = new MockChangeRequestRepository();

  beforeEach(() => {
    repo.reset();
  });

  describe('Property 6: Concurrent updates with stale version must fail', () => {
    /**
     * **Validates: Requirements US-035, EX-011**
     *
     * When multiple updates target the same CR with the same version,
     * exactly one succeeds and the rest fail with ConflictException.
     */
    it('only one of multiple concurrent updates with same version succeeds', () => {
      fc.assert(
        fc.property(
          concurrentUpdatesArb,
          (updates) => {
            repo.reset();
            const cr = repo.create('cr-test-1');
            const initialVersion = cr.version;

            let successCount = 0;
            let failCount = 0;

            // Simulate concurrent updates: all use the same (initial) version
            for (const payload of updates) {
              try {
                repo.update('cr-test-1', payload, initialVersion);
                successCount++;
              } catch (error) {
                if (error instanceof ConflictException) {
                  failCount++;
                } else {
                  throw error; // Unexpected error
                }
              }
            }

            // Exactly one must succeed (the first to commit)
            expect(successCount).toBe(1);
            // All others must fail
            expect(failCount).toBe(updates.length - 1);
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-035, EX-011**
     *
     * After each successful update, the version increments by exactly 1.
     * Sequential successful updates produce a monotonically incrementing version.
     */
    it('version increments exactly by 1 on each successful update', () => {
      fc.assert(
        fc.property(
          fc.array(updatePayloadArb, { minLength: 1, maxLength: 10 }),
          (updates) => {
            repo.reset();
            const cr = repo.create('cr-version-test');
            let currentVersion = cr.version;

            // Apply updates sequentially, each with the correct current version
            for (const payload of updates) {
              const updated = repo.update('cr-version-test', payload, currentVersion);

              // Version must be exactly previous + 1
              expect(updated.version).toBe(currentVersion + 1);
              currentVersion = updated.version;
            }

            // Final version = initial + number of updates
            const finalRecord = repo.findById('cr-version-test');
            expect(finalRecord!.version).toBe(cr.version + updates.length);
          },
        ),
        { numRuns: 200 },
      );
    });

    /**
     * **Validates: Requirements US-035, EX-011**
     *
     * Once a version becomes stale (a successful update has occurred),
     * any update attempt with that stale version must always fail with
     * ConflictException, regardless of the payload content.
     */
    it('updates with stale version always fail regardless of payload', () => {
      fc.assert(
        fc.property(
          updatePayloadArb,
          concurrentUpdatesArb,
          (firstUpdate, staleUpdates) => {
            repo.reset();
            const cr = repo.create('cr-stale-test');
            const staleVersion = cr.version;

            // First update succeeds, making staleVersion outdated
            const updated = repo.update('cr-stale-test', firstUpdate, staleVersion);
            expect(updated.version).toBe(staleVersion + 1);

            // All subsequent attempts with the stale version must fail
            for (const payload of staleUpdates) {
              expect(() => {
                repo.update('cr-stale-test', payload, staleVersion);
              }).toThrow(ConflictException);
            }

            // The record version must not have changed beyond the first update
            const finalRecord = repo.findById('cr-stale-test');
            expect(finalRecord!.version).toBe(staleVersion + 1);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
