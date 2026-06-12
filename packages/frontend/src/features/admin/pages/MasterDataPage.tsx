import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { api } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IMasterDataItem {
  id: string;
  code: string;
  nameEn: string;
  nameTh: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

interface IMasterDataListResponse {
  data: IMasterDataItem[];
  meta: {
    total: number;
  };
}

type MasterDataCategory = 'services' | 'impact-levels' | 'change-types';

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const masterDataSchema = z.object({
  code: z
    .string()
    .min(1, 'Code is required')
    .regex(
      /^[a-z0-9_]+$/,
      'Code must be lowercase letters, numbers, or underscores',
    ),
  nameEn: z.string().min(1, 'English name is required'),
  nameTh: z.string().min(1, 'Thai name is required'),
  description: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0, 'Sort order must be >= 0'),
});

type MasterDataFormValues = z.infer<typeof masterDataSchema>;

// ─── API ────────────────────────────────────────────────────────────────────

async function fetchMasterData(
  category: MasterDataCategory,
): Promise<IMasterDataListResponse> {
  const response = await api.get<{ data: IMasterDataListResponse }>(
    `/admin/master-data/${category}`,
  );
  return response.data.data;
}

async function createMasterDataItem(
  category: MasterDataCategory,
  data: MasterDataFormValues,
): Promise<void> {
  await api.post(`/admin/master-data/${category}`, data);
}

async function updateMasterDataItem(
  category: MasterDataCategory,
  id: string,
  data: MasterDataFormValues,
): Promise<void> {
  await api.patch(`/admin/master-data/${category}/${id}`, data);
}

async function toggleMasterDataStatus(
  category: MasterDataCategory,
  id: string,
  isActive: boolean,
): Promise<void> {
  await api.patch(`/admin/master-data/${category}/${id}/status`, { isActive });
}

// ─── Tab Categories ─────────────────────────────────────────────────────────

const CATEGORIES: {
  key: MasterDataCategory;
  label: string;
  labelTh: string;
}[] = [
  { key: 'services', label: 'Services', labelTh: 'บริการ' },
  { key: 'impact-levels', label: 'Impact Levels', labelTh: 'ระดับผลกระทบ' },
  { key: 'change-types', label: 'Change Types', labelTh: 'ประเภทการเปลี่ยนแปลง' },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function Component(): JSX.Element {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IMasterDataItem | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const currentCategory = CATEGORIES[activeTab].key;

  // Fetch master data
  const {
    data: masterData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'master-data', currentCategory],
    queryFn: () => fetchMasterData(currentCategory),
  });

  // Form
  const form = useForm<MasterDataFormValues>({
    resolver: zodResolver(masterDataSchema),
    defaultValues: {
      code: '',
      nameEn: '',
      nameTh: '',
      description: '',
      sortOrder: 0,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: MasterDataFormValues) =>
      createMasterDataItem(currentCategory, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'master-data', currentCategory],
      });
      closeDialog();
      showSuccess('สร้างรายการสำเร็จ (Item created)');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: MasterDataFormValues }) =>
      updateMasterDataItem(currentCategory, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'master-data', currentCategory],
      });
      closeDialog();
      showSuccess('แก้ไขรายการสำเร็จ (Item updated)');
    },
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleMasterDataStatus(currentCategory, id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['admin', 'master-data', currentCategory],
      });
      showSuccess('เปลี่ยนสถานะสำเร็จ (Status updated)');
    },
  });

  const showSuccess = (message: string): void => {
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const closeDialog = (): void => {
    setDialogOpen(false);
    setEditingItem(null);
    form.reset({
      code: '',
      nameEn: '',
      nameTh: '',
      description: '',
      sortOrder: 0,
    });
  };

  const handleOpenCreate = (): void => {
    setEditingItem(null);
    form.reset({
      code: '',
      nameEn: '',
      nameTh: '',
      description: '',
      sortOrder: 0,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: IMasterDataItem): void => {
    setEditingItem(item);
    form.reset({
      code: item.code,
      nameEn: item.nameEn,
      nameTh: item.nameTh,
      description: item.description ?? '',
      sortOrder: item.sortOrder,
    });
    setDialogOpen(true);
  };

  const handleFormSubmit = (values: MasterDataFormValues): void => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: values });
    } else {
      createMutation.mutate(values);
    }
  };

  const handleToggle = (item: IMasterDataItem): void => {
    toggleMutation.mutate({ id: item.id, isActive: !item.isActive });
  };

  const items = masterData?.data ?? [];
  const isFormSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Box>
      <Box className="flex items-center justify-between mb-4">
        <Box>
          <Typography variant="h4">Master Data</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            จัดการข้อมูลหลัก — Services, Impact Levels, Change Types
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
        >
          Add Item
        </Button>
      </Box>

      {actionSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {actionSuccess}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load data. Please try again.
        </Alert>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, value) => setActiveTab(value)}
          variant="fullWidth"
        >
          {CATEGORIES.map((cat) => (
            <Tab key={cat.key} label={`${cat.label} (${cat.labelTh})`} />
          ))}
        </Tabs>
      </Paper>

      {/* Table */}
      {isLoading ? (
        <Box className="flex justify-center py-12">
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name (EN)</TableCell>
                <TableCell>Name (TH)</TableCell>
                <TableCell>Sort Order</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No items in this category
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        fontWeight={600}
                      >
                        {item.code}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.nameEn}</TableCell>
                    <TableCell>{item.nameTh}</TableCell>
                    <TableCell>{item.sortOrder}</TableCell>
                    <TableCell>
                      <Chip
                        label={item.isActive ? 'Active' : 'Disabled'}
                        color={item.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Box className="flex items-center justify-center gap-1">
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={item.isActive ? 'Disable' : 'Enable'}
                        >
                          <Switch
                            size="small"
                            checked={item.isActive}
                            onChange={() => handleToggle(item)}
                            disabled={toggleMutation.isPending}
                          />
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingItem ? 'Edit Item' : 'Create Item'} —{' '}
          {CATEGORIES[activeTab].label}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="master-data-form"
            onSubmit={form.handleSubmit(handleFormSubmit)}
            noValidate
            className="flex flex-col gap-3 pt-2"
          >
            <Controller
              name="code"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Code *"
                  fullWidth
                  disabled={!!editingItem}
                  placeholder="e.g., firewall_change"
                  error={!!form.formState.errors.code}
                  helperText={
                    form.formState.errors.code?.message ??
                    'Lowercase letters, numbers, underscores only'
                  }
                />
              )}
            />
            <Controller
              name="nameEn"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Name (English) *"
                  fullWidth
                  error={!!form.formState.errors.nameEn}
                  helperText={form.formState.errors.nameEn?.message}
                />
              )}
            />
            <Controller
              name="nameTh"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Name (Thai) *"
                  fullWidth
                  error={!!form.formState.errors.nameTh}
                  helperText={form.formState.errors.nameTh?.message}
                />
              )}
            />
            <Controller
              name="description"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Description"
                  fullWidth
                  multiline
                  rows={2}
                  error={!!form.formState.errors.description}
                  helperText={form.formState.errors.description?.message}
                />
              )}
            />
            <Controller
              name="sortOrder"
              control={form.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Sort Order"
                  type="number"
                  fullWidth
                  error={!!form.formState.errors.sortOrder}
                  helperText={form.formState.errors.sortOrder?.message}
                />
              )}
            />
          </Box>
          {(createMutation.isError || updateMutation.isError) && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Operation failed. Please try again.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button
            type="submit"
            form="master-data-form"
            variant="contained"
            disabled={isFormSubmitting}
          >
            {isFormSubmitting
              ? 'Saving...'
              : editingItem
                ? 'Save'
                : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MasterDataPage;

function MasterDataPage(): JSX.Element {
  return <Component />;
}
