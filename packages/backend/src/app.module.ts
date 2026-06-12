import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuditModule } from './modules/audit/audit.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { ChangeRequestModule } from './modules/change-request/change-request.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AttachmentModule } from './modules/attachment/attachment.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [PrismaModule, HealthModule, RedisModule, AuthModule, AuditModule, WorkflowModule, ChangeRequestModule, ApprovalModule, NotificationModule, AttachmentModule, AdminModule, ReportingModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
