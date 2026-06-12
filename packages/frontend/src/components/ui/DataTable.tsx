import { useState, type ReactNode } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/** Sort direction */
type SortDirection = 'asc' | 'desc';

/** Column definition for DataTable */
export interface DataTableColumn<T> {
  /** Unique column identifier */
  id: string;
  /** Column header label */
  label: string;
  /** Whether this column is sortable (default: true) */
  sortable?: boolean;
  /** Minimum width */
  minWidth?: number;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom render function for cell content */
  render?: (row: T) => ReactNode;
  /** Accessor key on the row object (used when render is not provided) */
  accessor?: keyof T;
}

interface DataTableProps<T> {
  /** Array of column definitions */
  columns: DataTableColumn<T>[];
  /** Row data */
  rows: T[];
  /** Unique key extractor for each row */
  getRowKey: (row: T) => string | number;
  /** Total row count (for server-side pagination) */
  totalCount?: number;
  /** Current page (0-indexed) */
  page?: number;
  /** Rows per page */
  rowsPerPage?: number;
  /** Page change handler */
  onPageChange?: (page: number) => void;
  /** Rows per page change handler */
  onRowsPerPageChange?: (rowsPerPage: number) => void;
  /** Sort field change handler */
  onSortChange?: (field: string, direction: SortDirection) => void;
  /** Whether data is loading */
  loading?: boolean;
  /** Message to display when no data */
  emptyMessage?: string;
  /** Available rows per page options */
  rowsPerPageOptions?: number[];
  /** Whether to show pagination (default: true) */
  showPagination?: boolean;
}

/**
 * Reusable MUI DataTable with sorting and pagination.
 * Supports both client-side and server-side data handling.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  totalCount,
  page = 0,
  rowsPerPage = 10,
  onPageChange,
  onRowsPerPageChange,
  onSortChange,
  loading = false,
  emptyMessage = 'ไม่พบข้อมูล',
  rowsPerPageOptions = [5, 10, 25, 50],
  showPagination = true,
}: DataTableProps<T>): JSX.Element {
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: string): void => {
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDirection(newDirection);
    onSortChange?.(field, newDirection);
  };

  const handlePageChange = (_event: unknown, newPage: number): void => {
    onPageChange?.(newPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    onRowsPerPageChange?.(parseInt(event.target.value, 10));
  };

  const effectiveTotal = totalCount ?? rows.length;

  return (
    <Paper variant="outlined" sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small" aria-label="data table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align ?? 'left'}
                  sx={{ minWidth: column.minWidth }}
                >
                  {column.sortable !== false ? (
                    <TableSortLabel
                      active={sortField === column.id}
                      direction={sortField === column.id ? sortDirection : 'asc'}
                      onClick={() => handleSort(column.id)}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    กำลังโหลด...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {emptyMessage}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={getRowKey(row)} hover>
                  {columns.map((column) => (
                    <TableCell key={column.id} align={column.align ?? 'left'}>
                      {column.render
                        ? column.render(row)
                        : column.accessor
                          ? String(row[column.accessor] ?? '')
                          : ''}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      {showPagination && (
        <Box sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <TablePagination
            component="div"
            count={effectiveTotal}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
            onRowsPerPageChange={handleRowsPerPageChange}
            rowsPerPageOptions={rowsPerPageOptions}
            labelRowsPerPage="แถวต่อหน้า:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} จาก ${count !== -1 ? count : `มากกว่า ${to}`}`
            }
          />
        </Box>
      )}
    </Paper>
  );
}
