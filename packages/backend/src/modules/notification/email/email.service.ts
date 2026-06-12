import { Injectable, Logger } from '@nestjs/common';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

/**
 * EmailService — Sends emails via AWS SES.
 *
 * Uses SES_FROM_EMAIL and AWS_REGION from environment.
 * For local development, uses AWS_ENDPOINT_URL for LocalStack.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly fromEmail: string;

  constructor() {
    const region = process.env.AWS_REGION || 'ap-southeast-1';
    const endpoint = process.env.AWS_ENDPOINT_URL;

    this.fromEmail = process.env.SES_FROM_EMAIL || 'noreply@dits.co.th';

    const clientConfig: ConstructorParameters<typeof SESClient>[0] = {
      region,
    };

    // For local development with LocalStack
    if (endpoint) {
      clientConfig.endpoint = endpoint;
      clientConfig.credentials = {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      };
    }

    this.sesClient = new SESClient(clientConfig);
  }

  /**
   * Send an email via AWS SES.
   *
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param htmlBody - HTML content of the email
   * @throws Error if SES send fails
   */
  async sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    const command = new SendEmailCommand({
      Source: this.fromEmail,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: 'UTF-8',
          },
        },
      },
    });

    try {
      await this.sesClient.send(command);
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${(error as Error).message}`);
      throw error;
    }
  }
}
