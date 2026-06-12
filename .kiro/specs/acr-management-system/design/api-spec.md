# API Specification

## Overview
**API Style**: REST
**Base URL**: `/api/v1`
**Auth**: JWT via `Authorization: Bearer <token>` (internal users); Token via query param `?token=xxx` (anonymous/approval links)
**Docs**: Auto-generated Swagger at `/api/docs` (NestJS @nestjs/swagger)

## API Conventions
- **Pagination**: Offset-based — `?page=1&limit=20` → response includes `{ data, meta: { total, page, limit, totalPages } }`
- **Filtering**: `?changeType=normal&impactLevel=high&status=pending`
- **Sorting**: `?sort=createdAt:desc`
- **Rate Limit**: 100 req/min authenticated, 20 req/min anonymous
- **Versioning**: URL-based `/api/v1/`

## Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "impactLevel", "message": "Impact level is required" }
    ]
  }
}
```

## Response Envelope
```json
{
  "data": { ... },
  "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 }
}
```

---

## Endpoints

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | Admin | สร้าง user account |
| POST | /auth/login | Public | Login ด้วย email+password → JWT |
| POST | /auth/refresh | Bearer | Refresh access token |
| POST | /auth/forgot-password | Public | ส่ง reset password email |
| POST | /auth/reset-password | Public (token) | Reset password ด้วย token |
| GET | /auth/me | Bearer | Get current user profile |
| GET | /auth/verify-token/:token | Public | Verify anonymous/approval token |

---

### Change Requests

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /change-requests | Public/Bearer | สร้าง CR (anonymous or authenticated) |
| GET | /change-requests | Bearer | List/search CRs (filtered by role) |
| GET | /change-requests/:id | Bearer/Token | Get CR detail |
| PATCH | /change-requests/:id | Bearer/Token | Update CR fields |
| POST | /change-requests/:id/submit | Token | Submit to next step (Requester) |
| POST | /change-requests/:id/assign | Bearer (CallCenter) | Assign to IT Reviewer |
| POST | /change-requests/:id/submit-approval | Bearer (IT) | Submit for approval |
| POST | /change-requests/:id/approve | Bearer/Token | Approve CR |
| POST | /change-requests/:id/reject | Bearer/Token | Reject CR (reason required) |
| POST | /change-requests/:id/implement | Bearer (Implementer) | Record deployment |
| POST | /change-requests/:id/verify | Bearer (IT/Impl) | Record verification result |
| POST | /change-requests/:id/close | Bearer (IT) | Close CR |
| GET | /change-requests/:id/history | Bearer | View change history |
| GET | /change-requests/:id/attachments | Bearer/Token | List attachments |
| GET | /change-requests/track/:token | Public | Track CR by anonymous token |

---

### Workflows (Admin)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /workflows | Bearer (Admin) | List workflow definitions |
| POST | /workflows | Bearer (Admin) | Create new workflow |
| GET | /workflows/:id | Bearer (Admin) | Get workflow detail + steps |
| PUT | /workflows/:id | Bearer (Admin) | Update workflow (new version) |
| POST | /workflows/:id/steps | Bearer (Admin) | Add step |
| PUT | /workflows/:id/steps/:stepId | Bearer (Admin) | Update step |
| DELETE | /workflows/:id/steps/:stepId | Bearer (Admin) | Remove step |
| POST | /workflows/:id/conditions | Bearer (Admin) | Add/update conditions |
| POST | /workflows/:id/validate | Bearer (Admin) | Validate workflow integrity |
| POST | /workflows/:id/activate | Bearer (Admin) | Set as active/default |

---

### Attachments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /attachments/upload-url | Bearer/Token | Get presigned S3 upload URL |
| POST | /attachments/confirm | Bearer/Token | Confirm upload complete, link to CR |
| GET | /attachments/:id/download-url | Bearer/Token | Get presigned download URL |
| DELETE | /attachments/:id | Bearer | Soft delete attachment |

---

### Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /notifications | Bearer | List notifications (paginated) |
| GET | /notifications/unread-count | Bearer | Get unread count |
| PATCH | /notifications/:id/read | Bearer | Mark as read |
| PATCH | /notifications/read-all | Bearer | Mark all as read |

---

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /admin/users | Bearer (Admin) | List users |
| POST | /admin/users | Bearer (Admin) | Create user |
| PUT | /admin/users/:id | Bearer (Admin) | Update user/role |
| DELETE | /admin/users/:id | Bearer (Admin) | Deactivate user |
| GET | /admin/master-data/:category | Bearer (Admin) | List by category |
| POST | /admin/master-data | Bearer (Admin) | Create master data item |
| PUT | /admin/master-data/:id | Bearer (Admin) | Update item |
| DELETE | /admin/master-data/:id | Bearer (Admin) | Soft-disable item |
| GET | /admin/config | Bearer (Admin) | Get system config |
| PUT | /admin/config | Bearer (Admin) | Update system config |

---

### Audit Logs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /audit-logs | Bearer (Auditor/Admin) | Search/filter audit logs |
| GET | /audit-logs/entity/:type/:id | Bearer (Auditor/Admin) | Audit trail for entity |

---

### Reports

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /reports/dashboard | Bearer | Dashboard statistics |
| GET | /reports/export | Bearer | Export filtered data (format query param) |

---

### Approvals

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /approvals/pending | Bearer (Approver) | List pending approvals |

---

## WebSocket Events

**Namespace**: `/notifications`
**Auth**: JWT token in handshake query

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| notification:new | Server → Client | `{ id, type, title, message, crId, timestamp }` | New notification push |
| notification:count | Server → Client | `{ unreadCount }` | Updated unread count |
