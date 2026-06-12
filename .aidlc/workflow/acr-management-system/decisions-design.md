# Design Decisions

## Context Summary
- **Type**: Greenfield, comprehensive mode (no decomposition)
- **Stack (decided)**: React + Tailwind + MUI / Node.js / Microsoft SQL Server Express / AWS (ECS, S3+CloudFront, RDS) / Terraform / Docker Compose
- **Architecture**: Web SPA + backend REST API
- **Feature**: ACR Management System — 35 user stories, 14 functional areas, 8 roles
- **Key Challenges**: Configurable workflow engine, immutable audit log, anonymous + authenticated access, email integration (MS365), RBAC
- **NFR**: Response <3s, uptime ≥99%, daily backup, immutable audit, attachment ≤10MB

---

## Decision Questions

### D3-1: Backend Framework
**Question**: Node.js backend framework สำหรับ ACR Management System ที่มี complex workflow engine + RBAC + audit log?
- 1) Express.js — lightweight, flexible, mature ecosystem (ต้อง structure เอง) 
- 2) NestJS — opinionated, modular architecture, built-in DI, decorators, guards, interceptors **(Recommended)**
- 3) Fastify — fast, schema-based validation, plugin system
- 4) Other (please specify): _______

**Answer**: 2

---

### D3-2: Database ORM/Client
**Question**: MSSQL client/ORM สำหรับ Node.js ที่รองรับ migrations, relations, audit trail?
- 1) Prisma — type-safe, schema-first, auto migrations, excellent DX **(Recommended)**
- 2) TypeORM — decorator-based, active record + data mapper, supports MSSQL native
- 3) Knex.js — query builder, flexible, manual migrations
- 4) mssql (tedious) — raw driver, full control, manual query building
- 5) Other (please specify): _______

**Answer**: 1

---

### D3-3: Authentication & Token Strategy
**Question**: Authentication strategy สำหรับ dual-mode (anonymous requester + MS365 login)?
- 1) Microsoft MSAL + JWT — MSAL สำหรับ OAuth2/OIDC login, issue JWT สำหรับ API calls; anonymous ใช้ token link **(Recommended)**
- 2) Passport.js with Azure AD strategy + session-based auth
- 3) NextAuth/Auth.js with Azure AD provider
- 4) Other (please specify): _______

**Answer**: 4:BuilIN Local

---

### D3-4: State Management (Frontend)
**Question**: Frontend state management สำหรับ complex forms + workflow state + notifications?
- 1) React Query (TanStack Query) สำหรับ server state + Zustand สำหรับ client state **(Recommended)**
- 2) Redux Toolkit + RTK Query
- 3) React Query + React Context (simple client state)
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-5: Form Handling
**Question**: Form handling library สำหรับ complex multi-step forms (CR form แยกส่วน Requester/IT)?
- 1) React Hook Form + Zod validation **(Recommended)**
- 2) Formik + Yup validation
- 3) React Hook Form + Joi validation
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-6: API Documentation
**Question**: API documentation approach?
- 1) OpenAPI/Swagger — auto-generate จาก code (NestJS swagger module) **(Recommended)**
- 2) OpenAPI — design-first (เขียน spec ก่อน generate code)
- 3) Manual documentation (Markdown)
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-7: Repository Structure
**Question**: Repository strategy สำหรับ frontend + backend + infrastructure?
- 1) Monorepo (pnpm workspaces) — frontend/, backend/, infra/ ใน repo เดียว **(Recommended)**
- 2) Monorepo (Nx) — advanced build caching, affected commands
- 3) Monorepo (Turborepo) — simple monorepo tooling
- 4) Multi-repo — แยก repo frontend, backend, infra
- 5) Other (please specify): _______

**Answer**: 1

---

### D3-8: CI/CD Pipeline
**Question**: CI/CD tool สำหรับ build + test + deploy ไป AWS?
- 1) GitHub Actions — flexible, AWS integration ดี, free tier เพียงพอ **(Recommended)**
- 2) AWS CodePipeline + CodeBuild — native AWS, tight integration
- 3) GitLab CI — built-in if using GitLab
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-9: File Storage (Attachments)
**Question**: File storage สำหรับ attachments/evidence (PDF, images, docs, ≤10MB per file)?
- 1) AWS S3 — presigned URLs สำหรับ upload/download, lifecycle rules **(Recommended)**
- 2) Local file system + Docker volume (dev) / EFS (prod)
- 3) Azure Blob Storage
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-10: Email Integration
**Question**: Email sending approach สำหรับ MS365 integration (notifications + approval links)?
- 1) Microsoft Graph API — direct integration, OAuth2, rich email, read receipts **(Recommended)**
- 2) SMTP (MS365 SMTP relay) — simple, stateless
- 3) AWS SES — reliable, cost-effective, แต่ไม่ใช่ MS365 native
- 4) Other (please specify): _______

**Answer**: 3

---

### D3-11: Real-time Notifications (In-App)
**Question**: In-app real-time notification approach?
- 1) WebSocket (Socket.io) — bi-directional, real-time push **(Recommended)**
- 2) Server-Sent Events (SSE) — one-way push, simpler
- 3) Polling — simple, no persistent connection, slightly delayed
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-12: Caching Strategy
**Question**: Caching strategy สำหรับ performance (target: <3s response time)?
- 1) Redis — session cache, workflow state cache, master data cache **(Recommended)**
- 2) In-memory cache (node-cache) — simple, single instance only
- 3) No caching for MVP — optimize later
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-13: Testing Strategy
**Question**: Testing approach สำหรับ ACR Management System?
- 1) Jest + Supertest (unit + integration) + Playwright (E2E) **(Recommended)**
- 2) Vitest + Supertest (unit + integration) + Cypress (E2E)
- 3) Jest + Supertest (unit + integration) only — E2E ทำทีหลัง
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-14: Correctness & Property-Based Testing
**Question**: ต้องการใช้ Property-Based Testing (PBT) เพื่อตรวจสอบ correctness properties (เช่น workflow state transitions ต้อง valid เสมอ, audit log ต้อง immutable) หรือไม่?
- 1) Yes — ใช้ PBT สำหรับ critical invariants: workflow state machine, audit log immutability, RBAC permissions **(Recommended)**
- 2) Yes — เฉพาะ workflow state machine transitions
- 3) No — ใช้ unit test + integration test ปกติเพียงพอ
- 4) Other (please specify): _______

**Answer**: 1

---

### D3-15: Observability & Logging
**Question**: Logging และ observability stack?
- 1) Winston (structured JSON) + AWS CloudWatch Logs + CloudWatch Metrics **(Recommended)**
- 2) Pino + AWS CloudWatch
- 3) Winston + ELK Stack (self-hosted)
- 4) Other (please specify): _______

**Answer**: 1

---

## Decisions Summary
<!-- Machine-readable compact summary. Downstream phases: read ONLY this section. -->
- D3-1 Backend Framework: NestJS (modular architecture, DI, guards, interceptors)
- D3-2 ORM/Client: Prisma (type-safe, schema-first, auto migrations)
- D3-3 Auth Strategy: Local email + password (ระบบจัดการ user/password เอง, register/login/forgot password); AD integration เป็น Phase 2
- D3-4 State Management: React Query (TanStack Query) + Zustand
- D3-5 Form Handling: React Hook Form + Zod validation
- D3-6 API Docs: OpenAPI/Swagger auto-generated from NestJS decorators
- D3-7 Repo Structure: Monorepo (pnpm workspaces) — frontend/, backend/, infra/
- D3-8 CI/CD: GitHub Actions
- D3-9 File Storage: AWS S3 (presigned URLs)
- D3-10 Email: AWS SES (reliable, cost-effective)
- D3-11 Real-time: WebSocket (Socket.io)
- D3-12 Caching: Redis (session, workflow state, master data cache)
- D3-13 Testing: Jest + Supertest + Playwright (unit + integration + E2E)
- D3-14 PBT: Yes — PBT for workflow state machine, audit log immutability, RBAC permissions
- D3-15 Observability: Winston (structured JSON) + AWS CloudWatch

---

**Instructions**: Fill in your answers above and respond with "done"
