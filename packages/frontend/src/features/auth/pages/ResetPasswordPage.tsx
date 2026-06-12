import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LockResetIcon from '@mui/icons-material/LockReset';
import Avatar from '@mui/material/Avatar';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { api } from '@/services/api';
import { AxiosError } from 'axios';

/**
 * Reset password form validation schema.
 */
const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, 'New password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/**
 * ResetPasswordPage — Set a new password using a reset token from URL params.
 * Submits to POST /auth/reset-password.
 */
function ResetPasswordPage(): JSX.Element {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Show error if no token in URL
  if (!token) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 8,
        }}
      >
        <Card sx={{ maxWidth: 440, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              Invalid or missing reset token. Please request a new password reset link.
            </Alert>
            <Link
              component={RouterLink}
              to="/forgot-password"
              variant="body2"
              underline="hover"
            >
              Request New Reset Link
            </Link>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const onSubmit = async (data: ResetPasswordFormValues): Promise<void> => {
    setServerError(null);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: data.newPassword,
      });
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data?.error?.message) {
        setServerError(error.response.data.error.message);
      } else {
        setServerError(
          'Failed to reset password. The link may have expired. Please request a new one.',
        );
      }
    }
  };

  if (isSuccess) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mt: 8,
        }}
      >
        <Card sx={{ maxWidth: 440, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Avatar
              sx={{ bgcolor: 'success.main', mx: 'auto', mb: 2, width: 56, height: 56 }}
            >
              <CheckCircleOutlineIcon fontSize="large" />
            </Avatar>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Password Reset Successful
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your password has been updated. You can now sign in with your new
              password.
            </Typography>
            <Button
              component={RouterLink}
              to="/login"
              variant="contained"
              size="large"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        mt: 8,
      }}
    >
      <Card sx={{ maxWidth: 440, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Avatar sx={{ bgcolor: 'primary.main', mb: 1.5 }}>
              <LockResetIcon />
            </Avatar>
            <Typography variant="h5" fontWeight={600}>
              Reset Password
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Enter your new password below
            </Typography>
          </Box>

          {serverError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {serverError}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
          >
            <TextField
              {...register('newPassword')}
              label="New Password"
              type="password"
              autoComplete="new-password"
              autoFocus
              fullWidth
              error={!!errors.newPassword}
              helperText={errors.newPassword?.message}
              disabled={isSubmitting}
            />

            <TextField
              {...register('confirmPassword')}
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              fullWidth
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              disabled={isSubmitting}
              sx={{ mt: 1 }}
            >
              {isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Reset Password'
              )}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Link
                component={RouterLink}
                to="/login"
                variant="body2"
                underline="hover"
              >
                Back to Sign In
              </Link>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

export { ResetPasswordPage as Component };
export default ResetPasswordPage;
