/**
 * Email template: Needs verification (notify IT reviewer).
 */
export interface VerificationRequiredTemplateData {
  crNumber: string;
  reviewerName: string;
  implementerName: string;
  affectedService: string;
}

export function verificationRequiredTemplate(data: VerificationRequiredTemplateData): { subject: string; html: string } {
  const subject = `[ACR] Verification Required: ${data.crNumber}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #9c27b0;">Verification Required</h2>
    <p>Hello ${data.reviewerName},</p>
    <p>A Change Request has been implemented and requires your post-implementation verification.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">CR Number</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.crNumber}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Implemented By</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.implementerName}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Affected Service</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.affectedService}</td></tr>
    </table>
    <p>Please verify the implementation and confirm that the change is working as expected.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999;">This is an automated notification from ACR Management System.</p>
  </div>
</body>
</html>`.trim();

  return { subject, html };
}
