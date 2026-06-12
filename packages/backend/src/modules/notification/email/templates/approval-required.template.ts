/**
 * Email template: Approval needed (notify approver).
 */
export interface ApprovalRequiredTemplateData {
  crNumber: string;
  approverName: string;
  requesterName: string;
  changeType: string;
  impactLevel: string;
  affectedService: string;
  description: string;
}

export function approvalRequiredTemplate(data: ApprovalRequiredTemplateData): { subject: string; html: string } {
  const subject = `[ACR] Approval Required: ${data.crNumber}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #ff9800;">Approval Required</h2>
    <p>Hello ${data.approverName},</p>
    <p>A Change Request requires your approval.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">CR Number</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.crNumber}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Requester</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.requesterName}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Change Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.changeType}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Impact Level</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.impactLevel}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Affected Service</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.affectedService}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Description</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.description}</td></tr>
    </table>
    <p>Please log in to the ACR Management System to review and approve/reject this request.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999;">This is an automated notification from ACR Management System.</p>
  </div>
</body>
</html>`.trim();

  return { subject, html };
}
