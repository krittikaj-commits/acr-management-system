import { Module } from '@nestjs/common';
import { AttachmentController } from './attachment.controller';
import { AttachmentService } from './attachment.service';
import { AttachmentRepository } from './attachment.repository';
import { S3Service } from './s3.service';

/**
 * AttachmentModule — Provides file attachment management for Change Requests.
 *
 * Features:
 * - Presigned upload/download URL generation via S3
 * - File type and size validation
 * - Attachment records linked to CR + workflow step
 * - Soft-delete support
 */
@Module({
  controllers: [AttachmentController],
  providers: [AttachmentService, AttachmentRepository, S3Service],
  exports: [AttachmentService, AttachmentRepository],
})
export class AttachmentModule {}
