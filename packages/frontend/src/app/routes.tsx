import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PublicLayout } from '@/components/layout/PublicLayout';

/**
 * Application routes configuration.
 *
 * Public routes: accessible without login (CR form, tracking, approval link)
 * Protected routes: require authentication (dashboard, admin, etc.)
 */
export const router = createBrowserRouter([
  // Public routes (no auth required)
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <Navigate to="/login" replace /> },
      {
        path: 'login',
        lazy: () => import('@/features/auth/pages/LoginPage'),
      },
      {
        path: 'forgot-password',
        lazy: () => import('@/features/auth/pages/ForgotPasswordPage'),
      },
      {
        path: 'reset-password',
        lazy: () => import('@/features/auth/pages/ResetPasswordPage'),
      },
      {
        path: 'change-request/new',
        lazy: () => import('@/features/change-request/pages/CreateCRPage'),
      },
      {
        path: 'tracking/:token',
        lazy: () => import('@/features/change-request/pages/TrackingPage'),
      },
      {
        path: 'approval/:token',
        lazy: () => import('@/features/approval/pages/ApprovalLinkPage'),
      },
    ],
  },
  // Protected routes (require login)
  {
    path: '/app',
    element: <MainLayout />,
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      {
        path: 'dashboard',
        lazy: () => import('@/features/reporting/pages/DashboardPage'),
      },
      {
        path: 'change-requests',
        lazy: () => import('@/features/change-request/pages/CRListPage'),
      },
      {
        path: 'change-requests/:id',
        lazy: () => import('@/features/change-request/pages/CRDetailPage'),
      },
      {
        path: 'change-requests/:id/edit',
        lazy: () => import('@/features/change-request/pages/EditCRPage'),
      },
      {
        path: 'approvals',
        lazy: () => import('@/features/approval/pages/ApprovalQueuePage'),
      },
      {
        path: 'notifications',
        lazy: () => import('@/features/notification/pages/NotificationPage'),
      },
      {
        path: 'audit-logs',
        lazy: () => import('@/features/audit/pages/AuditLogPage'),
      },
      {
        path: 'admin/users',
        lazy: () => import('@/features/admin/pages/UserManagementPage'),
      },
      {
        path: 'admin/master-data',
        lazy: () => import('@/features/admin/pages/MasterDataPage'),
      },
      {
        path: 'admin/workflow',
        lazy: () => import('@/features/workflow/pages/WorkflowConfigPage'),
      },
      {
        path: 'reports',
        lazy: () => import('@/features/reporting/pages/ReportsPage'),
      },
    ],
  },
]);
