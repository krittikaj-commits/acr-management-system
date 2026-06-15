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

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const itReviewSchema = z.object({
  impactLevel: z.enum(['major', 'high', 'medium', 'low', 'very_low'], {
    required_error: 'Impact Level is required',
  }),
  riskLevel: z.enum(['critical', 'high', 'medium', 'low'], {
    required_error: 'Risk Level is required',
  }),
  impactAnalysis: z
    .string()
    .min(10, 'Impact Analysis must be at least 10 characters'),
  implementationPlan: z
    .string()
    .min(10, 'Implementation Plan must be at least 10 characters'),
  rollbackPlan: z
    .string()
    .min(10, 'Rollback Plan must be at least 10 characters'),
  testingPlan: z
    .string()
    .min(10, 'Testing Plan must be at least 10 characters'),
  estimatedDowntime: z.string().optional(),
});

export type ITReviewFormValues = z.infer<typeof itReviewSchema>;

// ─── Options ────────────────────────────────────────────────────────────────

const IMPACT_LEVEL_OPTIONS = [
  { value: 'major', label: 'Major', color: '#d32f2f' },
  { value: 'high', label: 'High', color: '#f44336' },
  { value: 'medium', label: 'Medium', color: '#ff9800' },
  { value: 'low', label: 'Low', color: '#4caf50' },
  { value: 'very_low', label: 'Very Low', color: '#81c784' },
] as const;

const RISK_LEVEL_OPTIONS = [
  { value: 'critical', label: 'Critical', color: '#9c27b0' },
  { value: 'high', label: 'High', color: '#f44336' },
  { value: 'medium', label: 'Medium', color: '#ff9800' },
  { value: 'low', label: 'Low', color: '#4caf50' },
] as const;

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
 * Allows IT reviewers to assess impact, risk, and provide planning details
 * for a change request.
 *
 * Fields:
 * - Impact Level (dropdown)
 * - Risk Level (dropdown)
 * - Impact Analysis (textarea)
 * - Implementation Plan (textarea)
 * - Rollback Plan (textarea)
 * - Testing Plan (textarea)
 * - Estimated Downtime (text input, optional)
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
      impactLevel: undefined,
      riskLevel: undefined,
      impactAnalysis: '',
      implementationPlan: '',
      rollbackPlan: '',
      testingPlan: '',
      estimatedDowntime: '',
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
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {submitError}
        </Alert>
      )}

      {/* ─── Assessment Section ────────────────────────────────────────── */}
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
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}
          >
            Assessment
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Evaluate the impact and risk level of this change request.
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              gap: 3,
            }}
          >
            {/* Impact Level */}
            <Controller
              name="impactLevel"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Impact Level"
                  required
                  fullWidth
                  error={!!errors.impactLevel}
                  helperText={errors.impactLevel?.message}
                >
                  {IMPACT_LEVEL_OPTIONS.map((option) => (
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

            {/* Risk Level */}
            <Controller
              name="riskLevel"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Risk Level"
                  required
                  fullWidth
                  error={!!errors.riskLevel}
                  helperText={errors.riskLevel?.message}
                >
                  {RISK_LEVEL_OPTIONS.map((option) => (
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
          </Box>

          {/* Impact Analysis */}
          <Box sx={{ mt: 3 }}>
            <Controller
              name="impactAnalysis"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Impact Analysis"
                  required
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="Describe the impact on systems, users, and related services..."
                  error={!!errors.impactAnalysis}
                  helperText={errors.impactAnalysis?.message}
                />
              )}
            />
          </Box>
        </CardContent>
      </Card>

      {/* ─── Planning Section ──────────────────────────────────────────── */}
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
          <Typography
            variant="h6"
            sx={{ fontWeight: 600, color: 'primary.main', mb: 0.5 }}
          >
            Planning
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Provide implementation, rollback, and testing plans for this change.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Implementation Plan */}
            <Controller
              name="implementationPlan"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Implementation Plan"
                  required
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="List the step-by-step implementation procedure..."
                  error={!!errors.implementationPlan}
                  helperText={errors.implementationPlan?.message}
                />
              )}
            />

            {/* Rollback Plan */}
            <Controller
              name="rollbackPlan"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Rollback Plan"
                  required
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="Describe the rollback procedure if the change fails..."
                  error={!!errors.rollbackPlan}
                  helperText={errors.rollbackPlan?.message}
                />
              )}
            />

            {/* Testing Plan */}
            <Controller
              name="testingPlan"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Testing Plan"
                  required
                  multiline
                  rows={4}
                  fullWidth
                  placeholder="Describe the testing strategy, test cases, and acceptance criteria..."
                  error={!!errors.testingPlan}
                  helperText={errors.testingPlan?.message}
                />
              )}
            />

            {/* Estimated Downtime */}
            <Controller
              name="estimatedDowntime"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Estimated Downtime"
                  fullWidth
                  placeholder='e.g., "2 hours", "No downtime expected"'
                  error={!!errors.estimatedDowntime}
                  helperText={
                    errors.estimatedDowntime?.message ??
                    'Optional — estimated service downtime during implementation'
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
          {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
        </Button>
      </Box>
    </Box>
  );
}
