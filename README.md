# ACR Management System

ระบบบริหารจัดการคำขอเปลี่ยนแปลง/แก้ไขสิทธิและระบบสารสนเทศ (Change Request) แบบครบวงจร

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + MUI
- **Backend**: NestJS + TypeScript + Prisma + MSSQL
- **Infrastructure**: AWS (ECS, S3, CloudFront, RDS, ElastiCache, SES) + Terraform
- **Local Dev**: Docker Compose (MSSQL + Redis + LocalStack)

## Prerequisites

- Node.js v20+
- pnpm v8+
- Docker + Docker Compose

## Getting Started

```bash
pnpm install
cp .env.example .env
docker-compose up -d
pnpm dev
```

## Project Structure

```
├── packages/
│   ├── frontend/    # React SPA (Vite)
│   ├── backend/     # NestJS API
│   └── shared/      # Shared types, constants, utilities
├── infra/           # Terraform IaC
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── eslint.config.js
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all packages in dev mode |
| `pnpm build` | Build all packages |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint errors |
| `pnpm test` | Run tests |
| `pnpm format` | Format code with Prettier |
| `pnpm format:check` | Check formatting |
