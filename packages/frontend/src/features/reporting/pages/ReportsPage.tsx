import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import { api } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IExportFilters {
  changeType: string;
  impactLevel: string;
  dateFrom: string;
  dateTo: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const CHANGE_TYPES = [
  { value: '', label: 'All' },
  { value: 'Application', label: 'Application' },
  { value: 'Hardware', label: 'Hardware' },
  { value: 'Network', label: 'Network' },
  { value: 'Server', label: 'Server' },
  { value: 'Firewall', label: 'Firewall' },
  { value: 'OS', label: 'OS' },
  { value: 'VPN', label: 'VPN' },
  { value: 'Internet/Wi-Fi', label: 'Internet/Wi-Fi' },
  { value: 'Active Directory', label: 'Active Directory' },
  { value: 'Other', label: 'Other' },
];

const IMPACT_LEVELS = [
  { value: '', label: 'All' },
  { value: 'Major', label: 'Major' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
  { value: 'Very Low', label: 'Very Low' },
];

// ─── Component ──────────────────────────────────────────────────────────────

/**
 * Reports page with export filters and download buttons.
 * Exported as Component for React Router lazy loading.
 */
export function Component(): JSX.Element {
  const [filters, setFilters] = useState<IExportFilters>({
    changeType: '',
    impactLevel: '',
    dateFrom: '',
    dateTo: '',
  });
  const [exporting, setExporting] = useState<'excel' | 'pdf' | null>(null);

  const handleFilterChange = (field: keyof IExportFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const buildQueryParams = (): Record<string, string> => {
    const params: Record<string, string> = {};
    if (filters.changeType) params.changeType = filters.changeType;
    if (filters.impactLevel) params.impactLevel = filters.impactLevel;
    if (filters.dateFrom) params.dateFrom = filters.dateFrom;
    if (filters.dateTo) params.dateTo = filters.dateTo;
    return params;
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    setExporting(format);
    try {
      const params = buildQueryParams();
      const endpoint =
        format === 'excel' ? '/reports/export/excel' : '/reports/export/pdf';

      const response = await api.get(endpoint, {
        params,
        responseType: 'blob',
      });

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const extension = format === 'excel' ? 'xlsx' : 'pdf';
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `change-requests-report-${timestamp}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Error handled by global interceptor
    } finally {
      setExporting(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" className="mb-6">
        Reports & Export
      </Typography>

      {/* Filter Section */}
      <Card className="mb-6">
        <CardContent>
          <Typography variant="h6" className="mb-4">
            <FileDownloadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Export Filters
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mb-4">
            Select filters to narrow down the exported data. Leave blank to
            export all records.
          </Typography>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Change Type"
                value={filters.changeType}
                onChange={(e) =>
                  handleFilterChange('changeType', e.target.value)
                }
              >
                {CHANGE_TYPES.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                label="Impact Level"
                value={filters.impactLevel}
                onChange={(e) =>
                  handleFilterChange('impactLevel', e.target.value)
                }
              >
                {IMPACT_LEVELS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Date From"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                label="Date To"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Export Buttons */}
      <Card>
        <CardContent>
          <Typography variant="h6" className="mb-4">
            Download Report
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Box className="flex flex-wrap gap-4">
            <Button
              variant="contained"
              color="success"
              size="large"
              startIcon={
                exporting === 'excel' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <TableChartIcon />
                )
              }
              onClick={() => handleExport('excel')}
              disabled={exporting !== null}
            >
              Export Excel (.xlsx)
            </Button>

            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={
                exporting === 'pdf' ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <PictureAsPdfIcon />
                )
              }
              onClick={() => handleExport('pdf')}
              disabled={exporting !== null}
            >
              Export PDF
            </Button>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            className="mt-3 block"
          >
            Export will include all Change Requests matching the selected
            filters.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
