# Correctness Properties

## Overview
**PBT Framework**: fast-check (TypeScript)
**Integration**: Jest test runner
**Focus**: Critical invariants ที่ต้อง hold true เสมอ — workflow state machine, audit log immutability, RBAC permissions

---

## Properties

### Property 1: Workflow State Machine — Valid Transitions Only

**Validates**: US-029, US-030, BR-001, EX-009
**Property**: สำหรับ workflow definition ใด ๆ ที่ valid, การ transition จาก step A ไป step B ต้อง valid ตาม definition เสมอ — ไม่มี invalid transition ที่สำเร็จได้

```typescript
fc.assert(fc.property(
  validWorkflowDefinitionArb,
  randomTransitionSequenceArb,
  (workflow, transitions) => {
    const engine = new WorkflowEngine(workflow);
    for (const transition of transitions) {
      const result = engine.tryTransition(transition.fromStep, transition.toStep, transition.context);
      if (result.success) {
        // If transition succeeded, it must be a valid edge in the workflow graph
        expect(workflow.hasEdge(transition.fromStep, transition.toStep)).toBe(true);
        // And all conditions for that edge must be satisfied
        const conditions = workflow.getConditions(transition.fromStep, transition.toStep);
        expect(conditions.every(c => c.evaluate(transition.context))).toBe(true);
      }
    }
  }
));
```

**Generators**:
- `validWorkflowDefinitionArb`: workflow ที่ pass validation (has start, has end, connected)
- `randomTransitionSequenceArb`: ลำดับ step pairs สุ่ม (ทั้ง valid และ invalid)

**Edge Cases**: Empty workflow, single-step workflow, circular conditions, conflicting conditions

---

### Property 2: Workflow State Machine — Reachability

**Validates**: US-029, BR-001
**Property**: สำหรับ workflow definition ที่ valid, ทุก step ต้อง reachable จาก start step — ไม่มี orphan steps

```typescript
fc.assert(fc.property(
  validWorkflowDefinitionArb,
  (workflow) => {
    const reachable = workflow.getReachableSteps(workflow.startStep);
    const allSteps = workflow.getAllSteps();
    // Every step must be reachable from start
    expect(reachable.size).toBe(allSteps.length);
    // End step must be reachable
    expect(reachable.has(workflow.endStep)).toBe(true);
  }
));
```

---

### Property 3: Audit Log Immutability — Append-Only

**Validates**: US-022, NFR-004, BR-011
**Property**: Audit log entries เมื่อถูกสร้างแล้ว ต้องไม่เปลี่ยนแปลง — content ของ entry ที่อ่านในเวลาต่างกันต้องเหมือนกันเสมอ

```typescript
fc.assert(fc.asyncProperty(
  auditLogEntryArb,
  async (entry) => {
    // Create audit entry
    const created = await auditService.create(entry);
    const id = created.id;
    
    // Read immediately
    const read1 = await auditService.findById(id);
    
    // Attempt modifications (should all fail)
    await expect(auditService.update(id, { action: 'modified' })).rejects.toThrow();
    await expect(auditService.delete(id)).rejects.toThrow();
    
    // Read again — must be identical to first read
    const read2 = await auditService.findById(id);
    expect(read2).toEqual(read1);
    expect(read2.action).toBe(entry.action);
    expect(read2.oldValue).toEqual(entry.oldValue);
    expect(read2.newValue).toEqual(entry.newValue);
  }
));
```

**Generators**:
- `auditLogEntryArb`: random valid audit entries with various action types, entity types, JSON values

---

### Property 4: Audit Log Completeness — Every Write Generates Entry

**Validates**: US-022, NFR-004
**Property**: ทุก write operation (create, update, status change) บน ChangeRequest ต้องมี audit log entry ที่สอดคล้อง

```typescript
fc.assert(fc.asyncProperty(
  changeRequestUpdateArb,
  async (update) => {
    const cr = await createTestCR();
    const beforeCount = await auditService.countByEntity('ChangeRequest', cr.id);
    
    // Perform update
    await changeRequestService.update(cr.id, update);
    
    const afterCount = await auditService.countByEntity('ChangeRequest', cr.id);
    // At least one new audit entry must exist
    expect(afterCount).toBeGreaterThan(beforeCount);
    
    // Latest entry must reflect the change
    const latest = await auditService.getLatestByEntity('ChangeRequest', cr.id);
    expect(latest.action).toBe('update');
    expect(latest.entityId).toBe(cr.id);
  }
));
```

---

### Property 5: RBAC — Permission Enforcement

**Validates**: US-027, NFR-002, NFR-003, EX-008
**Property**: สำหรับ user ที่มี role X, operation ที่ไม่อยู่ใน permission matrix ของ role X ต้อง return 403 เสมอ

```typescript
fc.assert(fc.asyncProperty(
  roleArb,
  operationArb,
  async (role, operation) => {
    const user = await createTestUserWithRole(role);
    const token = await getJwtForUser(user);
    
    const isAllowed = PERMISSION_MATRIX[role].includes(operation.permission);
    const response = await request(app)
      .method(operation.method)
      .path(operation.path)
      .set('Authorization', `Bearer ${token}`)
      .send(operation.body);
    
    if (!isAllowed) {
      expect(response.status).toBe(403);
    } else {
      expect(response.status).not.toBe(403);
    }
  }
));
```

**Generators**:
- `roleArb`: one of 8 roles
- `operationArb`: random API operation (method + path + body)

---

### Property 6: Optimistic Locking — No Silent Overwrites

**Validates**: US-035, EX-011
**Property**: เมื่อ 2 users แก้ไข CR เดียวกันพร้อมกัน, ผู้ที่ save ทีหลังต้อง get conflict error — ไม่มีการ overwrite แบบเงียบ

```typescript
fc.assert(fc.asyncProperty(
  changeRequestFieldsArb,
  changeRequestFieldsArb,
  async (update1, update2) => {
    const cr = await createTestCR();
    const version = cr.version;
    
    // User 1 updates with correct version
    const result1 = await changeRequestService.update(cr.id, { ...update1, version });
    expect(result1.version).toBe(version + 1);
    
    // User 2 tries to update with stale version
    await expect(
      changeRequestService.update(cr.id, { ...update2, version }) // same old version
    ).rejects.toThrow(/conflict|version mismatch/i);
  }
));
```

---

## Test Configuration

- **Tests per property**: 200 (increase for CI: 1000)
- **Timeout**: 30s per property
- **Shrinking**: Enabled — fast-check will minimize failing inputs
- **Seed**: Logged for reproducibility

**Run**: `pnpm --filter backend test:properties`

**Organization**:
```
packages/backend/test/properties/
├── workflow.properties.test.ts    # Properties 1, 2
├── audit.properties.test.ts      # Properties 3, 4
├── rbac.properties.test.ts       # Property 5
└── concurrency.properties.test.ts # Property 6
```
