import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ICRListItem {
  id: string;
  crNumber: string;
  title: string;
  description: string;
  status: string;
  impactLevel: string;
  changeType: string;
  requesterName: string;
  affectedService: string;
  createdAt: string;
  updatedAt: string;
}

interface ICRListResponse {
  data: ICRListItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ─── API ────────────────────────────────────────────────────────────────────

async function fetchCRList(): Promise<ICRListResponse> {
  const response = await api.get<{ data: ICRListResponse }>('/change-requests');
  return response.data.data;
}

// ─── Status Colors ──────────────────────────────────────────────────────────

function getStatusColor(
  status: string,
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
  switch (status.toLowerCase()) {
    case 'draft':
      return 'default';
    case 'submitted':
      return 'info';
    case 'it review':
      return 'warning';
    case 'approval':
      return 'secondary';
    case 'implementation':
      return 'primary';
    case 'verification':
      return 'info';
    case 'closed':
      return 'success';
    default:
      return 'default';
  }
}

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
    case 'very low':
      return 'default';
    default:
      return 'default';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Component(): JSX.Element {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['change-requests'],
    queryFn: fetchCRList,
  });

  const items = data?.data ?? [];

  if (isLoading) {
    return (
      <Box className="flex justify-center py-20">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box className="flex items-center justify-between mb-4">
        <Box>
          <Typography variant="h4">Change Requests</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            รายการคำขอเปลี่ยนแปลงทั้งหมด
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/change-request/new')}
        >
          New Request
        </Button>
      </Box>

      {items.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            ไม่มีรายการคำขอ (No change requests found)
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>CR Number</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Requester</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Impact</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow
                  key={item.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/app/change-requests/${item.id}`)}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      {item.crNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 250 }}>
                      {item.title}
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
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={item.status}
                      color={getStatusColor(item.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(item.createdAt).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
