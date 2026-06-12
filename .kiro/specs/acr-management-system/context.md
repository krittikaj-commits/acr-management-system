# Context Assessment

## Summary
<!-- 10-line max. Downstream phases read ONLY this section. -->
- **Type**: Greenfield
- **Stack**: React + Tailwind CSS + MUI (frontend) / Node.js (backend) / Microsoft SQL Server Express (database)
- **Architecture**: Web application — frontend SPA + backend API; deployed on AWS (ECS, S3/CloudFront, RDS), IaC via Terraform
- **Feature**: ACR Management System — บริหารจัดการกระบวนการ Change Request (Access Right Registration / Change / Revoke) ตั้งแต่สร้างคำขอจนปิดงาน รองรับ Normal และ Emergency Change
- **Impact**: New standalone product (greenfield)
- **Complexity**: High — ~28 functional requirements, 8 user types, 4 external integrations, multi-stage workflow
- **Recommendations**: Personas Yes, Units Yes, NFR Yes

## Project Overview
- **Type**: Greenfield
- **Assessment Date**: 2026-06-09T00:00:00Z

## Technology Stack
- **Languages**: TypeScript / JavaScript (Node.js, React) — per workspace conventions
- **Frameworks**: React, Tailwind CSS, MUI (frontend); Node.js (backend)
- **Build System**: Pending D3 decisions (likely npm/Vite for frontend)
- **Testing**: Pending D3 decisions
- **Infrastructure**: AWS — ECS (containers), S3 + CloudFront (static web hosting), RDS Microsoft SQL Server Express; Docker Compose (local dev); Terraform (IaC)

## Patterns & Conventions
N/A — greenfield project. Conventions will be defined during design/foundation phases. Note: workspace steering `js-conventions.md` already mandates camelCase variables, PascalCase components/classes, UPPER_SNAKE_CASE constants, interfaces over types for public APIs, explicit return types, and no `any`.

## Codebase Analysis
N/A — greenfield project. No existing source code.

## Feature Impact

**Affected Areas**: New standalone — entire system to be built from scratch.

| Area | Impact | Reason |
|------|--------|--------|
| Frontend SPA | New | React/Tailwind/MUI UI for requesters, IT, approvers, admin |
| Backend API | New | Node.js API for workflow, requests, approvals, audit |
| Database | New | MSSQL schema for change requests, workflow state, audit log, master data |
| Auth & Authorization | New | Microsoft (MS365/AD) auth + RBAC across 8 roles; anonymous + email-login modes |
| Email Notification | New | Integration with MS365 for approval links and status notifications |
| File Storage | New | Evidence/attachment upload and retention |
| Infrastructure | New | ECS, S3/CloudFront, RDS, Terraform IaC, Docker Compose |

## Recommendations

- Story Count: High (28 functional requirements → likely 30+ user stories)
- Domain Boundaries: Change Request authoring, IT Review & Planning, Approval workflow, Implementation & Verification, Attachments/Evidence, Notifications, Audit & Reporting, Admin/Master Data, Authentication & Authorization
- User Types: 8 — Requester, Approver Request, Call Center, IT Reviewer, Approver, Implementer, Auditor, Admin
- Integration Points: Email MS365, Active Directory, Ticketing System (optional), File Storage
- **Personas**: Yes — 8 distinct user types with different goals and permissions
- **Units**: Yes — multiple distinct functional domains warrant decomposition
- **NFR**: Yes — explicit security, audit immutability, performance, availability, backup, and compatibility requirements

## Recommended Workflow

```
       ┌─────────────┐
       │  Context ✅  │
       └──────┬──────┘
              ▼
       ┌──────────────┐
       │ Requirements │  ← personas recommended
       └──────┬───────┘
              ▼
       ┌───────────────┐
       │ Decomposition │
       └───────┬───────┘
               ▼
       ┌────────────┐
       │ Foundation │  ← greenfield: shared conventions + infra
       └──┬─────┬───┘
          │     │
          ▼     ▼
     ┌────────┐ ┌────────┐
     │ Unit 1 │ │ Unit N │  ← each: Design (NFR) → Tasks → Implement
     └───┬────┘ └───┬────┘
         │          │
         ▼          ▼
     ┌──────────────────┐
     │ Solutions Review │
     └────────┬─────────┘
              ▼
     ┌─────────────┐
     │ Code Review │
     └─────────────┘
```

## External References

| Source | Type | What was used |
|--------|------|---------------|
| initial-requirements/Usecase-APP-02-ACR Management System.md | Requirement document (source of truth) | Functional requirements, NFRs, exception cases, business rules, user classes, workflow steps |
