/**
 * Email template: CR assigned to IT reviewer (notify assigned reviewer).
 */
export interface CrAssignedTemplateData {
  crNumber: string;
  reviewerName: string;
  requesterName: string;
  changeType: string;
  affectedService: string;
  description: string;
}

export function crAssignedTemplate(data: CrAssignedTemplateData): { subject: string; html: string } {
  const subject = `[ACR] Change Request Assigned to You: ${data.crNumber}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1976d2;">Change Request Assigned</h2>
    <p>Hello ${data.reviewerName},</p>
    <p>A Change Request has been assigned to you for review.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">CR Number</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.crNumber}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Requester</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.requesterName}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Change Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.changeType}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Affected Service</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.affectedService}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Description</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.description}</td></tr>
    </table>
    <p>Please review this request and complete your Impact Analysis and Risk Assessment.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999;">This is an automated notification from ACR Management System.</p>
  </div>
</body>
</html>`.trim();

  return { subject, html };
}
