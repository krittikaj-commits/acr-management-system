import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import { FileUpload, type IUploadedFile } from './FileUpload';

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const crFormSchema = z.object({
  changeType: z.string().min(1, 'Change Type is required'),
  affectedService: z.string().min(1, 'Affected Service is required'),
  businessPriority: z.enum(['low', 'medium', 'high', 'urgent'], {
    required_error: 'Business Priority is required',
  }),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  justification: z.string().min(10, 'Business Justification must be at least 10 characters'),
  requesterName: z.string().min(1, 'Name is required'),
  requesterEmail: z.string().email('Valid email required'),
  requesterDepartment: z.string().optional(),
  approverRequestEmail: z.string().email('Valid approver email required'),
});

export type CRFormValues = z.infer<typeof crFormSchema>;

// ─── Options ────────────────────────────────────────────────────────────────

const CHANGE_TYPE_OPTIONS = [
  { value: 'application', label: 'Application' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'network', label: 'Network' },
  { value: 'server', label: 'Server' },
  { value: 'firewall', label: 'Firewall' },
  { value: 'os', label: 'OS' },
  { value: 'vpn', label: 'VPN' },
  { value: 'internet_wifi', label: 'Internet/Wi-Fi' },
  { value: 'active_directory', label: 'Active Directory' },
  { value: 'other', label: 'Other' },
] as const;

const BUSINESS_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: '#4caf50' },
  { value: 'medium', label: 'Medium', color: '#ff9800' },
  { value: 'high', label: 'High', color: '#f44336' },
  { value: 'urgent', label: 'Urgent', color: '#9c27b0' },
] as const;

// ─── Props ──────────────────────────────────────────────────────────────────

interface CRFormProps {
  /** Default values for pre-filled data */
  defaultValues?: Partial<CRFormValues>;
  /** Existing attachments for edit mode */
  existingFiles?: IUploadedFile[];
  /** Change request ID (for edit mode file uploads) */
  changeRequestId?: string;
  /** Whether form is submitting */
  isSubmitting?: boolean;
  /** Called on form submit */
  onSubmit: (values: CRFormValues, files: IUploadedFile[]) => void;
  /** Submit error message */
  submitError?: string | null;
}

// ─── Section Header ─────────────────────────────────────────────────────────

function SectionHeader({
  number,
  title,
  description,
  icon,
}: {
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}): JSX.Element {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700,
          fontSize: '0.875rem',
          flexShrink: 0,
          mt: 0.25,
        }}
      >
        {number}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {icon}
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
            {title}
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Create Change Request form with 3 clear sections:
 * 1. Change Information
 * 2. Change Details
 * 3. Requester Information
 *
 * Uses React Hook Form + Zod for validation.
 * Designed for anonymous use (no login required).
 */
export function CRForm({
  defaultValues,
  existingFiles = [],
  changeRequestId,
  isSubmitting = false,
  onSubmit,
  submitError,
}: CRFormProps): JSX.Element {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CRFormValues>({
    resolver: zodResolver(crFormSchema),
    defaultValues: {
      changeType: '',
      affectedService: '',
      businessPriority: undefined,
      description: '',
      justification: '',
      requesterName: '',
      requesterEmail: '',
      requesterDepartment: '',
      approverRequestEmail: '',
      ...defaultValues,
    },
  });

  // Track uploaded files
  let uploadedFiles: IUploadedFile[] = existingFiles;

  const handleFilesChange = (files: IUploadedFile[]): void => {
    uploadedFiles = files;
  };

  const handleFormSubmit = (values: CRFormValues): void => {
    onSubmit(values, uploadedFiles);
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(handleFormSubmit)}
      noValidate
      sx={{ maxWidth: 900 }}
    >
      {submitError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {submitError}
        </Alert>
      )}

      {/* ─── Section 1: Change Information ─────────────────────────────── */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <SectionHeader
            number={1}
            title="Change Information"
            description="Select the type, affected service, and priority of this change request."
            icon={<InfoOutlinedIcon color="primary" fontSize="small" />}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3,
            }}
          >
            {/* Change Type */}
            <Controller
              name="changeType"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Change Type"
                  required
                  fullWidth
                  error={!!errors.changeType}
                  helperText={errors.changeType?.message}
                >
                  {CHANGE_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* Business Priority */}
            <Controller
              name="businessPriority"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Business Priority"
                  required
                  fullWidth
                  error={!!errors.businessPriority}
                  helperText={errors.businessPriority?.message}
                >
                  {BUSINESS_PRIORITY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            bgcolor: option.color,
                          }}
                        />
                        {option.label}
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />

            {/* Affected Service — full width */}
            <Box sx={{ gridColumn: { md: '1 / -1' } }}>
              <Controller
                name="affectedService"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Affected Service"
                    required
                    fullWidth
                    placeholder="e.g., Email System, ERP, HR Portal"
                    error={!!errors.affectedService}
                    helperText={errors.affectedService?.message}
                  />
                )}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ─── Section 2: Change Details ─────────────────────────────────── */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <SectionHeader
            number={2}
            title="Change Details"
            description="Provide a detailed description, business justification, and any supporting documents."
            icon={<DescriptionOutlinedIcon color="primary" fontSize="small" />}
          />

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Description */}
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description"
                  required
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="Describe what needs to be changed and why..."
                  error={!!errors.description}
                  helperText={errors.description?.message}
                />
              )}
            />

            {/* Business Justification */}
            <Controller
              name="justification"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Business Justification"
                  required
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Explain the business need and expected benefits..."
                  error={!!errors.justification}
                  helperText={errors.justification?.message}
                />
              )}
            />

            {/* Attachments */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Attachments (Optional)
              </Typography>
              <FileUpload
                existingFiles={existingFiles}
                onChange={handleFilesChange}
                changeRequestId={changeRequestId}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* ─── Section 3: Requester Information ──────────────────────────── */}
      <Card
        elevation={0}
        sx={{
          mb: 4,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          <SectionHeader
            number={3}
            title="Requester Information"
            description="Your contact details and the approver who will review this request."
            icon={<PersonOutlineIcon color="primary" fontSize="small" />}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3,
            }}
          >
            {/* Name */}
            <Controller
              name="requesterName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Name"
                  required
                  fullWidth
                  placeholder="Your full name"
                  error={!!errors.requesterName}
                  helperText={errors.requesterName?.message}
                />
              )}
            />

            {/* Email */}
            <Controller
              name="requesterEmail"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email"
                  type="email"
                  required
                  fullWidth
                  placeholder="your.email@company.co.th"
                  error={!!errors.requesterEmail}
                  helperText={errors.requesterEmail?.message}
                />
              )}
            />

            {/* Department */}
            <Controller
              name="requesterDepartment"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Department"
                  fullWidth
                  placeholder="e.g., IT, HR, Finance"
                  error={!!errors.requesterDepartment}
                  helperText={errors.requesterDepartment?.message}
                />
              )}
            />

            {/* Approver Email */}
            <Controller
              name="approverRequestEmail"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Approver Email"
                  type="email"
                  required
                  fullWidth
                  placeholder="supervisor@company.co.th"
                  error={!!errors.approverRequestEmail}
                  helperText={
                    errors.approverRequestEmail?.message ??
                    'Approval request will be sent to this email'
                  }
                />
              )}
            />
          </Box>
        </CardContent>
      </Card>

      {/* ─── Submit Button ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <SendIcon />
            )
          }
          sx={{
            px: 4,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
          }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Change Request'}
        </Button>
      </Box>
    </Box>
  );
}
