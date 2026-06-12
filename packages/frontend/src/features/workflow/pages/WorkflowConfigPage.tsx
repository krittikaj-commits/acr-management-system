import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
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
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import VerifiedIcon from '@mui/icons-material/Verified';
import WarningIcon from '@mui/icons-material/Warning';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { api } from '@/services/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface IWorkflowStep {
  id: string;
  name: string;
  stepType: string;
  assignedRole: string;
  requiredFields: string[];
  sortOrder: number;
  conditions: IStepCondition[];
}

interface IStepCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface IWorkflowDefinition {
  id: string;
  name: string;
  version: number;
  isActive: boolean;
  description: string | null;
  steps: IWorkflowStep[];
  createdAt: string;
  updatedAt: string;
}

interface IValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ─── Zod Schemas ────────────────────────────────────────────────────────────

const stepFormSchema = z.object({
  name: z.string().min(1, 'Step name is required'),
  stepType: z.string().min(1, 'Step type is required'),
  assignedRole: z.string().min(1, 'Assigned role is required'),
  requiredFields: z.string().optional(),
});

const conditionSchema = z.object({
  field: z.string().min(1, 'Field is required'),
  operator: z.string().min(1, 'Operator is required'),
  value: z.string().min(1, 'Value is required'),
});

type StepFormValues = z.infer<typeof stepFormSchema>;
type ConditionFormValues = z.infer<typeof conditionSchema>;

// ─── Constants ──────────────────────────────────────────────────────────────

const STEP_TYPE_OPTIONS = [
  { value: 'submission', label: 'Submission' },
  { value: 'review', label: 'Review' },
  { value: 'approval', label: 'Approval' },
  { value: 'implementation', label: 'Implementation' },
  { value: 'verification', label: 'Verification' },
  { value: 'closure', label: 'Closure' },
] as const;

const ROLE_OPTIONS = [
  { value: 'requester', label: 'Requester' },
  { value: 'call_center', label: 'Call Center' },
  { value: 'it_reviewer', label: 'IT Reviewer' },
  { value: 'approver', label: 'Approver' },
  { value: 'implementer', label: 'Implementer' },
  { value: 'admin', label: 'Admin' },
] as const;

const OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'in', label: 'In (comma-separated)' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
] as const;

// ─── API ────────────────────────────────────────────────────────────────────

async function fetchWorkflowDefinitions(): Promise<IWorkflowDefinition[]> {
  const response = await api.get<{ data: IWorkflowDefinition[] }>(
    '/admin/workflows',
  );
  return response.data.data;
}

async function addWorkflowStep(
  workflowId: string,
  data: StepFormValues & { requiredFields: string[] },
): Promise<void> {
  await api.post(`/admin/workflows/${workflowId}/steps`, data);
}

async function updateWorkflowStep(
  workflowId: string,
  stepId: string,
  data: StepFormValues & { requiredFields: string[] },
): Promise<void> {
  await api.patch(`/admin/workflows/${workflowId}/steps/${stepId}`, data);
}

async function deleteWorkflowStep(
  workflowId: string,
  stepId: string,
): Promise<void> {
  await api.delete(`/admin/workflows/${workflowId}/steps/${stepId}`);
}

async function addStepCondition(
  workflowId: string,
  stepId: string,
  data: ConditionFormValues,
): Promise<void> {
  await api.post(
    `/admin/workflows/${workflowId}/steps/${stepId}/conditions`,
    data,
  );
}

async function removeStepCondition(
  workflowId: string,
  stepId: string,
  conditionId: string,
): Promise<void> {
  await api.delete(
    `/admin/workflows/${workflowId}/steps/${stepId}/conditions/${conditionId}`,
  );
}

async function validateWorkflow(
  workflowId: string,
): Promise<IValidationResult> {
  const response = await api.post<{ data: IValidationResult }>(
    `/admin/workflows/${workflowId}/validate`,
  );
  return response.data.data;
}

// ─── Step Type Colors ───────────────────────────────────────────────────────

function getStepColor(
  type: string,
): 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' {
  switch (type) {
    case 'submission':
      return 'primary';
    case 'review':
      return 'info';
    case 'approval':
      return 'warning';
    case 'implementation':
      return 'secondary';
    case 'verification':
      return 'success';
    case 'closure':
      return 'success';
    default:
      return 'primary';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Component(): JSX.Element {
  const queryClient = useQueryClient();
  const [selectedWorkflow, setSelectedWorkflow] =
    useState<IWorkflowDefinition | null>(null);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<IWorkflowStep | null>(null);
  const [selectedStepForCondition, setSelectedStepForCondition] =
    useState<IWorkflowStep | null>(null);
  const [validationResult, setValidationResult] =
    useState<IValidationResult | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<IWorkflowStep | null>(null);

  // Fetch workflows
  const {
    data: workflows,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['admin', 'workflows'],
    queryFn: fetchWorkflowDefinitions,
  });

  // Step form
  const stepForm = useForm<StepFormValues>({
    resolver: zodResolver(stepFormSchema),
    defaultValues: {
      name: '',
      stepType: '',
      assignedRole: '',
      requiredFields: '',
    },
  });

  // Condition form
  const conditionForm = useForm<ConditionFormValues>({
    resolver: zodResolver(conditionSchema),
    defaultValues: { field: '', operator: '', value: '' },
  });

  // Mutations
  const addStepMutation = useMutation({
    mutationFn: (data: StepFormValues) => {
      const payload = {
        ...data,
        requiredFields: data.requiredFields
          ? data.requiredFields.split(',').map((f) => f.trim())
          : [],
      };
      return addWorkflowStep(selectedWorkflow!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      closeStepDialog();
      showSuccess('เพิ่มขั้นตอนสำเร็จ (Step added)');
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: (data: StepFormValues) => {
      const payload = {
        ...data,
        requiredFields: data.requiredFields
          ? data.requiredFields.split(',').map((f) => f.trim())
          : [],
      };
      return updateWorkflowStep(
        selectedWorkflow!.id,
        editingStep!.id,
        payload,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      closeStepDialog();
      showSuccess('แก้ไขขั้นตอนสำเร็จ (Step updated)');
    },
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId: string) =>
      deleteWorkflowStep(selectedWorkflow!.id, stepId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      setDeleteConfirmOpen(false);
      setStepToDelete(null);
      showSuccess('ลบขั้นตอนสำเร็จ (Step deleted)');
    },
  });

  const addConditionMutation = useMutation({
    mutationFn: (data: ConditionFormValues) =>
      addStepCondition(
        selectedWorkflow!.id,
        selectedStepForCondition!.id,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      setConditionDialogOpen(false);
      conditionForm.reset();
      showSuccess('เพิ่มเงื่อนไขสำเร็จ (Condition added)');
    },
  });

  const removeConditionMutation = useMutation({
    mutationFn: ({
      stepId,
      conditionId,
    }: {
      stepId: string;
      conditionId: string;
    }) => removeStepCondition(selectedWorkflow!.id, stepId, conditionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'workflows'] });
      showSuccess('ลบเงื่อนไขสำเร็จ (Condition removed)');
    },
  });

  const validateMutation = useMutation({
    mutationFn: () => validateWorkflow(selectedWorkflow!.id),
    onSuccess: (result) => {
      setValidationResult(result);
    },
  });

  const showSuccess = (message: string): void => {
    setActionSuccess(message);
    setTimeout(() => setActionSuccess(null), 4000);
  };

  const closeStepDialog = (): void => {
    setStepDialogOpen(false);
    setEditingStep(null);
    stepForm.reset({ name: '', stepType: '', assignedRole: '', requiredFields: '' });
  };

  const handleOpenAddStep = (): void => {
    setEditingStep(null);
    stepForm.reset({ name: '', stepType: '', assignedRole: '', requiredFields: '' });
    setStepDialogOpen(true);
  };

  const handleOpenEditStep = (step: IWorkflowStep): void => {
    setEditingStep(step);
    stepForm.reset({
      name: step.name,
      stepType: step.stepType,
      assignedRole: step.assignedRole,
      requiredFields: step.requiredFields.join(', '),
    });
    setStepDialogOpen(true);
  };

  const handleStepSubmit = (values: StepFormValues): void => {
    if (editingStep) {
      updateStepMutation.mutate(values);
    } else {
      addStepMutation.mutate(values);
    }
  };

  const handleOpenConditionDialog = (step: IWorkflowStep): void => {
    setSelectedStepForCondition(step);
    conditionForm.reset({ field: '', operator: '', value: '' });
    setConditionDialogOpen(true);
  };

  const handleConditionSubmit = (values: ConditionFormValues): void => {
    addConditionMutation.mutate(values);
  };

  const handleDeleteStep = (step: IWorkflowStep): void => {
    setStepToDelete(step);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = (): void => {
    if (stepToDelete) {
      deleteStepMutation.mutate(stepToDelete.id);
    }
  };

  // Auto-select the first workflow when data loads
  const activeWorkflow =
    selectedWorkflow ??
    (workflows && workflows.length > 0 ? workflows[0] : null);

  // Keep selectedWorkflow in sync with fresh data
  const currentWorkflow = workflows?.find((w) => w.id === activeWorkflow?.id);
  const steps = currentWorkflow?.steps ?? [];

  return (
    <Box>
      <Box className="flex items-center justify-between mb-4">
        <Box>
          <Typography variant="h4">Workflow Configuration</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            กำหนดขั้นตอนและเงื่อนไข Workflow
          </Typography>
        </Box>
        {activeWorkflow && (
          <Box className="flex gap-2">
            <Button
              variant="outlined"
              startIcon={<VerifiedIcon />}
              onClick={() => validateMutation.mutate()}
              disabled={validateMutation.isPending}
            >
              {validateMutation.isPending ? 'Validating...' : 'Validate'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddStep}
            >
              Add Step
            </Button>
          </Box>
        )}
      </Box>

      {actionSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {actionSuccess}
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load workflow configuration. Please try again.
        </Alert>
      )}

      {/* Validation Result */}
      {validationResult && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box className="flex items-center gap-2 mb-2">
            {validationResult.isValid ? (
              <CheckCircleIcon color="success" />
            ) : (
              <WarningIcon color="error" />
            )}
            <Typography variant="h6">
              {validationResult.isValid
                ? 'Workflow is valid'
                : 'Validation Failed'}
            </Typography>
          </Box>
          {validationResult.errors.length > 0 && (
            <Box sx={{ mb: 1 }}>
              {validationResult.errors.map((err, idx) => (
                <Alert key={idx} severity="error" sx={{ mb: 0.5 }}>
                  {err}
                </Alert>
              ))}
            </Box>
          )}
          {validationResult.warnings.length > 0 && (
            <Box>
              {validationResult.warnings.map((warn, idx) => (
                <Alert key={idx} severity="warning" sx={{ mb: 0.5 }}>
                  {warn}
                </Alert>
              ))}
            </Box>
          )}
        </Paper>
      )}

      {isLoading ? (
        <Box className="flex justify-center py-12">
          <CircularProgress />
        </Box>
      ) : !activeWorkflow ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No workflow definitions found.
          </Typography>
        </Paper>
      ) : (
        <Box className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Workflow List (sidebar) */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Workflow Definitions
            </Typography>
            <List dense>
              {workflows?.map((wf) => (
                <ListItem
                  key={wf.id}
                  component="div"
                  onClick={() => setSelectedWorkflow(wf)}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    cursor: 'pointer',
                    bgcolor:
                      wf.id === activeWorkflow.id
                        ? 'primary.50'
                        : 'transparent',
                    border:
                      wf.id === activeWorkflow.id
                        ? '1px solid'
                        : '1px solid transparent',
                    borderColor:
                      wf.id === activeWorkflow.id
                        ? 'primary.main'
                        : 'transparent',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PlayArrowIcon
                      fontSize="small"
                      color={wf.isActive ? 'success' : 'disabled'}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={wf.name}
                    secondary={`v${wf.version} • ${wf.steps.length} steps`}
                  />
                  {wf.isActive && (
                    <Chip label="Active" size="small" color="success" />
                  )}
                </ListItem>
              ))}
            </List>
          </Paper>

          {/* Visual Step List */}
          <Box className="lg:col-span-2">
            <Paper sx={{ p: 3 }}>
              <Box className="flex items-center justify-between mb-3">
                <Box>
                  <Typography variant="h6">
                    {currentWorkflow?.name ?? activeWorkflow.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Version {currentWorkflow?.version ?? activeWorkflow.version}{' '}
                    • {steps.length} steps
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {steps.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>
                  No steps defined. Add a step to get started.
                </Typography>
              ) : (
                <Box>
                  {steps
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((step, index) => (
                      <Box key={step.id}>
                        {/* Step Card */}
                        <Card
                          variant="outlined"
                          sx={{
                            borderLeft: 4,
                            borderLeftColor: `${getStepColor(step.stepType)}.main`,
                          }}
                        >
                          <CardContent sx={{ py: 2, '&:last-child': { pb: 2 } }}>
                            <Box className="flex items-start justify-between">
                              <Box className="flex-1">
                                <Box className="flex items-center gap-2 mb-1">
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {index + 1}. {step.name}
                                  </Typography>
                                  <Chip
                                    label={step.stepType}
                                    color={getStepColor(step.stepType)}
                                    size="small"
                                    variant="outlined"
                                  />
                                </Box>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Role: {step.assignedRole}
                                </Typography>
                                {step.requiredFields.length > 0 && (
                                  <Box className="flex flex-wrap gap-1 mt-1">
                                    {step.requiredFields.map((field) => (
                                      <Chip
                                        key={field}
                                        label={field}
                                        size="small"
                                        variant="outlined"
                                        sx={{ fontSize: '0.7rem' }}
                                      />
                                    ))}
                                  </Box>
                                )}
                                {/* Conditions */}
                                {step.conditions.length > 0 && (
                                  <Box sx={{ mt: 1 }}>
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                    >
                                      Conditions:
                                    </Typography>
                                    {step.conditions.map((cond) => (
                                      <Box
                                        key={cond.id}
                                        className="flex items-center gap-1 mt-0.5"
                                      >
                                        <Chip
                                          label={`${cond.field} ${cond.operator} ${cond.value}`}
                                          size="small"
                                          color="info"
                                          variant="outlined"
                                          onDelete={() =>
                                            removeConditionMutation.mutate({
                                              stepId: step.id,
                                              conditionId: cond.id,
                                            })
                                          }
                                          sx={{ fontSize: '0.7rem' }}
                                        />
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Box>
                              <Box className="flex gap-0.5">
                                <Tooltip title="Add Condition">
                                  <IconButton
                                    size="small"
                                    onClick={() =>
                                      handleOpenConditionDialog(step)
                                    }
                                  >
                                    <AddIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit Step">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleOpenEditStep(step)}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete Step">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDeleteStep(step)}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>

                        {/* Arrow between steps */}
                        {index < steps.length - 1 && (
                          <Box className="flex justify-center py-1">
                            <ArrowDownwardIcon
                              fontSize="small"
                              color="disabled"
                            />
                          </Box>
                        )}
                      </Box>
                    ))}
                </Box>
              )}
            </Paper>
          </Box>
        </Box>
      )}

      {/* Add/Edit Step Dialog */}
      <Dialog
        open={stepDialogOpen}
        onClose={closeStepDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{editingStep ? 'Edit Step' : 'Add Step'}</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="step-form"
            onSubmit={stepForm.handleSubmit(handleStepSubmit)}
            noValidate
            className="flex flex-col gap-3 pt-2"
          >
            <Controller
              name="name"
              control={stepForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Step Name *"
                  fullWidth
                  placeholder="e.g., IT Review"
                  error={!!stepForm.formState.errors.name}
                  helperText={stepForm.formState.errors.name?.message}
                />
              )}
            />
            <Controller
              name="stepType"
              control={stepForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Step Type *"
                  fullWidth
                  error={!!stepForm.formState.errors.stepType}
                  helperText={stepForm.formState.errors.stepType?.message}
                >
                  {STEP_TYPE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="assignedRole"
              control={stepForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Assigned Role *"
                  fullWidth
                  error={!!stepForm.formState.errors.assignedRole}
                  helperText={stepForm.formState.errors.assignedRole?.message}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="requiredFields"
              control={stepForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Required Fields"
                  fullWidth
                  placeholder="e.g., impactAnalysis, riskAssessment"
                  helperText="Comma-separated field names that must be filled in this step"
                  error={!!stepForm.formState.errors.requiredFields}
                />
              )}
            />
          </Box>
          {(addStepMutation.isError || updateStepMutation.isError) && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Operation failed. Please try again.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeStepDialog}>Cancel</Button>
          <Button
            type="submit"
            form="step-form"
            variant="contained"
            disabled={addStepMutation.isPending || updateStepMutation.isPending}
          >
            {addStepMutation.isPending || updateStepMutation.isPending
              ? 'Saving...'
              : editingStep
                ? 'Save'
                : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Condition Dialog */}
      <Dialog
        open={conditionDialogOpen}
        onClose={() => setConditionDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Add Condition — {selectedStepForCondition?.name}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="condition-form"
            onSubmit={conditionForm.handleSubmit(handleConditionSubmit)}
            noValidate
            className="flex flex-col gap-3 pt-2"
          >
            <Controller
              name="field"
              control={conditionForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Field *"
                  fullWidth
                  placeholder="e.g., impactLevel, changeType"
                  error={!!conditionForm.formState.errors.field}
                  helperText={conditionForm.formState.errors.field?.message}
                />
              )}
            />
            <Controller
              name="operator"
              control={conditionForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Operator *"
                  fullWidth
                  error={!!conditionForm.formState.errors.operator}
                  helperText={conditionForm.formState.errors.operator?.message}
                >
                  {OPERATOR_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="value"
              control={conditionForm.control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Value *"
                  fullWidth
                  placeholder="e.g., major, high"
                  error={!!conditionForm.formState.errors.value}
                  helperText={conditionForm.formState.errors.value?.message}
                />
              )}
            />
          </Box>
          {addConditionMutation.isError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Failed to add condition. Please try again.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConditionDialogOpen(false)}>Cancel</Button>
          <Button
            type="submit"
            form="condition-form"
            variant="contained"
            disabled={addConditionMutation.isPending}
          >
            {addConditionMutation.isPending ? 'Adding...' : 'Add Condition'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete step &quot;{stepToDelete?.name}
            &quot;? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleteStepMutation.isPending}
          >
            {deleteStepMutation.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default WorkflowConfigPage;

function WorkflowConfigPage(): JSX.Element {
  return <Component />;
}
