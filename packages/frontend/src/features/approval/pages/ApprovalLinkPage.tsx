import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import axios from 'axios';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IApprovalLinkData {
  crNumber: string;
  changeType: string;
  impactLevel: string;
  affectedService: string;
  description: string;
  justification: string | null;
  requesterName: string;
  requesterEmail: string;
  requesterDepartment: string | null;
  submittedAt: string;
  currentStep: string;
}

// ─── API (public — no auth header) ─────────────────────────────────────────

const PUBLIC_API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

async function fetchApprovalByToken(
  token: string,
): Promise<IApprovalLinkData> {
  const response = await axios.get<{ data: IApprovalLinkData }>(
    `${PUBLIC_API_BASE}/approvals/link/${token}`,
  );
  return response.data.data;
}

async function approveByToken(token: string): Promise<void> {
  await axios.post(`${PUBLIC_API_BASE}/approvals/link/${token}/approve`);
}

async function rejectByToken(
  token: string,
  reason: string,
): Promise<void> {
  await axios.post(`${PUBLIC_API_BASE}/approvals/link/${token}/reject`, {
    reason,
  });
}

// ─── Impact Level Colors ────────────────────────────────────────────────────

function getImpactColor(
  level: string,
): 'error' | 'warning' | 'info' | 'success' | 'default' {
  switch (level.toLowerCase()) {
    case 'major':
      return 'error';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    case 'low':
      return 'success';
    case 'very_low':
      return 'default';
    default:
      return 'default';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Component(): JSX.Element {
  const { token } = useParams<{ token: string }>();
  const [actionCompleted, setActionCompleted] = useState<
    'approved' | 'rejected' | null
  >(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  // Fetch CR data by token
  const {
    data: crData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['approval-link', token],
    queryFn: () => fetchApprovalByToken(token!),
    enabled: !!token,
    retry: false,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: () => approveByToken(token!),
    onSuccess: () => setActionCompleted('approved'),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: (reason: string) => rejectByToken(token!, reason),
    onSuccess: () => {
      setActionCompleted('rejected');
      setRejectDialogOpen(false);
    },
  });

  const handleRejectConfirm = (): void => {
    if (!rejectReason.trim()) {
      setRejectError('กรุณาระบุเหตุผล (Reason is required)');
      return;
    }
    rejectMutation.mutate(rejectReason);
  };

  // ─── Loading State ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Box className="flex flex-col items-center justify-center min-h-[60vh]">
        <CircularProgress size={48} />
        <Typography sx={{ mt: 2 }} color="text.secondary">
          Loading approval details...
        </Typography>
      </Box>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────

  if (error || !crData) {
    return (
      <Box className="flex flex-col items-center justify-center min-h-[60vh]">
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 480 }}>
          <ErrorOutlineIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Invalid or Expired Link
          </Typography>
          <Typography color="text.secondary">
            ลิงก์นี้ไม่ถูกต้องหรือหมดอายุแล้ว กรุณาติดต่อผู้ขอคำร้อง
          </Typography>
        </Paper>
      </Box>
    );
  }

  // ─── Success State (after action) ──────────────────────────────────────

  if (actionCompleted) {
    return (
      <Box className="flex flex-col items-center justify-center min-h-[60vh]">
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 480 }}>
          {actionCompleted === 'approved' ? (
            <>
              <TaskAltIcon
                sx={{ fontSize: 64, color: 'success.main', mb: 2 }}
              />
              <Typography variant="h5" gutterBottom>
                Approved Successfully
              </Typography>
              <Typography color="text.secondary">
                คำขอ {crData.crNumber} ได้รับการอนุมัติเรียบร้อยแล้ว
                ระบบจะดำเนินการในขั้นตอนถัดไป
              </Typography>
            </>
          ) : (
            <>
              <CancelIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>
                Rejected
              </Typography>
              <Typography color="text.secondary">
                คำขอ {crData.crNumber} ถูกปฏิเสธ
                ระบบจะแจ้งผู้ร้องขอตามขั้นตอน
              </Typography>
            </>
          )}
        </Paper>
      </Box>
    );
  }

  // ─── Main View ──────────────────────────────────────────────────────────

  return (
    <Box className="flex flex-col items-center py-8 px-4">
      <Box sx={{ maxWidth: 720, width: '100%' }}>
        {/* Header */}
        <Box className="text-center mb-6">
          <Typography variant="h4" gutterBottom>
            Approval Request
          </Typography>
          <Typography color="text.secondary">
            กรุณาตรวจสอบรายละเอียดด้านล่างและเลือกอนุมัติหรือไม่อนุมัติ
          </Typography>
        </Box>

        {/* CR Summary Card */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Box className="flex items-center justify-between mb-3">
              <Typography variant="h6" fontWeight={700}>
                {crData.crNumber}
              </Typography>
              <Box className="flex gap-2">
                <Chip
                  label={crData.impactLevel}
                  color={getImpactColor(crData.impactLevel)}
                  size="small"
                />
                <Chip
                  label={crData.changeType}
                  variant="outlined"
                  size="small"
                  color={
                    crData.changeType === 'emergency' ? 'error' : 'default'
                  }
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Requester
                </Typography>
                <Typography variant="body1">{crData.requesterName}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {crData.requesterEmail}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Department
                </Typography>
                <Typography variant="body1">
                  {crData.requesterDepartment || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Affected Service
                </Typography>
                <Typography variant="body1">
                  {crData.affectedService}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Submitted
                </Typography>
                <Typography variant="body1">
                  {new Date(crData.submittedAt).toLocaleString('th-TH')}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Box>
              <Typography variant="caption" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {crData.description}
              </Typography>
            </Box>

            {crData.justification && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  Justification
                </Typography>
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                  {crData.justification}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Error Alert */}
        {(approveMutation.isError || rejectMutation.isError) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง
          </Alert>
        )}

        {/* Action Buttons */}
        <Box className="flex justify-center gap-4">
          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<CancelIcon />}
            onClick={() => setRejectDialogOpen(true)}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            ไม่อนุมัติ (Reject)
          </Button>
          <Button
            variant="contained"
            color="success"
            size="large"
            startIcon={
              approveMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                <CheckCircleIcon />
              )
            }
            onClick={() => approveMutation.mutate()}
            disabled={approveMutation.isPending || rejectMutation.isPending}
          >
            {approveMutation.isPending ? 'กำลังอนุมัติ...' : 'อนุมัติ (Approve)'}
          </Button>
        </Box>
      </Box>

      {/* Reject Reason Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>ไม่อนุมัติ — Reject</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            กรุณาระบุเหตุผลในการไม่อนุมัติคำขอนี้
          </Typography>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={4}
            label="เหตุผล (Reason) *"
            value={rejectReason}
            onChange={(e) => {
              setRejectReason(e.target.value);
              if (rejectError) setRejectError('');
            }}
            error={!!rejectError}
            helperText={rejectError}
            placeholder="Enter reason for rejection..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRejectConfirm}
            disabled={rejectMutation.isPending}
          >
            {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ApprovalLinkPage;

function ApprovalLinkPage(): JSX.Element {
  return <Component />;
}
