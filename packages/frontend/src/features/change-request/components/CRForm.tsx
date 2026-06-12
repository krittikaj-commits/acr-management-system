import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import { useMasterData } from '@/hooks/useMasterData';
import { FileUpload, type IUploadedFile } from './FileUpload';

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const crFormSchema = z
  .object({
    // Basic Info
    changeType: z.enum(['normal', 'emergency'], {
      required_error: 'Change type is required',
    }),
    impactLevel: z.enum(['major', 'high', 'medium', 'low', 'very_low'], {
      required_error: 'Impact level is required',
    }),
    affectedService: z.string().min(1, 'Affected service is required'),

    // Change Details
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters'),
    justification: z.string().optional(),
    emergencyReason: z.string().optional(),

    // Requester Info
    requesterName: z.string().min(1, 'Requester name is required'),
    requesterEmail: z
      .string()
      .min(1, 'Requester email is required')
      .email('Invalid email format'),
    requesterDepartment: z.string().optional(),

    // Approver Info
    approverRequestEmail: z
      .string()
      .email('Invalid approver email format')
      .optional()
      .or(z.literal('')),
  })
  .refine(
    (data) => {
      // Emergency reason is required when changeType is emergency
      if (data.changeType === 'emergency') {
        return !!data.emergencyReason && data.emergencyReason.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Emergency reason is required for emergency changes',
      path: ['emergencyReason'],
    },
  );

export type CRFormValues = z.infer<typeof crFormSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface CRFormProps {
  /** Mode: create or edit */
  mode: 'create' | 'edit';
  /** Default values for edit mode */
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

// ─── Impact Level Labels ────────────────────────────────────────────────────

const IMPACT_LEVEL_OPTIONS = [
  { value: 'major', label: 'Major — ผลกระทบรุนแรง' },
  { value: 'high', label: 'High — ผลกระทบสูง' },
  { value: 'medium', label: 'Medium — ผลกระทบปานกลาง' },
  { value: 'low', label: 'Low — ผลกระทบต่ำ' },
  { value: 'very_low', label: 'Very Low — ผลกระทบน้อยมาก' },
] as const;

const CHANGE_TYPE_OPTIONS = [
  { value: 'normal', label: 'Normal Change — การเปลี่ยนแปลงปกติ' },
  { value: 'emergency', label: 'Emergency Change — การเปลี่ยนแปลงเร่งด่วน' },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Reusable CR form component for create and edit modes.
 * Uses React Hook Form + Zod for validation.
 * Anonymous-friendly (no login required).
 */
export function CRForm({
  mode,
  defaultValues,
  existingFiles = [],
  changeRequestId,
  isSubmitting = false,
  onSubmit,
  submitError,
}: CRFormProps): JSX.Element {
  const { services, isLoading: isLoadingMasterData } = useMasterData();

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<CRFormValues>({
    resolver: zodResolver(crFormSchema),
    defaultValues: {
      changeType: 'normal',
      impactLevel: undefined,
      affectedService: '',
      description: '',
      justification: '',
      emergencyReason: '',
      requesterName: '',
      requesterEmail: '',
      requesterDepartment: '',
      approverRequestEmail: '',
      ...defaultValues,
    },
  });

  // Watch changeType to conditionally show emergency reason
  const changeType = watch('changeType');

  // Reset form when defaultValues change (e.g., fetched data in edit mode)
  useEffect(() => {
    if (defaultValues) {
      reset({
        changeType: 'normal',
        impactLevel: undefined,
        affectedService: '',
        description: '',
        justification: '',
        emergencyReason: '',
        requesterName: '',
        requesterEmail: '',
        requesterDepartment: '',
        approverRequestEmail: '',
        ...defaultValues,
      });
    }
  }, [defaultValues, reset]);

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
      sx={{ maxWidth: 800 }}
    >
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      {/* Section 1: Basic Info */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          ข้อมูลพื้นฐาน (Basic Info)
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Change Type */}
          <Controller
            name="changeType"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Change Type *"
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

          {/* Impact Level */}
          <Controller
            name="impactLevel"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label="Impact Level *"
                fullWidth
                error={!!errors.impactLevel}
                helperText={errors.impactLevel?.message}
              >
                {IMPACT_LEVEL_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />

          {/* Affected Service */}
          <Controller
            name="affectedService"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select={services.length > 0}
                label="Affected Service *"
                fullWidth
                error={!!errors.affectedService}
                helperText={
                  errors.affectedService?.message ??
                  (isLoadingMasterData ? 'Loading services...' : undefined)
                }
                disabled={isLoadingMasterData}
              >
                {services.length > 0 ? (
                  services.map((service) => (
                    <MenuItem key={service.id} value={service.code}>
                      {service.nameTh || service.nameEn}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem value="" disabled>
                    No services available
                  </MenuItem>
                )}
              </TextField>
            )}
          />
        </Box>
      </Paper>

      {/* Section 2: Change Details */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          รายละเอียดการเปลี่ยนแปลง (Change Details)
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box className="flex flex-col gap-4">
          {/* Description */}
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Description *"
                multiline
                rows={4}
                fullWidth
                placeholder="Describe the change request in detail..."
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            )}
          />

          {/* Justification */}
          <Controller
            name="justification"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Justification"
                multiline
                rows={3}
                fullWidth
                placeholder="Why is this change needed?"
                error={!!errors.justification}
                helperText={errors.justification?.message}
              />
            )}
          />

          {/* Emergency Reason (conditional) */}
          {changeType === 'emergency' && (
            <Controller
              name="emergencyReason"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Emergency Reason *"
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Explain why this is an emergency change..."
                  error={!!errors.emergencyReason}
                  helperText={errors.emergencyReason?.message}
                />
              )}
            />
          )}
        </Box>
      </Paper>

      {/* Section 3: Requester Info */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          ข้อมูลผู้ร้องขอ (Requester Info)
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Requester Name */}
          <Controller
            name="requesterName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Name *"
                fullWidth
                error={!!errors.requesterName}
                helperText={errors.requesterName?.message}
              />
            )}
          />

          {/* Requester Email */}
          <Controller
            name="requesterEmail"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Email *"
                type="email"
                fullWidth
                error={!!errors.requesterEmail}
                helperText={errors.requesterEmail?.message}
              />
            )}
          />

          {/* Requester Department */}
          <Controller
            name="requesterDepartment"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Department"
                fullWidth
                error={!!errors.requesterDepartment}
                helperText={errors.requesterDepartment?.message}
              />
            )}
          />
        </Box>
      </Paper>

      {/* Section 4: Approver Info */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          ข้อมูลผู้อนุมัติ (Approver Info)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          ระบุ email หัวหน้า/ผู้อนุมัติเบื้องต้น — ระบบจะส่ง email
          ขออนุมัติไปยังผู้อนุมัตินี้
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <Controller
          name="approverRequestEmail"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Approver Email"
              type="email"
              fullWidth
              placeholder="supervisor@company.co.th"
              error={!!errors.approverRequestEmail}
              helperText={
                errors.approverRequestEmail?.message ??
                'ระบบจะส่ง email ขออนุมัติไปยังผู้อนุมัตินี้ (Pre-approval flow)'
              }
            />
          )}
        />
      </Paper>

      {/* Section 5: Attachments */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          เอกสารแนบ (Attachments)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          แนบเอกสารประกอบการขอเปลี่ยนแปลง (ถ้ามี)
        </Typography>
        <Divider sx={{ mb: 2 }} />

        <FileUpload
          existingFiles={existingFiles}
          onChange={handleFilesChange}
          changeRequestId={changeRequestId}
        />
      </Paper>

      {/* Submit Button */}
      <Box className="flex justify-end gap-3">
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          startIcon={
            isSubmitting ? (
              <CircularProgress size={20} color="inherit" />
            ) : mode === 'create' ? (
              <SendIcon />
            ) : (
              <SaveIcon />
            )
          }
        >
          {isSubmitting
            ? 'กำลังบันทึก...'
            : mode === 'create'
              ? 'ส่งคำขอ (Submit)'
              : 'บันทึก (Save)'}
        </Button>
      </Box>
    </Box>
  );
}
