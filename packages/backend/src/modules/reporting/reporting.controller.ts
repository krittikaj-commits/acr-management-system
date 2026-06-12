import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { ExportService, ExportFilters } from './export.service';
import { Roles, CurrentUser } from '../../common/decorators';

/**
 * ReportingController — REST endpoints for dashboard statistics and reports.
 * Restricted to admin, auditor, and approver roles.
 */
@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly exportService: ExportService,
  ) {}

  /**
   * GET /reports/dashboard — Dashboard statistics.
   * Returns aggregated CR counts by month, status, impact, change type,
   * average time to close, and total/open/closed counts.
   */
  @Get('dashboard')
  @Roles('admin', 'auditor', 'approver')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics including CR counts and averages',
    schema: {
      type: 'object',
      properties: {
        crCountByMonth: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              month: { type: 'string', example: '2025-01' },
              count: { type: 'number', example: 15 },
            },
          },
        },
        crCountByStatus: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: { type: 'string', example: 'IT Review' },
              count: { type: 'number', example: 8 },
            },
          },
        },
        crCountByImpact: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              impactLevel: { type: 'string', example: 'High' },
              count: { type: 'number', example: 12 },
            },
          },
        },
        crCountByChangeType: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              changeType: { type: 'string', example: 'Application' },
              count: { type: 'number', example: 20 },
            },
          },
        },
        averageTimeToClose: { type: 'number', example: 5.5 },
        totalCrs: { type: 'number', example: 100 },
        openCrs: { type: 'number', example: 35 },
        closedCrs: { type: 'number', example: 65 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied: insufficient role' })
  async getDashboardStats() {
    return this.reportingService.getDashboardStats();
  }

  /**
   * GET /reports/export/excel — Export filtered CRs as Excel file.
   */
  @Get('export/excel')
  @Roles('admin', 'auditor')
  @ApiOperation({ summary: 'Export Change Requests as Excel file' })
  @ApiQuery({ name: 'changeType', required: false, description: 'Filter by change type' })
  @ApiQuery({ name: 'impactLevel', required: false, description: 'Filter by impact level' })
  @ApiQuery({ name: 'createdFrom', required: false, description: 'Filter by start date (ISO 8601)' })
  @ApiQuery({ name: 'createdTo', required: false, description: 'Filter by end date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'Excel file download' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied: insufficient role' })
  async exportExcel(
    @Query('changeType') changeType?: string,
    @Query('impactLevel') impactLevel?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @CurrentUser('id') userId?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const filters: ExportFilters = {
      changeType,
      impactLevel,
      createdFrom: createdFrom ? new Date(createdFrom) : undefined,
      createdTo: createdTo ? new Date(createdTo) : undefined,
    };

    const buffer = await this.exportService.exportToExcel(filters, userId || '');

    const filename = `change-requests-${new Date().toISOString().split('T')[0]}.xlsx`;

    res!.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });

    res!.end(buffer);
  }

  /**
   * GET /reports/export/pdf — Export filtered CRs as PDF report.
   */
  @Get('export/pdf')
  @Roles('admin', 'auditor')
  @ApiOperation({ summary: 'Export Change Requests as PDF report' })
  @ApiQuery({ name: 'changeType', required: false, description: 'Filter by change type' })
  @ApiQuery({ name: 'impactLevel', required: false, description: 'Filter by impact level' })
  @ApiQuery({ name: 'createdFrom', required: false, description: 'Filter by start date (ISO 8601)' })
  @ApiQuery({ name: 'createdTo', required: false, description: 'Filter by end date (ISO 8601)' })
  @ApiResponse({ status: 200, description: 'PDF file download' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Access denied: insufficient role' })
  async exportPdf(
    @Query('changeType') changeType?: string,
    @Query('impactLevel') impactLevel?: string,
    @Query('createdFrom') createdFrom?: string,
    @Query('createdTo') createdTo?: string,
    @CurrentUser('id') userId?: string,
    @Res() res?: Response,
  ): Promise<void> {
    const filters: ExportFilters = {
      changeType,
      impactLevel,
      createdFrom: createdFrom ? new Date(createdFrom) : undefined,
      createdTo: createdTo ? new Date(createdTo) : undefined,
    };

    const buffer = await this.exportService.exportToPdf(filters, userId || '');

    const filename = `change-requests-report-${new Date().toISOString().split('T')[0]}.pdf`;

    res!.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });

    res!.end(buffer);
  }
}
