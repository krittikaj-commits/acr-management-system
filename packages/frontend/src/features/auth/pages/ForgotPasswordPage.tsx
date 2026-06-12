import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import Avatar from '@mui/material/Avatar';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { api } from '@/services/api';
import { AxiosError } from 'axios';

/**
 * Forgot password form validation schema.
 */
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

/**
 * ForgotPasswordPage — Email form to request a password reset link.
 * Submits to POST /auth/forgot-password.
 */
function ForgotPasswordPage(): JSX.Element {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormValues): Promise<void> => {
    setServerError(null);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.data?.error?.message) {
        setServerError(error.response.data.error.message);
      } else {
        // Show success even if email doesn't exist (prevent enumeration)
        setIsSuccess(true);
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
              Check Your Email
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              If an account with that email exists, we've sent a password reset
              link. Please check your inbox and follow the instructions.
            </Typography>
            <Link
              component={RouterLink}
              to="/login"
              variant="body2"
              underline="hover"
            >
              Back to Sign In
            </Link>
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
              <MailOutlineIcon />
            </Avatar>
            <Typography variant="h5" fontWeight={600}>
              Forgot Password
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Enter your email and we'll send you a reset link
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
              {...register('email')}
              label="Email"
              type="email"
              autoComplete="email"
              autoFocus
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
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
                'Send Reset Link'
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

export { ForgotPasswordPage as Component };
export default ForgotPasswordPage;
