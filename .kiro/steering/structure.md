---
inclusion: always
---

# Project Structure

## Summary
<!-- 3-line max -->
- **Repo**: Pending D3 decisions (likely single repo: frontend + backend + infra)
- **Source**: To be defined during design phase
- **Entry**: To be defined during design phase

## Repository

- **Type**: Pending D3 decisions — likely single repo with `frontend/`, `backend/`, `infra/` workspaces
- **Root**: Workspace root for ACR Management System

## Key Directories

Directory structure will be defined during the design phase. Anticipated layout:

| Directory | Purpose | Key Contents |
|-----------|---------|-------------|
| frontend/ | React SPA | components, pages, hooks, services (API client) |
| backend/ | Node.js API | routes/controllers, services, repositories, models |
| infra/ | Terraform IaC | ECS, S3/CloudFront, RDS modules |
| (docker-compose.yml) | Local development | MSSQL Express + backend + frontend |

## Key Files

Key files will be defined during the design phase.

## Entry Points

Entry points will be defined during the design phase.

## Module Dependencies

N/A — greenfield project. Will be defined during design phase.

## Data Flow

N/A — greenfield project. Will be defined during design phase.
