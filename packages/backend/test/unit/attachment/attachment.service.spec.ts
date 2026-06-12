import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AttachmentService } from '../../../src/modules/attachment/attachment.service';
import { AttachmentRepository } from '../../../src/modules/attachment/attachment.repository';
import { S3Service } from '../../../src/modules/attachment/s3.service';
import { RequestUploadDto } from '../../../src/modules/attachment/dto/request-upload.dto';
import { ConfirmUploadDto } from '../../../src/modules/attachment/dto/confirm-upload.dto';

describe('AttachmentService', () => {
  let service: AttachmentService;
  let s3Service: S3Service;
  let attachmentRepository: AttachmentRepository;

  const mockS3Service = {
    getPresignedUploadUrl: jest.fn(),
    getPresignedDownloadUrl: jest.fn(),
    deleteObject: jest.fn(),
  };

  const mockAttachmentRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByChangeRequestId: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    // Set env for max file size
    process.env.MAX_FILE_SIZE_MB = '10';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttachmentService,
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: AttachmentRepository,
          useValue: mockAttachmentRepository,
        },
      ],
    }).compile();

    service = module.get<AttachmentService>(AttachmentService);
    s3Service = module.get<S3Service>(S3Service);
    attachmentRepository = module.get<AttachmentRepository>(AttachmentRepository);

    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.MAX_FILE_SIZE_MB;
  });

  describe('requestUploadUrl', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const validDto: RequestUploadDto = {
      changeRequestId: 'cr-uuid-001',
      fileName: 'evidence-screenshot.png',
      fileType: 'image/png',
      fileSize: 2 * 1024 * 1024, // 2MB
      workflowStep: 'IT Review',
    };

    it('should generate a valid presigned upload URL for an allowed file type', async () => {
      const expectedUrl = 'https://s3.amazonaws.com/acr-attachments/presigned-put-url';
      mockS3Service.getPresignedUploadUrl.mockResolvedValue(expectedUrl);

      const result = await service.requestUploadUrl(validDto, userId);

      expect(result.uploadUrl).toBe(expectedUrl);
      expect(result.s3Key).toMatch(
        /^attachments\/cr-uuid-001\/[0-9a-f-]+\/evidence-screenshot\.png$/,
      );
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());

      expect(mockS3Service.getPresignedUploadUrl).toHaveBeenCalledWith(
        expect.stringContaining('attachments/cr-uuid-001/'),
        'image/png',
        300,
      );
    });

    it('should reject an invalid file type', async () => {
      const invalidDto: RequestUploadDto = {
        ...validDto,
        fileName: 'malware.exe',
      };

      await expect(service.requestUploadUrl(invalidDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.requestUploadUrl(invalidDto, userId)).rejects.toThrow(
        /not allowed/,
      );
      expect(mockS3Service.getPresignedUploadUrl).not.toHaveBeenCalled();
    });

    it('should reject a file exceeding MAX_FILE_SIZE_MB', async () => {
      const oversizedDto: RequestUploadDto = {
        ...validDto,
        fileSize: 15 * 1024 * 1024, // 15MB exceeds 10MB limit
      };

      await expect(service.requestUploadUrl(oversizedDto, userId)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.requestUploadUrl(oversizedDto, userId)).rejects.toThrow(
        /exceeds maximum/,
      );
      expect(mockS3Service.getPresignedUploadUrl).not.toHaveBeenCalled();
    });

    it('should accept all allowed file extensions', async () => {
      const allowedFiles = [
        'doc.pdf',
        'report.doc',
        'plan.docx',
        'data.xls',
        'sheet.xlsx',
        'image.png',
        'photo.jpg',
        'picture.jpeg',
        'animation.gif',
        'archive.zip',
      ];

      mockS3Service.getPresignedUploadUrl.mockResolvedValue('https://s3.example.com/url');

      for (const fileName of allowedFiles) {
        const dto: RequestUploadDto = { ...validDto, fileName };
        const result = await service.requestUploadUrl(dto, userId);
        expect(result.uploadUrl).toBeTruthy();
      }

      expect(mockS3Service.getPresignedUploadUrl).toHaveBeenCalledTimes(allowedFiles.length);
    });

    it('should generate unique S3 keys for repeated uploads', async () => {
      mockS3Service.getPresignedUploadUrl.mockResolvedValue('https://s3.example.com/url');

      const result1 = await service.requestUploadUrl(validDto, userId);
      const result2 = await service.requestUploadUrl(validDto, userId);

      expect(result1.s3Key).not.toBe(result2.s3Key);
    });
  });

  describe('confirmUpload', () => {
    const userId = '550e8400-e29b-41d4-a716-446655440000';
    const confirmDto: ConfirmUploadDto = {
      changeRequestId: 'cr-uuid-001',
      s3Key: 'attachments/cr-uuid-001/abc-123/evidence.png',
      fileName: 'evidence.png',
      fileType: 'image/png',
      fileSize: 2048000,
      workflowStep: 'IT Review',
    };

    it('should create an attachment record linked to the CR and workflow step', async () => {
      const expectedAttachment = {
        id: 'attachment-uuid-001',
        changeRequestId: confirmDto.changeRequestId,
        uploadedById: userId,
        fileName: confirmDto.fileName,
        fileType: confirmDto.fileType,
        fileSize: confirmDto.fileSize,
        s3Key: confirmDto.s3Key,
        workflowStep: confirmDto.workflowStep,
        isDeleted: false,
        createdAt: new Date(),
      };

      mockAttachmentRepository.create.mockResolvedValue(expectedAttachment);

      const result = await service.confirmUpload(confirmDto, userId);

      expect(result).toEqual(expectedAttachment);
      expect(mockAttachmentRepository.create).toHaveBeenCalledWith({
        changeRequestId: confirmDto.changeRequestId,
        uploadedById: userId,
        fileName: confirmDto.fileName,
        fileType: confirmDto.fileType,
        fileSize: confirmDto.fileSize,
        s3Key: confirmDto.s3Key,
        workflowStep: confirmDto.workflowStep,
      });
    });

    it('should handle confirmUpload without workflowStep', async () => {
      const dtoWithoutStep: ConfirmUploadDto = {
        changeRequestId: 'cr-uuid-002',
        s3Key: 'attachments/cr-uuid-002/def-456/doc.pdf',
        fileName: 'doc.pdf',
        fileType: 'application/pdf',
        fileSize: 500000,
      };

      const expectedAttachment = {
        id: 'attachment-uuid-002',
        changeRequestId: dtoWithoutStep.changeRequestId,
        uploadedById: userId,
        fileName: dtoWithoutStep.fileName,
        fileType: dtoWithoutStep.fileType,
        fileSize: dtoWithoutStep.fileSize,
        s3Key: dtoWithoutStep.s3Key,
        workflowStep: null,
        isDeleted: false,
        createdAt: new Date(),
      };

      mockAttachmentRepository.create.mockResolvedValue(expectedAttachment);

      const result = await service.confirmUpload(dtoWithoutStep, userId);

      expect(result.workflowStep).toBeNull();
      expect(mockAttachmentRepository.create).toHaveBeenCalledWith({
        changeRequestId: dtoWithoutStep.changeRequestId,
        uploadedById: userId,
        fileName: dtoWithoutStep.fileName,
        fileType: dtoWithoutStep.fileType,
        fileSize: dtoWithoutStep.fileSize,
        s3Key: dtoWithoutStep.s3Key,
        workflowStep: undefined,
      });
    });
  });

  describe('getDownloadUrl', () => {
    it('should return a presigned download URL for an existing attachment', async () => {
      const attachmentId = 'attachment-uuid-001';
      const attachment = {
        id: attachmentId,
        changeRequestId: 'cr-uuid-001',
        uploadedById: 'user-uuid',
        fileName: 'report.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000,
        s3Key: 'attachments/cr-uuid-001/abc-123/report.pdf',
        workflowStep: 'Implementation',
        isDeleted: false,
        createdAt: new Date(),
      };

      const expectedUrl = 'https://s3.amazonaws.com/acr-attachments/presigned-get-url';
      mockAttachmentRepository.findById.mockResolvedValue(attachment);
      mockS3Service.getPresignedDownloadUrl.mockResolvedValue(expectedUrl);

      const result = await service.getDownloadUrl(attachmentId);

      expect(result.downloadUrl).toBe(expectedUrl);
      expect(result.fileName).toBe('report.pdf');
      expect(result.fileType).toBe('application/pdf');
      expect(mockS3Service.getPresignedDownloadUrl).toHaveBeenCalledWith(attachment.s3Key);
    });

    it('should throw NotFoundException for non-existent attachment', async () => {
      mockAttachmentRepository.findById.mockResolvedValue(null);

      await expect(service.getDownloadUrl('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('softDelete', () => {
    it('should mark an attachment as deleted', async () => {
      const attachmentId = 'attachment-uuid-001';
      const attachment = {
        id: attachmentId,
        changeRequestId: 'cr-uuid-001',
        uploadedById: 'user-uuid',
        fileName: 'old-doc.pdf',
        fileType: 'application/pdf',
        fileSize: 500000,
        s3Key: 'attachments/cr-uuid-001/abc-123/old-doc.pdf',
        workflowStep: null,
        isDeleted: false,
        createdAt: new Date(),
      };

      const deletedAttachment = { ...attachment, isDeleted: true };
      mockAttachmentRepository.findById.mockResolvedValue(attachment);
      mockAttachmentRepository.softDelete.mockResolvedValue(deletedAttachment);

      const result = await service.softDelete(attachmentId);

      expect(result.isDeleted).toBe(true);
      expect(mockAttachmentRepository.softDelete).toHaveBeenCalledWith(attachmentId);
    });

    it('should throw NotFoundException if attachment does not exist', async () => {
      mockAttachmentRepository.findById.mockResolvedValue(null);

      await expect(service.softDelete('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(mockAttachmentRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('findByChangeRequestId', () => {
    it('should return all non-deleted attachments for a CR', async () => {
      const crId = 'cr-uuid-001';
      const attachments = [
        {
          id: 'att-1',
          changeRequestId: crId,
          uploadedById: 'user-1',
          fileName: 'file1.pdf',
          fileType: 'application/pdf',
          fileSize: 100000,
          s3Key: 'attachments/cr-uuid-001/uuid-1/file1.pdf',
          workflowStep: 'IT Review',
          isDeleted: false,
          createdAt: new Date(),
        },
        {
          id: 'att-2',
          changeRequestId: crId,
          uploadedById: 'user-1',
          fileName: 'file2.png',
          fileType: 'image/png',
          fileSize: 200000,
          s3Key: 'attachments/cr-uuid-001/uuid-2/file2.png',
          workflowStep: 'Implementation',
          isDeleted: false,
          createdAt: new Date(),
        },
      ];

      mockAttachmentRepository.findByChangeRequestId.mockResolvedValue(attachments);

      const result = await service.findByChangeRequestId(crId);

      expect(result).toHaveLength(2);
      expect(result).toEqual(attachments);
      expect(mockAttachmentRepository.findByChangeRequestId).toHaveBeenCalledWith(crId);
    });
  });
});
