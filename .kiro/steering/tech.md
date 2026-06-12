---
inclusion: always
---

# Technology Context

## Summary
<!-- 3-line max -->
- **Stack**: TypeScript / React + Tailwind + MUI (frontend), Node.js (backend) / Microsoft SQL Server Express
- **Architecture**: Web SPA + backend API (REST — pending D3 confirmation)
- **Infra**: AWS — ECS, S3 + CloudFront, RDS MSSQL Express; Terraform IaC; Docker Compose (local)

## Stack

- **Languages**: TypeScript / JavaScript
- **Frameworks**: React, Tailwind CSS, MUI (frontend); Node.js (backend — framework pending D3, e.g. Express/NestJS)
- **Build System**: Pending D3 decisions (likely Vite for frontend)
- **Package Manager**: Pending D3 decisions (npm)
- **Testing**: Pending D3 decisions

## Architecture

- **Pattern**: Pending D2/D3 decisions (frontend SPA + backend API)
- **API Style**: REST (pending D3 confirmation)

## Infrastructure

- **Cloud Provider**: AWS
- **Compute**: Amazon ECS (containers) for backend; S3 Static + CloudFront for frontend hosting
- **Database**: Microsoft SQL Server Express — RDS (staging/production), Docker Compose (local)
- **IaC Tool**: Terraform

## Patterns & Conventions

Will be defined during foundation/design phase. Baseline from workspace steering `js-conventions.md`:

- **Naming conventions**: camelCase for variables/functions; PascalCase for classes and React components; UPPER_SNAKE_CASE for constants
- **File structure**: one component per file; group related components in folders; `index.ts` for exports
- **TypeScript practices**: prefer interfaces over types for public APIs; explicit return types for exported functions; avoid `any`
- **Architecture pattern**: To be defined during design phase
- **Data access**: To be defined during design phase (MSSQL driver/ORM pending D3)
- **API response format**: To be defined during design phase
- **Error handling**: To be defined during design phase
- **Authentication**: Microsoft (MS365/AD) — anonymous mode + email-login mode; details in design phase
- **Validation**: To be defined during design phase
- **Logging**: To be defined during design phase (must support immutable audit log)

## Environment Configuration

- **Config approach**: Pending D3 decisions
- **Environments**: local (Docker Compose), staging, production (AWS)
- **Secrets management**: Pending D3 decisions (likely AWS Secrets Manager / SSM)

## CI/CD Pipeline

- **Tool**: Pending D3 decisions
- **Stages**: Pending D3 decisions
- **Deploy target**: AWS ECS (backend), S3 + CloudFront (frontend)

## Dependency Management

- **Lockfile**: Pending D3 decisions
- **Version strategy**: Exact/pinned versions preferred
- **Monorepo tooling**: Pending D3 decisions (frontend + backend likely in one repo)
