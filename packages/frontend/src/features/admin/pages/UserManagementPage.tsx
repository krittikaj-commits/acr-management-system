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
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Switch from '@mui/material/Switch';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { api } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface IUserListResponse {
  data: IUser[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const createUserSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.string().min(1, 'Role is required'),
});

const editUserSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email format'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.string().min(1, 'Role is required'),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;
type EditUserFormValues = z.infer<typeof editUserSchema>;

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'call_center', label: 'Call Center' },
  { value: 'it_reviewer', label: 'IT Reviewer' },
  { value: 'approver', label: 'Approver' },
  { value: 'implementer', label: 'Implementer' },
  { value: 'auditor', label: 'Auditor' },
] as const;

// ─── API ────────────────────────────────────────────────────────────────────

async function fetchUsers(): Promise<IUserListResponse> {
  const response = await api.get<{ data: IUserListResponse }>('/admin/users');
  return response.data.data;
}

async function createUser(data: CreateUserFormValues): Promise<void> {
  await api.post('/admin/users', data);
}

async function updateUser(
  id: string,
  data: EditUserFormValues,
): Promise<void> {
  await api.patch(`/admin/users/${id}`, data);
}

async function toggleUserStatus(
  id: string,
  isActive: boolean,
): Promise<void> {
  await api.patch(`/admin/users/${id}/status`, { isActive });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Component(): JSX.Element {
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<IUser | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Fetch users
  const {
    data: userData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: fetchUsers,
  });

  // Create user form
  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: '',
    },
  });

  // Edit user form
  const editForm = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setCreateDialogOpen(false);
      createForm.reset();
      showSuccess('สร้างผู้ใช้สำเร็จ (User created)');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditUserFormValues }) =>
      updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setEditDialogOpen(false);
      setEditingUser(null);
      showSuccess('แก้ไขผู้ใช้สำเร็จ (User updated)');
    },
  });

  // Toggle status mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleUserStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      showSuccess('เปลี่ยนสถานะสำเร็จ (Status updated)');
    },
  });

  const showSuccess = (message: string): void => {
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  // Handlers
  const handleOpenEdit = (user: IUser): void => {
    setEditingUser(user);
    editForm.reset({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    });
    setEditDialogOpen(true);
  };

  const handleCreateSubmit = (values: CreateUserFormValues): void => {
    createMutation.mutate(values);
  };

  const handleEditSubmit = (values: EditUserFormValues): void => {
    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, data: values });
    }
  };

  const handleToggleStatus = (user: IUser): void => {
    toggleMutation.mutate({ id: user.id, isActive: !user.isActive });
  };

  const users = userData?.data ?? [];

  return (
    <Box>
      <Box className="flex items-center justify-between mb-4">
        <Box>
          <Typography variant="h4">User Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            จัดการผู้ใช้งานและสิทธิ์การเข้าถึง
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Add User
        </Button>
      </Box>

      {actionSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {actionSuccess}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load users. Please try again.
        </Alert>
      )}

      {isLoading ? (
        <Box className="flex justify-center py-12">
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No users found
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>
                      <Chip label={user.role} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.isActive ? 'Active' : 'Inactive'}
                        color={user.isActive ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {new Date(user.createdAt).toLocaleDateString('th-TH')}
                    </TableCell>
                    <TableCell align="center">
                      <Box className="flex items-center justify-center gap-1">
                        <Tooltip title="Edit User">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEdit(user)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Switch
                            size="small"
                            checked={user.isActive}
                            onChange={() => handleToggleStatus(user)}
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

      {/* Create User Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create User</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="create-user-form"
            onSubmit={createForm.handleSubmit(handleCreateSubmit)}
            noValidate
            className="flex flex-col gap-3 pt-2"
          >
            <Controller
              name="email"
              control={createForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email *"
                  type="email"
                  fullWidth
                  error={!!createForm.formState.errors.email}
                  helperText={createForm.formState.errors.email?.message}
                />
              )}
            />
            <Controller
              name="password"
              control={createForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Password *"
                  type="password"
                  fullWidth
                  error={!!createForm.formState.errors.password}
                  helperText={createForm.formState.errors.password?.message}
                />
              )}
            />
            <Box className="grid grid-cols-2 gap-3">
              <Controller
                name="firstName"
                control={createForm.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name *"
                    fullWidth
                    error={!!createForm.formState.errors.firstName}
                    helperText={createForm.formState.errors.firstName?.message}
                  />
                )}
              />
              <Controller
                name="lastName"
                control={createForm.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Last Name *"
                    fullWidth
                    error={!!createForm.formState.errors.lastName}
                    helperText={createForm.formState.errors.lastName?.message}
                  />
                )}
              />
            </Box>
            <Controller
              name="role"
              control={createForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Role *"
                  fullWidth
                  error={!!createForm.formState.errors.role}
                  helperText={createForm.formState.errors.role?.message}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Box>
          {createMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to create user. Please try again.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="create-user-form"
            variant="contained"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="edit-user-form"
            onSubmit={editForm.handleSubmit(handleEditSubmit)}
            noValidate
            className="flex flex-col gap-3 pt-2"
          >
            <Controller
              name="email"
              control={editForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Email *"
                  type="email"
                  fullWidth
                  error={!!editForm.formState.errors.email}
                  helperText={editForm.formState.errors.email?.message}
                />
              )}
            />
            <Box className="grid grid-cols-2 gap-3">
              <Controller
                name="firstName"
                control={editForm.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="First Name *"
                    fullWidth
                    error={!!editForm.formState.errors.firstName}
                    helperText={editForm.formState.errors.firstName?.message}
                  />
                )}
              />
              <Controller
                name="lastName"
                control={editForm.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Last Name *"
                    fullWidth
                    error={!!editForm.formState.errors.lastName}
                    helperText={editForm.formState.errors.lastName?.message}
                  />
                )}
              />
            </Box>
            <Controller
              name="role"
              control={editForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Role *"
                  fullWidth
                  error={!!editForm.formState.errors.role}
                  helperText={editForm.formState.errors.role?.message}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
          </Box>
          {updateMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to update user. Please try again.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="edit-user-form"
            variant="contained"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default UserManagementPage;

function UserManagementPage(): JSX.Element {
  return <Component />;
}
