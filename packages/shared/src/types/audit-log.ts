/** Audit Log entity interface (immutable, append-only) */
export interface IAuditLog {
  id: string;
  userId: string | null;
  userEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: Date;
}
