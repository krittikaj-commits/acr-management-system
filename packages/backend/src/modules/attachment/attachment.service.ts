import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { S3Service } from './s3.service';
import { AttachmentRepository } from './attachment.repository';
import { RequestUploadDto } from './dto/request-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { Attachment } from '@prisma/client';

/** Allowed file extensions for upload validation. */
const ALLOWED_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'zip',
];

/** Map of extensions to MIME content types. */
const EXTENSION_CONTENT_TYPE: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  zip: 'application/zip',
};

/**
 * AttachmentService — Manages file attachments for Change Requests.
 *
 * Responsibilities:
 * - Validate file type and size before generating presigned upload URLs
 * - Generate presigned upload/download URLs via S3Service
 * - Link attachments to Change Requests and workflow steps
 * - Soft-delete attachments
 */
@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);
  private readonly maxFileSizeBytes: number;

  constructor(
    private readonly s3Service: S3Service,
    private readonly attachmentRepository: AttachmentRepository,
  ) {
    const maxMb = parseInt(process.env.MAX_FILE_SIZE_MB ?? '10', 10);
    this.maxFileSizeBytes = maxMb * 1024 * 1024;
  }

  /**
   * Request a presigned upload URL after validating file type and size.
   *
   * @param dto - Upload request details (CR ID, file name, type, size)
   * @param userId - ID of the requesting user
   * @returns Object with uploadUrl, s3Key, and expiresAt
   */
  async requestUploadUrl(
    dto: RequestUploadDto,
    userId: string,
  ): Promise<{ uploadUrl: string; s3Key: string; expiresAt: Date }> {
    // Validate file type
    const extension = this.extractExtension(dto.fileName);
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      throw new BadRequestException(
        `File type '${extension}' is not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`,
      );
    }

    // Validate file size
    if (dto.fileSize > this.maxFileSizeBytes) {
      const maxMb = this.maxFileSizeBytes / (1024 * 1024);
      throw new BadRequestException(
        `File size ${dto.fileSize} bytes exceeds maximum allowed size of ${maxMb}MB`,
      );
    }

    // Generate S3 key: attachments/{crId}/{uuid}/{fileName}
    const fileUuid = randomUUID();
    const s3Key = `attachments/${dto.changeRequestId}/${fileUuid}/${dto.fileName}`;

    // Get content type from extension
    const contentType = EXTENSION_CONTENT_TYPE[extension] ?? 'application/octet-stream';

    // Generate presigned upload URL (5 min expiry)
    const expiresInSeconds = 300;
    const uploadUrl = await this.s3Service.getPresignedUploadUrl(s3Key, contentType, expiresInSeconds);

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    this.logger.log(
      `Generated upload URL for CR ${dto.changeRequestId}, file: ${dto.fileName}, user: ${userId}`,
    );

    return { uploadUrl, s3Key, expiresAt };
  }

  /**
   * Confirm a completed upload and create the attachment record in the database.
   *
   * @param dto - Confirm upload details (CR ID, S3 key, file info)
   * @param userId - ID of the uploading user
   * @returns The created Attachment record
   */
  async confirmUpload(dto: ConfirmUploadDto, userId: string): Promise<Attachment> {
    const attachment = await this.attachmentRepository.create({
      changeRequestId: dto.changeRequestId,
      uploadedById: userId,
      fileName: dto.fileName,
      fileType: dto.fileType,
      fileSize: dto.fileSize,
      s3Key: dto.s3Key,
      workflowStep: dto.workflowStep,
    });

    this.logger.log(
      `Attachment confirmed: ${attachment.id} for CR ${dto.changeRequestId}, step: ${dto.workflowStep ?? 'none'}`,
    );

    return attachment;
  }

  /**
   * Get a presigned download URL for an attachment.
   *
   * @param attachmentId - ID of the attachment
   * @returns Object with downloadUrl, fileName, and fileType
   */
  async getDownloadUrl(
    attachmentId: string,
  ): Promise<{ downloadUrl: string; fileName: string; fileType: string }> {
    const attachment = await this.attachmentRepository.findById(attachmentId);

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID '${attachmentId}' not found`);
    }

    const downloadUrl = await this.s3Service.getPresignedDownloadUrl(attachment.s3Key);

    return {
      downloadUrl,
      fileName: attachment.fileName,
      fileType: attachment.fileType,
    };
  }

  /**
   * Soft-delete an attachment (marks isDeleted = true).
   *
   * @param attachmentId - ID of the attachment to delete
   * @returns The updated attachment record
   */
  async softDelete(attachmentId: string): Promise<Attachment> {
    const attachment = await this.attachmentRepository.findById(attachmentId);

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID '${attachmentId}' not found`);
    }

    const deleted = await this.attachmentRepository.softDelete(attachmentId);
    this.logger.log(`Attachment soft-deleted: ${attachmentId}`);
    return deleted;
  }

  /**
   * Find all non-deleted attachments for a Change Request.
   *
   * @param crId - Change Request ID
   * @returns Array of Attachment records
   */
  async findByChangeRequestId(crId: string): Promise<Attachment[]> {
    return this.attachmentRepository.findByChangeRequestId(crId);
  }

  /**
   * Extract file extension from file name (lowercase).
   */
  private extractExtension(fileName: string): string {
    const parts = fileName.split('.');
    if (parts.length < 2) return '';
    return parts[parts.length - 1].toLowerCase();
  }
}
