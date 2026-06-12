import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  HttpStatus,
  HttpCode,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AttachmentService } from './attachment.service';
import { RequestUploadSchema, RequestUploadDto } from './dto/request-upload.dto';
import { ConfirmUploadSchema, ConfirmUploadDto } from './dto/confirm-upload.dto';

/** JWT payload shape extracted by @CurrentUser() */
interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

/**
 * AttachmentController — REST endpoints for file attachment management.
 *
 * Provides presigned upload/download URLs and soft-delete functionality.
 * All endpoints require authentication (JWT Bearer).
 */
@ApiTags('Attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentController {
  constructor(private readonly attachmentService: AttachmentService) {}

  /**
   * POST /attachments/upload-url — Request a presigned S3 upload URL.
   */
  @Post('upload-url')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(RequestUploadSchema))
  @ApiOperation({ summary: 'Request a presigned S3 upload URL' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['changeRequestId', 'fileName', 'fileType', 'fileSize'],
      properties: {
        changeRequestId: { type: 'string', format: 'uuid', description: 'Change Request UUID' },
        fileName: { type: 'string', description: 'Original file name', example: 'document.pdf' },
        fileType: { type: 'string', description: 'MIME type', example: 'application/pdf' },
        fileSize: { type: 'number', description: 'File size in bytes', example: 1048576 },
        workflowStep: { type: 'string', description: 'Associated workflow step (optional)' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Presigned upload URL generated' })
  @ApiResponse({ status: 400, description: 'Validation error (invalid file type or size)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async requestUploadUrl(
    @Body() dto: RequestUploadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.attachmentService.requestUploadUrl(dto, user.sub);
    return { data: result };
  }

  /**
   * POST /attachments/confirm — Confirm upload completed and create attachment record.
   */
  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(ConfirmUploadSchema))
  @ApiOperation({ summary: 'Confirm upload completed and link attachment to CR' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['changeRequestId', 's3Key', 'fileName', 'fileType', 'fileSize'],
      properties: {
        changeRequestId: { type: 'string', format: 'uuid', description: 'Change Request UUID' },
        s3Key: { type: 'string', description: 'S3 key returned from upload-url' },
        fileName: { type: 'string', description: 'Original file name' },
        fileType: { type: 'string', description: 'MIME type' },
        fileSize: { type: 'number', description: 'File size in bytes' },
        workflowStep: { type: 'string', description: 'Associated workflow step (optional)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Attachment record created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async confirmUpload(
    @Body() dto: ConfirmUploadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const attachment = await this.attachmentService.confirmUpload(dto, user.sub);
    return { data: attachment };
  }

  /**
   * GET /attachments/:id/download-url — Get a presigned download URL for an attachment.
   */
  @Get(':id/download-url')
  @ApiOperation({ summary: 'Get a presigned download URL for an attachment' })
  @ApiParam({ name: 'id', description: 'Attachment UUID' })
  @ApiResponse({ status: 200, description: 'Presigned download URL returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async getDownloadUrl(@Param('id') id: string) {
    const result = await this.attachmentService.getDownloadUrl(id);
    return { data: result };
  }

  /**
   * DELETE /attachments/:id — Soft-delete an attachment.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete an attachment' })
  @ApiParam({ name: 'id', description: 'Attachment UUID' })
  @ApiResponse({ status: 200, description: 'Attachment soft-deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async softDelete(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const attachment = await this.attachmentService.softDelete(id);
    return { data: attachment };
  }
}
