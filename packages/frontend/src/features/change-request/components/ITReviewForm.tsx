import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import SendIcon from '@mui/icons-material/Send';

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const itReviewSchema = z.object({
  impactAnalysis: z
    .string()
    .min(10, 'Impact analysis must be at least 10 characters'),
  riskAssessment: z
    .string()
    .min(10, 'Risk assessment must be at least 10 characters'),
  implementationPlan: z
    .string()
    .min(10, 'Implementation plan must be at least 10 characters'),
  rolloutPlan: z
    .string()
    .min(10, 'Rollout plan must be at least 10 characters'),
  rollbackPlan: z
    .string()
    .min(10, 'Rollback plan must be at least 10 characters'),
  testResult: z
    .string()
    .min(10, 'Test result must be at least 10 characters'),
});

export type ITReviewFormValues = z.infer<typeof itReviewSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface ITReviewFormProps {
  /** Default values for pre-filled data */
  defaultValues?: Partial<ITReviewFormValues>;
  /** Whether form is submitting */
  isSubmitting?: boolean;
  /** Called on form submit */
  onSubmit: (values: ITReviewFormValues) => void;
  /** Submit error message */
  submitError?: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * IT Review form component.
 * Allows IT reviewers to fill in Impact Analysis, Risk Assessment,
 * Implementation/Rollout/Rollback Plans, and Test Results.
 */
export function ITReviewForm({
  defaultValues,
  isSubmitting = false,
  onSubmit,
  submitError,
}: ITReviewFormProps): JSX.Element {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ITReviewFormValues>({
    resolver: zodResolver(itReviewSchema),
    defaultValues: {
      impactAnalysis: '',
      riskAssessment: '',
      implementationPlan: '',
      rolloutPlan: '',
      rollbackPlan: '',
      testResult: '',
      ...defaultValues,
    },
  });

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      sx={{ maxWidth: 900 }}
    >
      {submitError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {submitError}
        </Alert>
      )}

      {/* Impact Analysis */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          การวิเคราะห์ผลกระทบ (Impact Analysis)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ระบุผลกระทบที่อาจเกิดขึ้นจากการเปลี่ยนแปลงนี้ต่อระบบ ผู้ใช้
          และบริการที่เกี่ยวข้อง
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Controller
          name="impactAnalysis"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              multiline
              rows={5}
              fullWidth
              placeholder="Describe the impact on systems, users, and related services..."
              error={!!errors.impactAnalysis}
              helperText={errors.impactAnalysis?.message}
            />
          )}
        />
      </Paper>

      {/* Risk Assessment */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          การประเมินความเสี่ยง (Risk Assessment)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ระบุความเสี่ยงที่เกี่ยวข้อง ระดับความรุนแรง
          และมาตรการบรรเทาความเสี่ยง
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Controller
          name="riskAssessment"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              multiline
              rows={5}
              fullWidth
              placeholder="Identify risks, severity levels, and mitigation measures..."
              error={!!errors.riskAssessment}
              helperText={errors.riskAssessment?.message}
            />
          )}
        />
      </Paper>

      {/* Implementation Plan */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          แผนการดำเนินการ (Implementation Plan)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ระบุขั้นตอนการดำเนินการเปลี่ยนแปลงอย่างละเอียด
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Controller
          name="implementationPlan"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              multiline
              rows={5}
              fullWidth
              placeholder="List the step-by-step implementation procedure..."
              error={!!errors.implementationPlan}
              helperText={errors.implementationPlan?.message}
            />
          )}
        />
      </Paper>

      {/* Rollout Plan */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          แผนการนำขึ้น Production (Rollout Plan)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ระบุแผนการนำการเปลี่ยนแปลงขึ้นระบบจริง รวมถึงกำหนดเวลาและผู้รับผิดชอบ
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Controller
          name="rolloutPlan"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              multiline
              rows={5}
              fullWidth
              placeholder="Detail the rollout schedule, responsible parties, and deployment steps..."
              error={!!errors.rolloutPlan}
              helperText={errors.rolloutPlan?.message}
            />
          )}
        />
      </Paper>

      {/* Rollback Plan */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          แผนการย้อนกลับ (Rollback Plan)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ระบุขั้นตอนการย้อนกลับหากการเปลี่ยนแปลงล้มเหลวหรือเกิดปัญหา
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Controller
          name="rollbackPlan"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              multiline
              rows={5}
              fullWidth
              placeholder="Describe the rollback procedure if the change fails..."
              error={!!errors.rollbackPlan}
              helperText={errors.rollbackPlan?.message}
            />
          )}
        />
      </Paper>

      {/* Test Result */}
      <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          ผลการทดสอบ (Test Result)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          ระบุผลการทดสอบการเปลี่ยนแปลง รวมถึงสภาพแวดล้อม กรณีทดสอบ
          และผลลัพธ์ที่ได้
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Controller
          name="testResult"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              multiline
              rows={5}
              fullWidth
              placeholder="Document test environment, test cases, and results..."
              error={!!errors.testResult}
              helperText={errors.testResult?.message}
            />
          )}
        />
      </Paper>

      {/* Submit Button */}
      <Box className="flex justify-end">
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
        >
          {isSubmitting
            ? 'กำลังส่ง...'
            : 'ส่งเพื่อขออนุมัติ (Submit for Approval)'}
        </Button>
      </Box>
    </Box>
  );
}
