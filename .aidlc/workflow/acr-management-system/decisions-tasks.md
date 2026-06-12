# Tasks Decisions

## Context Summary
- **Architecture**: NestJS Modular + React SPA on AWS
- **Components**: 9 (Auth, ChangeRequest, Workflow Engine, Approval, Notification, Attachment, Audit, Admin, Reporting)
- **Entities**: 12 data models
- **Endpoints**: ~45 REST + WebSocket
- **Integrations**: AWS SES, AWS S3, Redis
- **PBT Properties**: 6 correctness properties
- **Infrastructure**: ECS Fargate, RDS MSSQL, ElastiCache Redis, S3 + CloudFront, Terraform

---

## Decision Questions

### D4-1: Task Breakdown Strategy
**Question**: แนวทางแบ่ง tasks สำหรับระบบ ACR (9 components, 12 entities, ~45 endpoints)?
- 1) Component-first — สร้างทีละ module (Auth → ChangeRequest → Workflow → ...) ให้แต่ละ module เสร็จสมบูรณ์ก่อนไป module ถัดไป **(Recommended)**
- 2) Layer-by-layer — สร้าง data layer ทั้งหมดก่อน → services → controllers → frontend
- 3) Vertical slice — สร้าง 1 feature end-to-end (DB → API → UI) ทีละ feature
- 4) Other (please specify): _______

**Answer**: 1

---

### D4-2: Implementation Approach
**Question**: Testing approach ระหว่าง implementation?
- 1) Test-after — implement แล้วเขียน test ทีหลัง (เร็วกว่าในช่วงแรก)
- 2) Test-first / TDD — เขียน test ก่อน implement (quality สูงกว่า) **(Recommended)**
- 3) Test-alongside — implement + test ไปพร้อมกัน (compromise)
- 4) Other (please specify): _______

**Answer**: 2

---

### D4-3: Component Priority
**Question**: ลำดับ priority ของ components ที่จะ implement ก่อน?
- 1) Foundation first: Project Setup → DB/Prisma → Auth → Workflow Engine → ChangeRequest → Approval → Notification → Attachment → Audit → Admin → Reporting → Frontend **(Recommended)**
- 2) Core flow first: ChangeRequest → Workflow → Auth → Approval → Notification → others
- 3) MVP first: Auth + ChangeRequest + basic Approval → then others
- 4) Other (please specify): _______

**Answer**: 1

---

### D4-4: Integration Strategy
**Question**: แนวทาง implement integrations (SES, S3, Redis)?
- 1) Mock-first — ใช้ mock/LocalStack ตอน dev, เปลี่ยนเป็น real services ตอน staging **(Recommended)**
- 2) Real-services — connect AWS services จริงตั้งแต่ต้น (ต้อง AWS account พร้อม)
- 3) Contract-first — define interfaces ก่อน, mock ภายใน, integrate ทีหลัง
- 4) Other (please specify): _______

**Answer**: 1

---

### D4-5: Task Granularity
**Question**: ขนาดของแต่ละ task?
- 1) Standard (1-2 days per task) — เหมาะสมสำหรับ team tracking **(Recommended)**
- 2) Fine-grained (2-4 hours per task) — ละเอียด แต่มี tasks เยอะ
- 3) Coarse (3-5 days per task) — tasks น้อย แต่แต่ละ task ใหญ่
- 4) Other (please specify): _______

**Answer**: 1

---

### D4-6: Infrastructure Tasks
**Question**: Infrastructure tasks (Terraform, Docker, CI/CD) จะรวมใน implementation plan หรือแยก?
- 1) รวม — มี phase สำหรับ infrastructure setup (Terraform, Docker Compose, CI/CD pipeline) **(Recommended)**
- 2) แยก — infrastructure เป็น workstream แยก ให้ DevOps ทำ
- 3) ข้ามไปก่อน — deploy manual, เพิ่ม IaC ทีหลัง
- 4) Other (please specify): _______

**Answer**: 1

---

### D4-7: Estimates
**Question**: ต้องการ estimates (เวลา) ใน task list หรือไม่?
- 1) T-shirt sizes (S/M/L/XL) — rough estimate ให้เห็นภาพรวม **(Recommended)**
- 2) Hours — ละเอียด
- 3) Story Points — for sprint planning
- 4) No estimates — focus on sequencing เท่านั้น
- 5) Other (please specify): _______

**Answer**: 1

---

### D4-8: Parallel Execution
**Question**: ต้องการ parallel execution (หลายคนทำพร้อมกัน) หรือ sequential?
- 1) Sequential — คนเดียวทำทั้งหมด ตามลำดับ
- 2) Parallel by module — assign แต่ละ module ให้คนละคน (ต้อง coordinate interfaces) **(Recommended)**
- 3) Parallel by layer — frontend team + backend team แยก
- 4) Other (please specify): _______

**Answer**: 2

---

## Decisions Summary
<!-- Machine-readable compact summary. Downstream phases: read ONLY this section. -->
- D4-1 Breakdown Strategy: Component-first (module by module)
- D4-2 Implementation Approach: Test-first / TDD
- D4-3 Component Priority: Foundation → DB/Prisma → Auth → Workflow Engine → ChangeRequest → Approval → Notification → Attachment → Audit → Admin → Reporting → Frontend
- D4-4 Integration Strategy: Mock-first (LocalStack dev, real AWS staging)
- D4-5 Task Granularity: Standard (1-2 days per task)
- D4-6 Infrastructure Tasks: Included (Terraform, Docker, CI/CD in plan)
- D4-7 Estimates: T-shirt sizes (S/M/L/XL)
- D4-8 Parallel Execution: Parallel by module (assign modules to different developers)

---

**Instructions**: Fill in your answers above and respond with "done"
