import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Attachment } from '@prisma/client';

/**
 * AttachmentRepository — Data access layer for attachment records.
 *
 * Provides CRUD operations for the Attachment model.
 * Supports soft-delete pattern (isDeleted flag) — physical deletes
 * are handled only by admin cleanup jobs.
 */
@Injectable()
export class AttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an attachment record.
   */
  async create(data: {
    changeRequestId: string;
    uploadedById: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    s3Key: string;
    workflowStep?: string;
  }): Promise<Attachment> {
    return this.prisma.attachment.create({
      data: {
        changeRequestId: data.changeRequestId,
        uploadedById: data.uploadedById,
        fileName: data.fileName,
        fileType: data.fileType,
        fileSize: data.fileSize,
        s3Key: data.s3Key,
        workflowStep: data.workflowStep ?? null,
      },
    });
  }

  /**
   * Find attachment by ID (non-deleted only).
   */
  async findById(id: string): Promise<Attachment | null> {
    return this.prisma.attachment.findFirst({
      where: { id, isDeleted: false },
    });
  }

  /**
   * Find all non-deleted attachments for a Change Request.
   */
  async findByChangeRequestId(crId: string): Promise<Attachment[]> {
    return this.prisma.attachment.findMany({
      where: { changeRequestId: crId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Soft-delete an attachment (set isDeleted = true).
   */
  async softDelete(id: string): Promise<Attachment> {
    return this.prisma.attachment.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
