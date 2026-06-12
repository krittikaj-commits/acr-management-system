/**
 * Email template: Anonymous approval link (sent to approver request via email without login).
 */
export interface ApprovalLinkTemplateData {
  crNumber: string;
  approverName: string;
  requesterName: string;
  changeType: string;
  affectedService: string;
  description: string;
  approvalLink: string;
}

export function approvalLinkTemplate(data: ApprovalLinkTemplateData): { subject: string; html: string } {
  const subject = `[ACR] Approval Request: ${data.crNumber}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #ff9800;">Approval Request</h2>
    <p>Hello ${data.approverName},</p>
    <p>A Change Request from your team requires your approval.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">CR Number</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.crNumber}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Requester</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.requesterName}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Change Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.changeType}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Affected Service</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.affectedService}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Description</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.description}</td></tr>
    </table>
    <p style="margin: 24px 0;">
      <a href="${data.approvalLink}" style="display: inline-block; padding: 12px 24px; background-color: #1976d2; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Review &amp; Approve</a>
    </p>
    <p style="font-size: 13px; color: #666;">This link will expire in 72 hours. No login is required.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999;">This is an automated notification from ACR Management System.</p>
  </div>
</body>
</html>`.trim();

  return { subject, html };
}
