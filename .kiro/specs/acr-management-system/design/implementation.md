# Implementation Specifications

## Code Organization

**Architecture Pattern**: NestJS Modular (Layered within each module: Controller → Service → Repository)
**Repository**: Monorepo (pnpm workspaces)

### Directory Structure
```
acr-management-system/
├── packages/
│   ├── frontend/                    # React SPA
│   │   ├── src/
│   │   │   ├── app/                 # App-level: routes, providers, layouts
│   │   │   ├── components/          # Shared UI components
│   │   │   │   ├── ui/             # Generic: Button, Modal, Table, etc.
│   │   │   │   ├── forms/          # Form components: CRForm, ApprovalForm
│   │   │   │   └── layout/         # Header, Sidebar, Footer
│   │   │   ├── features/           # Feature modules (mirrors backend)
│   │   │   │   ├── auth/           # Login, Register, ForgotPassword
│   │   │   │   ├── change-request/ # CR list, detail, create, edit
│   │   │   │   ├── approval/       # Approval queue, approve/reject
│   │   │   │   ├── workflow/       # Workflow config (Admin)
│   │   │   │   ├── admin/          # User management, master data
│   │   │   │   ├── notification/   # Notification list, badge
│   │   │   │   ├── reporting/      # Dashboard, export
│   │   │   │   └── audit/          # Audit log viewer
│   │   │   ├── hooks/              # Custom hooks (useAuth, useCR, useNotification)
│   │   │   ├── services/           # API client (axios instance, endpoints)
│   │   │   ├── store/              # Zustand stores
│   │   │   ├── types/              # TypeScript interfaces
│   │   │   └── utils/              # Helpers, formatters, validators
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   ├── backend/                     # NestJS API
│   │   ├── src/
│   │   │   ├── main.ts             # Entry point
│   │   │   ├── app.module.ts       # Root module
│   │   │   ├── common/             # Shared: guards, interceptors, pipes, filters
│   │   │   │   ├── guards/         # AuthGuard, RolesGuard
│   │   │   │   ├── interceptors/   # AuditInterceptor, TransformInterceptor
│   │   │   │   ├── pipes/          # ZodValidationPipe
│   │   │   │   ├── filters/        # HttpExceptionFilter
│   │   │   │   └── decorators/     # @Roles(), @Public(), @CurrentUser()
│   │   │   ├── modules/
│   │   │   │   ├── auth/           # AuthModule
│   │   │   │   ├── change-request/ # ChangeRequestModule
│   │   │   │   ├── workflow/       # WorkflowModule (engine)
│   │   │   │   ├── approval/       # ApprovalModule
│   │   │   │   ├── notification/   # NotificationModule
│   │   │   │   ├── attachment/     # AttachmentModule
│   │   │   │   ├── audit/          # AuditModule
│   │   │   │   ├── admin/          # AdminModule
│   │   │   │   └── reporting/      # ReportingModule
│   │   │   ├── prisma/             # Prisma service, schema
│   │   │   └── config/             # Configuration (env validation)
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema
│   │   │   ├── migrations/         # Auto-generated migrations
│   │   │   └── seed.ts             # Seed data (roles, default workflow, admin user)
│   │   ├── test/
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   ├── e2e/
│   │   │   └── properties/         # PBT tests
│   │   └── package.json
│   │
│   └── shared/                      # Shared types, constants, utilities
│       ├── src/
│       │   ├── types/               # Shared TypeScript interfaces
│       │   ├── constants/           # Shared constants (roles, statuses)
│       │   └── utils/               # Shared utilities
│       └── package.json
│
├── infra/                           # Terraform IaC
│   ├── modules/
│   │   ├── ecs/                    # ECS Fargate service
│   │   ├── rds/                    # RDS MSSQL Express
│   │   ├── s3-cloudfront/          # S3 + CloudFront (frontend)
│   │   ├── s3-attachments/         # S3 bucket for attachments
│   │   ├── elasticache/            # Redis
│   │   ├── ses/                    # SES configuration
│   │   └── networking/             # VPC, subnets, security groups
│   ├── environments/
│   │   ├── staging/
│   │   └── production/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
│
├── docker-compose.yml               # Local development
├── docker-compose.test.yml          # Testing (with LocalStack)
├── .github/
│   └── workflows/
│       ├── ci.yml                   # Lint, test, build
│       └── deploy.yml               # Deploy to staging/prod
├── pnpm-workspace.yaml
├── package.json                     # Root workspace config
├── .env.example
└── README.md
```

### Module Boundaries
- Controllers: handle HTTP, validate input (Zod pipes), delegate to services
- Services: business logic, orchestration, no direct DB access
- Repositories (Prisma): data access only, no business logic
- Guards: auth + role checks (before controller)
- Interceptors: audit logging, response transformation (after controller)
- Modules are loosely coupled — communicate via injected services, not direct imports of internal classes

### Naming Conventions
- **Files**: kebab-case (e.g., `change-request.service.ts`)
- **Classes**: PascalCase (e.g., `ChangeRequestService`)
- **Functions/methods**: camelCase (e.g., `createChangeRequest`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_FILE_SIZE`)
- **Interfaces**: PascalCase with `I` prefix for public APIs (e.g., `IChangeRequest`)
- **Enums**: PascalCase (e.g., `ChangeType`, `ImpactLevel`)
- **DB tables**: PascalCase (Prisma convention)
- **API routes**: kebab-case (e.g., `/change-requests`)

---

## Technology Stack

### Key Dependencies

**Backend (packages/backend/package.json)**:
- `@nestjs/core`, `@nestjs/platform-express` — framework
- `@nestjs/swagger` — API docs
- `@nestjs/passport`, `passport-local`, `passport-jwt` — auth
- `@prisma/client`, `prisma` — ORM
- `bcrypt` — password hashing
- `zod` — validation schemas
- `socket.io` — WebSocket
- `@aws-sdk/client-ses` — email
- `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` — file storage
- `ioredis` — Redis client
- `winston` — logging
- `exceljs` — Excel export
- `pdfkit` — PDF export
- `fast-check` — property-based testing

**Frontend (packages/frontend/package.json)**:
- `react`, `react-dom` — UI
- `@mui/material`, `@mui/icons-material` — component library
- `tailwindcss` — utility CSS
- `@tanstack/react-query` — server state
- `zustand` — client state
- `react-hook-form`, `@hookform/resolvers` — forms
- `zod` — validation (shared with backend)
- `axios` — HTTP client
- `react-router-dom` — routing
- `socket.io-client` — WebSocket client
- `recharts` — dashboard charts

### Monorepo Configuration
- **Tool**: pnpm workspaces
- **Packages**: `packages/frontend`, `packages/backend`, `packages/shared`
- **Shared package**: types, constants, utilities shared between frontend/backend

---

## Development Setup

### Prerequisites
- Node.js v20+
- pnpm v8+
- Docker + Docker Compose
- Git

### Setup Commands
```bash
git clone <repo-url>
cd acr-management-system
pnpm install
cp .env.example .env
docker-compose up -d          # Start MSSQL + Redis + LocalStack
pnpm --filter backend prisma migrate dev   # Run migrations
pnpm --filter backend prisma db seed       # Seed default data
pnpm dev                      # Start frontend + backend concurrently
```

### Environment Variables
| Variable | Description | Example |
|----------|-------------|---------|
| DATABASE_URL | MSSQL connection string | sqlserver://localhost:1433;database=acr;user=sa;password=xxx |
| JWT_SECRET | JWT signing secret | random-32-char-string |
| JWT_EXPIRY | Access token expiry | 15m |
| JWT_REFRESH_EXPIRY | Refresh token expiry | 7d |
| REDIS_URL | Redis connection | redis://localhost:6379 |
| AWS_REGION | AWS region | ap-southeast-1 |
| S3_BUCKET_ATTACHMENTS | S3 bucket name | acr-attachments-dev |
| SES_FROM_EMAIL | Sender email | no-reply@dits.co.th |
| FRONTEND_URL | Frontend base URL | http://localhost:5173 |
| MAX_FILE_SIZE_MB | Max upload size | 10 |

---

## Testing

**Unit Tests**: Jest — `pnpm --filter backend test`
**Integration Tests**: Jest + Supertest — `pnpm --filter backend test:integration`
**E2E Tests**: Playwright — `pnpm --filter frontend test:e2e`
**PBT**: fast-check (in Jest) — `pnpm --filter backend test:properties`

**Coverage Target**: 80% (backend), 70% (frontend)

**Test Organization**:
```
packages/backend/test/
  ├── unit/              # Pure logic tests (services, validators)
  ├── integration/       # API tests with real DB (test containers)
  ├── e2e/              # Full flow tests
  └── properties/        # Property-based tests (fast-check)
      ├── workflow.properties.test.ts
      ├── audit.properties.test.ts
      └── rbac.properties.test.ts
```
