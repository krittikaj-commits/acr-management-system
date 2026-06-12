import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { CRForm, type CRFormValues } from '../components/CRForm';
import { createChangeRequest } from '@/services/change-request.api';
import type { IUploadedFile } from '../components/FileUpload';

/**
 * Create Change Request page.
 *
 * This page is publicly accessible (anonymous mode — no login required).
 * Uses the reusable CRForm component with React Hook Form + Zod validation.
 *
 * Flow:
 * 1. User fills multi-section form
 * 2. File uploads use presigned URL flow (handled by FileUpload component)
 * 3. On submit, calls POST /change-requests API
 * 4. Returns tracking token for the requester to track status
 */
export function Component(): JSX.Element {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (
    values: CRFormValues,
    files: IUploadedFile[],
  ): Promise<void> => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Collect uploaded file attachment IDs
      const attachmentIds = files
        .filter((f) => f.status === 'uploaded' && f.attachmentId)
        .map((f) => f.attachmentId as string);

      const result = await createChangeRequest({
        changeType: values.changeType,
        impactLevel: values.impactLevel,
        affectedService: values.affectedService,
        description: values.description,
        justification: values.justification || undefined,
        requesterName: values.requesterName,
        requesterEmail: values.requesterEmail,
        requesterDepartment: values.requesterDepartment || undefined,
        approverRequestEmail: values.approverRequestEmail || undefined,
        emergencyReason: values.emergencyReason || undefined,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      });

      setSuccessMessage(
        `คำขอเปลี่ยนแปลงถูกสร้างเรียบร้อย (CR: ${result.crNumber})`,
      );

      // If tracking token is provided, navigate to tracking page
      if (result.trackingToken) {
        setTimeout(() => {
          navigate(`/tracking/${result.trackingToken}`);
        }, 2000);
      }
    } catch (err) {
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('เกิดข้อผิดพลาดในการสร้างคำขอ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box className="max-w-4xl mx-auto py-6 px-4">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          สร้างคำขอเปลี่ยนแปลง (Create Change Request)
        </Typography>
        <Typography variant="body1" color="text.secondary">
          กรอกข้อมูลด้านล่างเพื่อส่งคำขอเปลี่ยนแปลง/แก้ไขระบบ — ไม่จำเป็นต้อง
          Login
        </Typography>
      </Box>

      <CRForm
        mode="create"
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        submitError={submitError}
      />

      {/* Success notification */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={5000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          onClose={() => setSuccessMessage(null)}
          variant="filled"
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
