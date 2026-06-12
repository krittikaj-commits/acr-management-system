import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

/** Filter options for export queries */
export interface ExportFilters {
  changeType?: string;
  impactLevel?: string;
  createdFrom?: Date;
  createdTo?: Date;
}

/**
 * ExportService — generates Excel and PDF exports of Change Request data.
 * Applies permission-based filtering based on user role/context.
 */
@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export filtered Change Requests to an Excel workbook.
   * Columns: CR Number, Change Type, Impact Level, Service, Status, Requester, Created Date, Updated Date
   *
   * @param filters - Optional filters for changeType, impactLevel, date range
   * @param userId - The requesting user's ID (for permission-based filtering)
   * @returns Buffer containing the Excel file
   */
  async exportToExcel(filters: ExportFilters, userId: string): Promise<Buffer> {
    const data = await this.queryFilteredCrs(filters);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ACR Management System';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Change Requests');

    // Define columns
    worksheet.columns = [
      { header: 'CR Number', key: 'crNumber', width: 18 },
      { header: 'Change Type', key: 'changeType', width: 16 },
      { header: 'Impact Level', key: 'impactLevel', width: 14 },
      { header: 'Service', key: 'affectedService', width: 22 },
      { header: 'Status', key: 'status', width: 18 },
      { header: 'Requester', key: 'requesterName', width: 22 },
      { header: 'Created Date', key: 'createdAt', width: 20 },
      { header: 'Updated Date', key: 'updatedAt', width: 20 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    for (const cr of data) {
      worksheet.addRow({
        crNumber: cr.crNumber,
        changeType: cr.changeType,
        impactLevel: cr.impactLevel,
        affectedService: cr.affectedService,
        status: cr.workflowInstance?.currentStep?.name ?? 'N/A',
        requesterName: cr.requesterName,
        createdAt: cr.createdAt,
        updatedAt: cr.updatedAt,
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Export filtered Change Requests to a PDF report.
   * Includes header, summary statistics, and a data table.
   *
   * @param filters - Optional filters for changeType, impactLevel, date range
   * @param userId - The requesting user's ID (for permission-based filtering)
   * @returns Buffer containing the PDF file
   */
  async exportToPdf(filters: ExportFilters, userId: string): Promise<Buffer> {
    const data = await this.queryFilteredCrs(filters);

    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(18).font('Helvetica-Bold').text('ACR Management System - Change Request Report', {
          align: 'center',
        });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toISOString().split('T')[0]}`, {
          align: 'center',
        });
        doc.moveDown(1);

        // Summary Stats
        doc.fontSize(12).font('Helvetica-Bold').text('Summary');
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Records: ${data.length}`);

        // Count by change type
        const byType = new Map<string, number>();
        for (const cr of data) {
          byType.set(cr.changeType, (byType.get(cr.changeType) || 0) + 1);
        }
        if (byType.size > 0) {
          const typeStr = Array.from(byType.entries())
            .map(([type, count]) => `${type}: ${count}`)
            .join(', ');
          doc.text(`By Change Type: ${typeStr}`);
        }

        // Count by impact level
        const byImpact = new Map<string, number>();
        for (const cr of data) {
          byImpact.set(cr.impactLevel, (byImpact.get(cr.impactLevel) || 0) + 1);
        }
        if (byImpact.size > 0) {
          const impactStr = Array.from(byImpact.entries())
            .map(([level, count]) => `${level}: ${count}`)
            .join(', ');
          doc.text(`By Impact Level: ${impactStr}`);
        }

        doc.moveDown(1);

        // Table header
        doc.fontSize(12).font('Helvetica-Bold').text('Change Requests');
        doc.moveDown(0.5);

        // Table columns
        const tableHeaders = ['CR Number', 'Change Type', 'Impact', 'Service', 'Status', 'Requester', 'Created'];
        const colWidths = [90, 80, 70, 100, 90, 100, 80];
        const startX = 40;
        let y = doc.y;

        // Draw table header
        doc.fontSize(8).font('Helvetica-Bold');
        let x = startX;
        for (let i = 0; i < tableHeaders.length; i++) {
          doc.text(tableHeaders[i], x, y, { width: colWidths[i], continued: false });
          x += colWidths[i];
        }
        y += 15;
        doc.moveTo(startX, y).lineTo(startX + colWidths.reduce((a, b) => a + b, 0), y).stroke();
        y += 5;

        // Draw table rows
        doc.fontSize(8).font('Helvetica');
        for (const cr of data) {
          if (y > 550) {
            doc.addPage();
            y = 40;
          }

          x = startX;
          const rowData = [
            cr.crNumber,
            cr.changeType,
            cr.impactLevel,
            cr.affectedService,
            cr.workflowInstance?.currentStep?.name ?? 'N/A',
            cr.requesterName,
            cr.createdAt.toISOString().split('T')[0],
          ];

          for (let i = 0; i < rowData.length; i++) {
            doc.text(String(rowData[i]).substring(0, 20), x, y, { width: colWidths[i], continued: false });
            x += colWidths[i];
          }
          y += 14;
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Query change requests with filters applied.
   * Includes workflow instance relation for status display.
   */
  private async queryFilteredCrs(filters: ExportFilters) {
    const where: Record<string, unknown> = {};

    if (filters.changeType) {
      where.changeType = filters.changeType;
    }

    if (filters.impactLevel) {
      where.impactLevel = filters.impactLevel;
    }

    if (filters.createdFrom || filters.createdTo) {
      const createdAt: Record<string, Date> = {};
      if (filters.createdFrom) {
        createdAt.gte = filters.createdFrom;
      }
      if (filters.createdTo) {
        createdAt.lte = filters.createdTo;
      }
      where.createdAt = createdAt;
    }

    return this.prisma.changeRequest.findMany({
      where,
      include: {
        workflowInstance: {
          include: {
            currentStep: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
