# Non-Functional Requirements & Infrastructure

---

## Performance

- **Response Time**: < 3 วินาที สำหรับหน้าจอทั่วไป (p95); Reports/Export อาจนานกว่า (< 10s)
- **Throughput**: ~50 req/sec (internal system, ~200 users)
- **Concurrent Users**: Normal: 30, Peak: 100

---

## Scalability

- **Horizontal Scaling**: ECS Fargate min 1 → max 3 tasks, trigger: CPU > 70% or memory > 80%
- **Database Scaling**: Single RDS instance (MSSQL Express); read replica ไม่รองรับใน Express edition — sufficient for ~200 users
- **Rate Limiting**: 100 req/min per authenticated user, 20 req/min per anonymous IP

---

## Security

- **Authentication**: Local email + password (bcrypt hashed, min 8 chars); JWT (RS256 in future, HS256 for MVP)
- **Authorization**: RBAC — 8 roles with permission matrix
- **Encryption**: At rest (RDS encryption enabled), In transit (TLS 1.2+ — ALB → ECS, CloudFront → S3)
- **Compliance**: ISO27001 aligned (audit log immutability, access control, data retention)
- **Secret Management**: AWS Secrets Manager (DB password, JWT secret, SES credentials)
- **Input Validation**: Zod schemas at API boundary (every endpoint validates input)
- **Security Headers**: Helmet.js (NestJS middleware) — CSP, HSTS, X-Frame-Options, etc.

**Roles & Permissions**:

| Role | Create CR | View CR | Edit CR | Assign | Review | Approve | Implement | Verify | Admin | Audit |
|------|-----------|---------|---------|--------|--------|---------|-----------|--------|-------|-------|
| Requester | ✓(own) | ✓(own) | ✓(own,draft) | — | — | — | — | — | — | — |
| Approver Request | — | ✓(assigned) | — | — | — | ✓(pre) | — | — | — | — |
| Call Center | — | ✓(all) | — | ✓ | — | — | — | — | — | — |
| IT Reviewer | — | ✓(assigned) | ✓(IT fields) | — | ✓ | — | — | ✓ | — | — |
| Approver | — | ✓(pending) | — | — | — | ✓ | — | — | — | — |
| Implementer | — | ✓(assigned) | ✓(impl fields) | — | — | — | ✓ | ✓ | — | — |
| Auditor | — | ✓(all) | — | — | — | — | — | — | — | ✓ |
| Admin | ✓ | ✓(all) | ✓(all) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Availability & Reliability

- **Uptime SLA**: ≥ 99% (allows ~7.3 hours downtime/month)
- **RPO**: 24 hours (daily automated backup)
- **RTO**: 4 hours (restore from latest backup + redeploy)
- **Backup**: RDS automated backups (daily, 7-day retention); S3 versioning enabled
- **Health Check**: `GET /api/v1/health` — checks DB, Redis, S3 connectivity; ECS health check every 30s

---

## Infrastructure

### Compute
| Component | Service | Configuration |
|-----------|---------|---------------|
| Backend API | ECS Fargate | 0.5 vCPU, 1GB RAM, min 1 max 3 tasks |
| Frontend | S3 + CloudFront | Static hosting, edge-cached |
| Background Jobs | Same ECS task (NestJS scheduler) | Cron: email retry, cleanup |

### Storage
| Data Type | Service | Configuration |
|-----------|---------|---------------|
| Application Data | RDS MSSQL Express | db.t3.small, 20GB gp3, encryption enabled |
| Attachments | S3 | Standard tier, versioning enabled, lifecycle: IA after 90 days |
| Session/Cache | ElastiCache Redis | cache.t3.micro, single node |

### Networking
| Component | Service | Configuration |
|-----------|---------|---------------|
| Load Balancer | ALB | HTTPS termination, path-based routing |
| CDN | CloudFront | Frontend distribution, custom domain + ACM cert |
| DNS | Route 53 | Custom domain |
| VPC | Custom VPC | 2 AZs, public + private subnets |

---

## Caching

| Data | Technology | TTL | Invalidation |
|------|-----------|-----|--------------|
| Master Data (services, impact levels) | Redis | 1 hour | On admin update (publish invalidation event) |
| User sessions | Redis | 24 hours | On logout/password change |
| Workflow definitions | Redis | 30 min | On admin update |
| Rate limit counters | Redis | 1 min | Auto-expire |

---

## Data Management

- **Migration Tool**: Prisma Migrate (auto-generated from schema changes)
- **Retention**: เก็บถาวรทั้งหมด (CR data + audit log ไม่มี purge)
- **Archival**: ไม่มี (เก็บทั้งหมดใน active DB)
- **Deletion**: Soft delete สำหรับ master data (isActive=false); No delete สำหรับ CR + Audit

---

## Observability

| Concern | Tool | Configuration |
|---------|------|---------------|
| Logging | Winston → CloudWatch Logs | JSON structured, 30-day retention |
| Metrics | CloudWatch Metrics | Custom: request count, latency, error rate |
| Tracing | None (Phase 1) | Future: AWS X-Ray |
| Error Tracking | CloudWatch Logs + Alarms | Filter pattern for ERROR level |
| Alerting | CloudWatch Alarms → SNS → Email | Error rate > 5%, Response time p95 > 5s, CPU > 80% |

---

## CI/CD & Deployment

| Environment | Trigger | URL |
|-------------|---------|-----|
| Development (local) | Docker Compose | http://localhost:5173 (FE), http://localhost:3000 (BE) |
| Staging | Push to `develop` branch | https://staging.acr.dits.co.th |
| Production | Manual approval (PR to `main`) | https://acr.dits.co.th |

**Deploy Strategy**: Rolling update (ECS) — min healthy 50%, max 200%
**Rollback**: ECS task definition revision rollback (< 5 min)

**GitHub Actions Pipeline**:
```
PR → lint → unit test → build → integration test
merge to develop → deploy staging (auto)
merge to main → deploy production (manual approval)
```
