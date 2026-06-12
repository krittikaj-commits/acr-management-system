/** Attachment entity interface */
export interface IAttachment {
  id: string;
  changeRequestId: string;
  uploadedById: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  s3Key: string;
  workflowStep: string;
  isDeleted: boolean;
  createdAt: Date;
}
