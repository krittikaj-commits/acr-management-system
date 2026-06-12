-- ============================================================================
-- AuditLog Immutability Triggers
-- Prevents UPDATE and DELETE on the AuditLog table at the database level.
-- This ensures the audit trail cannot be tampered with, even if application
-- logic is bypassed.
-- Database: Microsoft SQL Server
-- ============================================================================

-- Trigger: Prevent UPDATE on AuditLog
IF OBJECT_ID('dbo.trg_AuditLog_PreventUpdate', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_AuditLog_PreventUpdate;
GO

CREATE TRIGGER dbo.trg_AuditLog_PreventUpdate
ON dbo.AuditLog
INSTEAD OF UPDATE
AS
BEGIN
    RAISERROR('UPDATE operations are not allowed on the AuditLog table. Audit logs are immutable.', 16, 1);
    ROLLBACK TRANSACTION;
END;
GO

-- Trigger: Prevent DELETE on AuditLog
IF OBJECT_ID('dbo.trg_AuditLog_PreventDelete', 'TR') IS NOT NULL
    DROP TRIGGER dbo.trg_AuditLog_PreventDelete;
GO

CREATE TRIGGER dbo.trg_AuditLog_PreventDelete
ON dbo.AuditLog
INSTEAD OF DELETE
AS
BEGIN
    RAISERROR('DELETE operations are not allowed on the AuditLog table. Audit logs are immutable.', 16, 1);
    ROLLBACK TRANSACTION;
END;
GO
