import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { ExportService } from './export.service';
import { ReportingController } from './reporting.controller';

/**
 * ReportingModule — provides dashboard statistics, reporting endpoints,
 * and Excel/PDF export functionality.
 */
@Module({
  controllers: [ReportingController],
  providers: [ReportingService, ExportService],
  exports: [ReportingService, ExportService],
})
export class ReportingModule {}
