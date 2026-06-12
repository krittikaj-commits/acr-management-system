/**
 * Email template: CR rejected (notify requester).
 */
export interface CrRejectedTemplateData {
  crNumber: string;
  recipientName: string;
  approverName: string;
  reason: string;
  affectedService: string;
}

export function crRejectedTemplate(data: CrRejectedTemplateData): { subject: string; html: string } {
  const subject = `[ACR] Change Request Rejected: ${data.crNumber}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #f44336;">Change Request Rejected</h2>
    <p>Hello ${data.recipientName},</p>
    <p>The following Change Request has been rejected.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">CR Number</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.crNumber}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Rejected By</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.approverName}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Affected Service</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.affectedService}</td></tr>
      <tr><td style="padding: 8px; font-weight: bold; border-bottom: 1px solid #eee;">Reason</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.reason}</td></tr>
    </table>
    <p>Please review the rejection reason and submit a revised request if needed.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #999;">This is an automated notification from ACR Management System.</p>
  </div>
</body>
</html>`.trim();

  return { subject, html };
}
