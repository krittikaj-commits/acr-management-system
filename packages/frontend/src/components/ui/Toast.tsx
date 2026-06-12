import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import type { AlertColor } from '@mui/material/Alert';

/** Toast notification options */
interface ToastOptions {
  message: string;
  severity?: AlertColor;
  duration?: number;
}

/** Toast context value */
interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

interface ToastState {
  open: boolean;
  message: string;
  severity: AlertColor;
  duration: number;
}

const DEFAULT_DURATION = 4000;

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Snackbar-based toast notification provider.
 * Wrap your app with this provider, then use `useToast()` to trigger notifications.
 */
export function ToastProvider({ children }: ToastProviderProps): JSX.Element {
  const [toast, setToast] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'info',
    duration: DEFAULT_DURATION,
  });

  const showToast = useCallback((options: ToastOptions) => {
    setToast({
      open: true,
      message: options.message,
      severity: options.severity ?? 'info',
      duration: options.duration ?? DEFAULT_DURATION,
    });
  }, []);

  const success = useCallback(
    (message: string) => showToast({ message, severity: 'success' }),
    [showToast],
  );

  const error = useCallback(
    (message: string) => showToast({ message, severity: 'error' }),
    [showToast],
  );

  const warning = useCallback(
    (message: string) => showToast({ message, severity: 'warning' }),
    [showToast],
  );

  const info = useCallback(
    (message: string) => showToast({ message, severity: 'info' }),
    [showToast],
  );

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string): void => {
    if (reason === 'clickaway') return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={toast.duration}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}

/**
 * Hook to access toast notifications. Must be used within a ToastProvider.
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
