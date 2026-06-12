import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { api } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IApprovalItem {
  id: string;
  crNumber: string;
  requesterName: string;
  affectedService: string;
  impactLevel: string;
  changeType: string;
  description: string;
  justification: string | null;
  submittedAt: string;
  currentStep: string;
}

interface IApprovalListResponse {
  data: IApprovalItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ─── API ────────────────────────────────────────────────────────────────────

async function fetchPendingApprovals(): Promise<IApprovalListResponse> {
  const response = await api.get<{ data: IApprovalListResponse }>(
    '/approvals/pending',
  );
  return response.data.data;
}

async function approveRequest(id: string): Promise<void> {
  await api.post(`/approvals/${id}/approve`);
}

async function rejectRequest(id: string, reason: string): Promise<void> {
  await api.post(`/approvals/${id}/reject`, { reason });
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
  const queryClient = useQueryClient();
  const [selectedItem, setSelectedItem] = useState<IApprovalItem | null>(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch pending approvals
  const {
    data: approvalData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: fetchPendingApprovals,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => approveRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
      setActionSuccess('อนุมัติสำเร็จ — Change request has been approved.');
      setSummaryDialogOpen(false);
      setTimeout(() => setActionSuccess(null), 5000);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectRequest(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals', 'pending'] });
      setActionSuccess('ไม่อนุมัติสำเร็จ — Change request has been rejected.');
      setRejectDialogOpen(false);
      setRejectReason('');
      setTimeout(() => setActionSuccess(null), 5000);
    },
  });

  // Handlers
  const handleViewSummary = (item: IApprovalItem): void => {
    setSelectedItem(item);
    setSummaryDialogOpen(true);
  };

  const handleApprove = (item: IApprovalItem): void => {
    setSelectedItem(item);
    approveMutation.mutate(item.id);
  };

  const handleApproveFromDialog = (): void => {
    if (selectedItem) {
      approveMutation.mutate(selectedItem.id);
    }
  };

  const handleOpenRejectDialog = (item: IApprovalItem): void => {
    setSelectedItem(item);
    setRejectReason('');
    setRejectError('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = (): void => {
    if (!rejectReason.trim()) {
      setRejectError('กรุณาระบุเหตุผล (Reason is required)');
      return;
    }
    if (selectedItem) {
      rejectMutation.mutate({ id: selectedItem.id, reason: rejectReason });
    }
  };

  const items = approvalData?.data ?? [];

  return (
    <Box>
      <Box className="flex items-center justify-between mb-4">
        <Box>
          <Typography variant="h4">Approval Queue</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            รายการคำขอที่รอการอนุมัติ
          </Typography>
        </Box>
        <Chip
          label={`${items.length} pending`}
          color="warning"
          variant="outlined"
        />
      </Box>

      {actionSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {actionSuccess}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load approval queue. Please try again.
        </Alert>
      )}

      {isLoading ? (
        <Box className="flex justify-center py-12">
          <CircularProgress />
        </Box>
      ) : items.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            ไม่มีรายการที่รอการอนุมัติ (No pending approvals)
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>CR Number</TableCell>
                <TableCell>Requester</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Impact</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Submitted</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {item.crNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>{item.requesterName}</TableCell>
                  <TableCell>{item.affectedService}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.impactLevel}
                      color={getImpactColor(item.impactLevel)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.changeType}
                      variant="outlined"
                      size="small"
                      color={
                        item.changeType === 'emergency' ? 'error' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(item.submittedAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                  <TableCell align="center">
                    <Box className="flex items-center justify-center gap-1">
                      <Tooltip title="View Summary">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleViewSummary(item)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Approve">
                        <IconButton
                          size="small"
                          color="success"
                          onClick={() => handleApprove(item)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reject">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenRejectDialog(item)}
                          disabled={rejectMutation.isPending}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Summary Dialog */}
      <Dialog
        open={summaryDialogOpen}
        onClose={() => setSummaryDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          CR Summary — {selectedItem?.crNumber}
        </DialogTitle>
        <DialogContent dividers>
          {selectedItem && (
            <Box className="flex flex-col gap-3">
              <Box className="grid grid-cols-2 gap-3">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Requester
                  </Typography>
                  <Typography variant="body1">
                    {selectedItem.requesterName}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Service
                  </Typography>
                  <Typography variant="body1">
                    {selectedItem.affectedService}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Impact Level
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedItem.impactLevel}
                      color={getImpactColor(selectedItem.impactLevel)}
                      size="small"
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Change Type
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={selectedItem.changeType}
                      variant="outlined"
                      size="small"
                      color={
                        selectedItem.changeType === 'emergency'
                          ? 'error'
                          : 'default'
                      }
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Current Step
                  </Typography>
                  <Typography variant="body1">
                    {selectedItem.currentStep}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Submitted
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedItem.submittedAt).toLocaleString('th-TH')}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body1">
                  {selectedItem.description}
                </Typography>
              </Box>
              {selectedItem.justification && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Justification
                  </Typography>
                  <Typography variant="body1">
                    {selectedItem.justification}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSummaryDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            color="error"
            startIcon={<CancelIcon />}
            onClick={() => {
              setSummaryDialogOpen(false);
              if (selectedItem) handleOpenRejectDialog(selectedItem);
            }}
          >
            Reject
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircleIcon />}
            onClick={handleApproveFromDialog}
            disabled={approveMutation.isPending}
          >
            {approveMutation.isPending ? 'Approving...' : 'Approve'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Reason Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Reject — {selectedItem?.crNumber}
        </DialogTitle>
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

export default ApprovalQueuePage;

function ApprovalQueuePage(): JSX.Element {
  return <Component />;
}
