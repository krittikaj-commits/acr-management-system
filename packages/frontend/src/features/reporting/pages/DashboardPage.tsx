import { useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import CircularProgress from '@mui/material/CircularProgress';
import AssignmentIcon from '@mui/icons-material/Assignment';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { api } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IDashboardStats {
  totalCRs: number;
  openCRs: number;
  closedCRs: number;
  avgDaysToClose: number;
}

interface IMonthlyData {
  month: string;
  count: number;
}

interface IImpactData {
  impactLevel: string;
  count: number;
}

interface IChangeTypeData {
  changeType: string;
  count: number;
}

interface IStatusData {
  status: string;
  count: number;
}

interface IDashboardResponse {
  stats: IDashboardStats;
  crByMonth: IMonthlyData[];
  crByImpact: IImpactData[];
  crByChangeType: IChangeTypeData[];
  crByStatus: IStatusData[];
}

// ─── Colors ─────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#d32f2f', '#ed6c02', '#1565c0', '#2e7d32', '#9e9e9e'];
const BAR_COLOR = '#1565c0';
const LINE_COLOR = '#3949ab';

// ─── API ────────────────────────────────────────────────────────────────────

async function fetchDashboard(): Promise<IDashboardResponse> {
  const response = await api.get<{ data: IDashboardResponse }>(
    '/reports/dashboard',
  );
  return response.data.data;
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}): JSX.Element {
  return (
    <Card>
      <CardContent>
        <Box className="flex items-center justify-between">
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h4" fontWeight={700}>
              {value}
            </Typography>
          </Box>
          <Box
            className="flex items-center justify-center rounded-full"
            sx={{
              width: 48,
              height: 48,
              backgroundColor: `${color}15`,
              color,
            }}
          >
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Dashboard page with stats cards and charts.
 * Exported as Component for React Router lazy loading.
 */
export function Component(): JSX.Element {
  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'dashboard'],
    queryFn: fetchDashboard,
  });

  if (isLoading) {
    return (
      <Box className="flex justify-center py-20">
        <CircularProgress />
      </Box>
    );
  }

  const stats = data?.stats ?? {
    totalCRs: 0,
    openCRs: 0,
    closedCRs: 0,
    avgDaysToClose: 0,
  };
  const crByMonth = data?.crByMonth ?? [];
  const crByImpact = data?.crByImpact ?? [];
  const crByChangeType = data?.crByChangeType ?? [];
  const crByStatus = data?.crByStatus ?? [];

  return (
    <Box>
      <Typography variant="h4" className="mb-6">
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} className="mb-6">
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Total CRs"
            value={stats.totalCRs}
            icon={<AssignmentIcon />}
            color="#1565c0"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Open CRs"
            value={stats.openCRs}
            icon={<PendingActionsIcon />}
            color="#ed6c02"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Closed CRs"
            value={stats.closedCRs}
            icon={<CheckCircleIcon />}
            color="#2e7d32"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Avg Days to Close"
            value={stats.avgDaysToClose}
            icon={<ScheduleIcon />}
            color="#3949ab"
          />
        </Grid>
      </Grid>

      {/* Charts Row 1 — Line chart (full width) */}
      <Card className="mb-6">
        <CardContent>
          <Typography variant="h6" className="mb-4">
            Change Requests by Month (Last 12 Months)
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={crByMonth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke={LINE_COLOR}
                strokeWidth={2}
                name="CRs"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Row 2 — Pie + Bar */}
      <Grid container spacing={3} className="mb-6">
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" className="mb-4">
                CRs by Impact Level
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={crByImpact}
                    dataKey="count"
                    nameKey="impactLevel"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ impactLevel, count }) =>
                      `${impactLevel}: ${count}`
                    }
                  >
                    {crByImpact.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" className="mb-4">
                CRs by Change Type
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={crByChangeType}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="changeType" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill={BAR_COLOR} name="CRs" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Row 3 — Status Bar (full width) */}
      <Card>
        <CardContent>
          <Typography variant="h6" className="mb-4">
            CRs by Workflow Status
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={crByStatus} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="status" width={140} />
              <Tooltip />
              <Bar dataKey="count" fill="#3949ab" name="CRs" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
