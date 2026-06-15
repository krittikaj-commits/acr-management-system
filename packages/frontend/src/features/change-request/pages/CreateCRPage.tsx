import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Chip from '@mui/material/Chip';
import NoteAddOutlinedIcon from '@mui/icons-material/NoteAddOutlined';
import { CRForm, type CRFormValues } from '../components/CRForm';
import { createChangeRequest } from '@/services/change-request.api';
import type { IUploadedFile } from '../components/FileUpload';

/**
 * Create Change Request page.
 *
 * This page is publicly accessible (anonymous mode — no login required).
 * Uses the redesigned CRForm component with 3 sections:
 * 1. Change Information
 * 2. Change Details
 * 3. Requester Information
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
        businessPriority: values.businessPriority,
        affectedService: values.affectedService,
        description: values.description,
        justification: values.justification,
        requesterName: values.requesterName,
        requesterEmail: values.requesterEmail,
        requesterDepartment: values.requesterDepartment || undefined,
        approverRequestEmail: values.approverRequestEmail,
        attachmentIds: attachmentIds.length > 0 ? attachmentIds : undefined,
      });

      setSuccessMessage(
        `Change Request created successfully (CR: ${result.crNumber})`,
      );

      // If tracking token is provided, navigate to tracking page
      const trackingToken = (result as unknown as { trackingToken?: string }).trackingToken;
      if (trackingToken) {
        setTimeout(() => {
          navigate(`/tracking/${trackingToken}`);
        }, 2000);
      }
    } catch (err) {
      if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError('An error occurred while creating the request. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 960, mx: 'auto', py: { xs: 3, md: 5 }, px: { xs: 2, md: 4 } }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <NoteAddOutlinedIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 700 }}
          >
            Create Change Request
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
          <Typography variant="body1" color="text.secondary">
            Fill in the form below to submit a change request. No login required.
          </Typography>
          <Chip label="Anonymous" size="small" variant="outlined" color="info" />
        </Box>
      </Box>

      {/* Form */}
      <CRForm
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
          sx={{ borderRadius: 2 }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
