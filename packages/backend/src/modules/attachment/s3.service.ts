import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * S3Service — Manages presigned URL generation and object operations for attachments.
 *
 * Uses AWS SDK v3 with presigner for secure, time-limited upload/download URLs.
 * Reads configuration from environment variables:
 * - S3_BUCKET_ATTACHMENTS: Target bucket name
 * - AWS_REGION: AWS region
 * - AWS_ENDPOINT_URL: Optional custom endpoint (for LocalStack in dev)
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const region = process.env.AWS_REGION ?? 'ap-southeast-1';
    const endpoint = process.env.AWS_ENDPOINT_URL;

    this.bucket = process.env.S3_BUCKET_ATTACHMENTS ?? 'acr-attachments';

    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }

  /**
   * Generate a presigned PUT URL for uploading a file.
   *
   * @param key - S3 object key (e.g. attachments/{crId}/{uuid}/{fileName})
   * @param contentType - MIME content type of the file
   * @param expiresIn - URL validity in seconds (default: 300 = 5 minutes)
   * @returns Presigned PUT URL string
   */
  async getPresignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 300,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    this.logger.debug(`Generated presigned upload URL for key: ${key}`);
    return url;
  }

  /**
   * Generate a presigned GET URL for downloading a file.
   *
   * @param key - S3 object key
   * @param expiresIn - URL validity in seconds (default: 900 = 15 minutes)
   * @returns Presigned GET URL string
   */
  async getPresignedDownloadUrl(key: string, expiresIn: number = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, { expiresIn });
    this.logger.debug(`Generated presigned download URL for key: ${key}`);
    return url;
  }

  /**
   * Delete an object from S3.
   * Note: In practice, soft-delete at application level is preferred.
   * This is used only for admin cleanup jobs.
   *
   * @param key - S3 object key to delete
   */
  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
    this.logger.log(`Deleted S3 object: ${key}`);
  }
}
