import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { api } from '@/services/api';

// --- Zod validation schema for IT Review form ---
const itReviewSchema = z.object({
  impactAnalysis: z.string().min(1, 'กรุณาระบุผลการวิเคราะห์ Impact'),
  riskAssessment: z.string().min(1, 'กรุณาระบุผลการประเมิน Risk'),
  implementationPlan: z.string().min(1, 'กรุณาระบุแผนดำเนินการ'),
  rolloutPlan: z.string().min(1, 'กรุณาระบุแผน Rollout'),
  rollbackPlan: z.string().min(1, 'กรุณาระบุแผน Rollback'),
  testResult: z.enum(['pass', 'failed', 'pending'], {
    required_error: 'กรุณาเลือกผลการทดสอบ',
  }),
  testAction: z
    .enum(['restore', 'vendor', 'retest', 'other'])
    .optional()
    .nullable(),
});

type ITReviewFormData = z.infer<typeof itReviewSchema>;

// --- Refined schema: testAction required when testResult is 'failed' ---
const itReviewSchemaRefined = itReviewSchema.refine(
  (data) => {
    if (data.testResult === 'failed') {
      return !!data.testAction;
    }
    return true;
  },
  {
    message: 'กรุณาเลือก Action เมื่อผลทดสอบไม่ผ่าน',
    path: ['testAction'],
  },
);

interface IChangeRequestDetail {
  id: string;
  crNumber: string;
  changeType: string;
  impactLevel: string;
  affectedService: string;
  description: string;
  requesterName: string;
  requesterEmail: string;
  impactAnalysis: string | null;
  riskAssessment: string | null;
  implementationPlan: string | null;
  rolloutPlan: string | null;
  rollbackPlan: string | null;
  testResult: string | null;
  testAction: string | null;
  version: number;
  workflowInstance?: {
    currentStep?: {
      name: string;
      stepType: string;
    };
  };
}

const TEST_RESULT_OPTIONS = [
  { value: 'pass', label: 'ผ่าน (Pass)' },
  { value: 'failed', label: 'ไม่ผ่าน (Failed)' },
  { value: 'pending', label: 'รอผล (Pending)' },
];

const TEST_ACTION_OPTIONS = [
  { value: 'restore', label: 'Restore ระบบ' },
  { value: 'vendor', label: 'ส่ง Vendor แก้ไข' },
  { value: 'retest', label: 'ทดสอบซ้ำ' },
  { value: 'other', label: 'อื่น ๆ' },
];

export function Component(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Fetch CR detail
  const {
    data: cr,
    isLoading,
    error: fetchError,
  } = useQuery<IChangeRequestDetail>({
    queryKey: ['change-request', id],
    queryFn: async () => {
      const response = await api.get(`/change-requests/${id}`);
      return response.data.data;
    },
    enabled: !!id,
  });

  // Form setup
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ITReviewFormData>({
    resolver: zodResolver(itReviewSchemaRefined),
    defaultValues: {
      impactAnalysis: '',
      riskAssessment: '',
      implementationPlan: '',
      rolloutPlan: '',
      rollbackPlan: '',
      testResult: undefined,
      testAction: null,
    },
  });

  const testResult = watch('testResult');

  // Populate form when CR data is loaded
  useEffect(() => {
    if (cr) {
      reset({
        impactAnalysis: cr.impactAnalysis ?? '',
        riskAssessment: cr.riskAssessment ?? '',
        implementationPlan: cr.implementationPlan ?? '',
        rolloutPlan: cr.rolloutPlan ?? '',
        rollbackPlan: cr.rollbackPlan ?? '',
        testResult: (cr.testResult as ITReviewFormData['testResult']) ?? undefined,
        testAction: (cr.testAction as ITReviewFormData['testAction']) ?? null,
      });
    }
  }, [cr, reset]);

  // Save draft mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ITReviewFormData) => {
      const response = await api.patch(`/change-requests/${id}`, {
        ...data,
        version: cr?.version,
      });
      return response.data.data;
    },
    onSuccess: () => {
      setSubmitError(null);
      setSubmitSuccess('บันทึกข้อมูลสำเร็จ');
      queryClient.invalidateQueries({ queryKey: ['change-request', id] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      setSubmitError(
        err.response?.data?.error?.message ?? 'เกิดข้อผิดพลาดในการบันทึก',
      );
      setSubmitSuccess(null);
    },
  });

  // Submit for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: async (data: ITReviewFormData) => {
      // Save first, then submit for approval
      await api.patch(`/change-requests/${id}`, {
        ...data,
        version: cr?.version,
      });
      const response = await api.post(
        `/change-requests/${id}/submit-approval`,
      );
      return response.data.data;
    },
    onSuccess: () => {
      setSubmitError(null);
      setSubmitSuccess('ส่งขออนุมัติสำเร็จ');
      queryClient.invalidateQueries({ queryKey: ['change-request', id] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { error?: { message?: string } } } };
      setSubmitError(
        err.response?.data?.error?.message ?? 'เกิดข้อผิดพลาดในการส่งขออนุมัติ',
      );
      setSubmitSuccess(null);
    },
  });

  const onSave = (data: ITReviewFormData): void => {
    saveMutation.mutate(data);
  };

  const onSubmitForApproval = (data: ITReviewFormData): void => {
    submitForApprovalMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (fetchError || !cr) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          ไม่สามารถโหลดข้อมูล Change Request ได้
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          size="small"
        >
          กลับ
        </Button>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" component="h1">
            IT Review — {cr.crNumber}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
            <Chip
              label={cr.changeType === 'emergency' ? 'Emergency' : 'Normal'}
              color={cr.changeType === 'emergency' ? 'error' : 'default'}
              size="small"
            />
            <Chip label={cr.impactLevel} size="small" variant="outlined" />
            <Chip label={cr.affectedService} size="small" variant="outlined" />
          </Box>
        </Box>
      </Box>

      {/* CR Summary */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          สรุปคำขอ
        </Typography>
        <Typography variant="body2">
          <strong>ผู้ร้องขอ:</strong> {cr.requesterName} ({cr.requesterEmail})
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          <strong>รายละเอียด:</strong> {cr.description}
        </Typography>
      </Paper>

      {/* Alerts */}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError(null)}>
          {submitError}
        </Alert>
      )}
      {submitSuccess && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSubmitSuccess(null)}>
          {submitSuccess}
        </Alert>
      )}

      {/* IT Review Form */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          แบบฟอร์ม IT Review
        </Typography>
        <Divider sx={{ mb: 3 }} />

        <Box component="form" noValidate>
          <Grid container spacing={3}>
            {/* Impact Analysis */}
            <Grid item xs={12}>
              <Controller
                name="impactAnalysis"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Impact Analysis *"
                    placeholder="ระบุผลการวิเคราะห์ผลกระทบต่อระบบ, ผู้ใช้, และ process ที่เกี่ยวข้อง"
                    multiline
                    rows={4}
                    fullWidth
                    error={!!errors.impactAnalysis}
                    helperText={errors.impactAnalysis?.message}
                  />
                )}
              />
            </Grid>

            {/* Risk Assessment */}
            <Grid item xs={12}>
              <Controller
                name="riskAssessment"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Risk Assessment *"
                    placeholder="ระบุความเสี่ยงที่อาจเกิดขึ้น, ระดับความเสี่ยง, และมาตรการลดความเสี่ยง"
                    multiline
                    rows={4}
                    fullWidth
                    error={!!errors.riskAssessment}
                    helperText={errors.riskAssessment?.message}
                  />
                )}
              />
            </Grid>

            {/* Implementation Plan */}
            <Grid item xs={12}>
              <Controller
                name="implementationPlan"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Implementation Plan *"
                    placeholder="ระบุขั้นตอนการดำเนินการ เช่น ลำดับการ deploy, การ config, การ migrate data"
                    multiline
                    rows={4}
                    fullWidth
                    error={!!errors.implementationPlan}
                    helperText={errors.implementationPlan?.message}
                  />
                )}
              />
            </Grid>

            {/* Rollout Plan */}
            <Grid item xs={12} md={6}>
              <Controller
                name="rolloutPlan"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Rollout Plan *"
                    placeholder="แผนนำ Change ขึ้น Production"
                    multiline
                    rows={3}
                    fullWidth
                    error={!!errors.rolloutPlan}
                    helperText={errors.rolloutPlan?.message}
                  />
                )}
              />
            </Grid>

            {/* Rollback Plan */}
            <Grid item xs={12} md={6}>
              <Controller
                name="rollbackPlan"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Rollback Plan *"
                    placeholder="แผนย้อนกลับเมื่อเกิดปัญหา"
                    multiline
                    rows={3}
                    fullWidth
                    error={!!errors.rollbackPlan}
                    helperText={errors.rollbackPlan?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                ผลการทดสอบ
              </Typography>
            </Grid>

            {/* Test Result */}
            <Grid item xs={12} md={6}>
              <Controller
                name="testResult"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="ผลการทดสอบ *"
                    fullWidth
                    error={!!errors.testResult}
                    helperText={errors.testResult?.message}
                    value={field.value ?? ''}
                  >
                    {TEST_RESULT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            {/* Test Action (shown when testResult = 'failed') */}
            {testResult === 'failed' && (
              <Grid item xs={12} md={6}>
                <Controller
                  name="testAction"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      select
                      label="Action เมื่อทดสอบไม่ผ่าน *"
                      fullWidth
                      error={!!errors.testAction}
                      helperText={errors.testAction?.message}
                      value={field.value ?? ''}
                    >
                      {TEST_ACTION_OPTIONS.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
            )}
          </Grid>

          {/* Action Buttons */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 2,
              mt: 4,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={handleSubmit(onSave)}
              disabled={saveMutation.isPending || submitForApprovalMutation.isPending}
            >
              {saveMutation.isPending ? 'กำลังบันทึก...' : 'บันทึก Draft'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<SendIcon />}
              onClick={handleSubmit(onSubmitForApproval)}
              disabled={
                saveMutation.isPending || submitForApprovalMutation.isPending
              }
            >
              {submitForApprovalMutation.isPending
                ? 'กำลังส่ง...'
                : 'Submit for Approval'}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
