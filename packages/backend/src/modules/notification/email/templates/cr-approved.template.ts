/**
 * Email template: CR approved (notify requester + implementer).
 */
export interface CrApprovedTemplateData {
  crNumber: string;
  recipientName: string;
  approverName: string;
  affectedService: string;
  changeType: string;
}

export function crApprovedTemplate(data: CrApprovedTemplateData): { subject: string; html: string } {
  const subject = `[ACR] Change Request Approved: ${data.crNumber}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #4caf50;">Change Request Approved</h2>
    <p>Hello ${data.recipientName},</p>
    <p>The following Change Request has been approved.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">CR Number</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.crNumber}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Approved By</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.approverName}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Change Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.changeType}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Affected Service</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.affectedService}</td></tr>
    </table>
    <p>The change is now ready to proceed with implementation.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999;">This is an automated notification from ACR Management System.</p>
  </div>
</body>
</html>`.trim();

  return { subject, html };
}
