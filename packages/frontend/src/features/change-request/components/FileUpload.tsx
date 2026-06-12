import { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Alert from '@mui/material/Alert';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import axios from 'axios';
import { api } from '@/services/api';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
];

/** Upload status for each file */
type UploadStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

/** Tracked file with upload state */
export interface IUploadedFile {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  /** Attachment ID returned after confirmation */
  attachmentId?: string;
}

interface FileUploadProps {
  /** Existing files (for edit mode) */
  existingFiles?: IUploadedFile[];
  /** Called when file list changes */
  onChange: (files: IUploadedFile[]) => void;
  /** Change Request ID (for linking attachments in edit mode) */
  changeRequestId?: string;
  /** Whether component is disabled */
  disabled?: boolean;
}

/**
 * File upload component using presigned URL flow:
 * 1. POST /attachments/upload-url → get presigned S3 URL
 * 2. PUT to S3 presigned URL
 * 3. POST /attachments/confirm → confirm upload and link to CR
 */
export function FileUpload({
  existingFiles = [],
  onChange,
  changeRequestId,
  disabled = false,
}: FileUploadProps): JSX.Element {
  const [files, setFiles] = useState<IUploadedFile[]>(existingFiles);
  const [error, setError] = useState<string | null>(null);

  const updateFiles = useCallback(
    (updatedFiles: IUploadedFile[]) => {
      setFiles(updatedFiles);
      onChange(updatedFiles);
    },
    [onChange],
  );

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File "${file.name}" exceeds ${MAX_FILE_SIZE_MB}MB limit`;
    }
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return `File "${file.name}" has unsupported file type`;
    }
    return null;
  };

  const uploadFile = async (
    file: File,
    fileEntry: IUploadedFile,
  ): Promise<void> => {
    try {
      // Step 1: Get presigned upload URL
      const uploadUrlResponse = await api.post<{
        data: { uploadUrl: string; s3Key: string };
      }>('/attachments/upload-url', {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        changeRequestId,
      });

      const { uploadUrl, s3Key } = uploadUrlResponse.data.data;

      // Step 2: Upload to S3 via presigned URL
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setFiles((prev) =>
            prev.map((f) => (f.id === fileEntry.id ? { ...f, progress } : f)),
          );
        },
      });

      // Step 3: Confirm upload
      const confirmResponse = await api.post<{
        data: { id: string };
      }>('/attachments/confirm', {
        s3Key,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        changeRequestId,
      });

      const attachmentId = confirmResponse.data.data.id;

      setFiles((prev) => {
        const updated = prev.map((f) =>
          f.id === fileEntry.id
            ? { ...f, status: 'uploaded' as UploadStatus, progress: 100, attachmentId }
            : f,
        );
        onChange(updated);
        return updated;
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Upload failed';
      setFiles((prev) => {
        const updated = prev.map((f) =>
          f.id === fileEntry.id
            ? { ...f, status: 'error' as UploadStatus, error: errorMessage }
            : f,
        );
        onChange(updated);
        return updated;
      });
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> => {
    setError(null);
    const selectedFiles = event.target.files;
    if (!selectedFiles) return;

    const newEntries: IUploadedFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      if (!file) continue;

      const validationError = validateFile(file);

      if (validationError) {
        setError(validationError);
        continue;
      }

      const entry: IUploadedFile = {
        id: `${Date.now()}-${i}-${file.name}`,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        status: 'uploading',
        progress: 0,
      };

      newEntries.push(entry);
    }

    const updatedFiles = [...files, ...newEntries];
    setFiles(updatedFiles);

    // Start uploading each file
    for (let i = 0; i < newEntries.length; i++) {
      const file: File | undefined = selectedFiles[i];
      const entry: IUploadedFile | undefined = newEntries[i];
      if (file !== undefined && entry !== undefined) {
        uploadFile(file, entry);
      }
    }

    // Reset input
    event.target.value = '';
  };

  const handleRemove = (fileId: string): void => {
    const updated = files.filter((f) => f.id !== fileId);
    updateFiles(updated);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusIcon = (status: UploadStatus): JSX.Element => {
    switch (status) {
      case 'uploaded':
        return <CheckCircleIcon color="success" fontSize="small" />;
      case 'error':
        return <ErrorIcon color="error" fontSize="small" />;
      default:
        return <AttachFileIcon color="action" fontSize="small" />;
    }
  };

  return (
    <Box>
      <Box className="flex items-center gap-3 mb-2">
        <Button
          variant="outlined"
          component="label"
          startIcon={<CloudUploadIcon />}
          disabled={disabled}
          size="small"
        >
          Choose Files
          <input
            type="file"
            multiple
            hidden
            onChange={handleFileSelect}
            accept={ALLOWED_FILE_TYPES.join(',')}
          />
        </Button>
        <Typography variant="body2" color="text.secondary">
          Max {MAX_FILE_SIZE_MB}MB per file. Accepted: images, PDF, Word, Excel,
          TXT, ZIP
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {files.length > 0 && (
        <List dense sx={{ bgcolor: 'background.paper', borderRadius: 1 }}>
          {files.map((file) => (
            <ListItem
              key={file.id}
              secondaryAction={
                !disabled && (
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => handleRemove(file.id)}
                    aria-label={`Remove ${file.fileName}`}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                )
              }
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                {getStatusIcon(file.status)}
              </ListItemIcon>
              <ListItemText
                primary={file.fileName}
                secondary={
                  <Box component="span">
                    <Typography
                      component="span"
                      variant="body2"
                      color="text.secondary"
                    >
                      {formatFileSize(file.fileSize)}
                    </Typography>
                    {file.error && (
                      <Typography
                        component="span"
                        variant="body2"
                        color="error"
                        sx={{ ml: 1 }}
                      >
                        — {file.error}
                      </Typography>
                    )}
                  </Box>
                }
              />
              {file.status === 'uploading' && (
                <Box sx={{ width: 100, mr: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={file.progress}
                    sx={{ borderRadius: 1 }}
                  />
                </Box>
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
