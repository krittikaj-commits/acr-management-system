/**
 * Mock data for demo mode.
 * Used as fallback when backend API is unavailable.
 */

import type { IUser } from '@/types/auth';

// ─── Demo Mode Flag ─────────────────────────────────────────────────────────

export const DEMO_MODE = true;

// ─── Mock User ──────────────────────────────────────────────────────────────

export const MOCK_USER: IUser = {
  id: 'demo-user',
  email: 'admin@dits.co.th',
  firstName: 'Admin',
  lastName: 'Demo',
  role: 'admin',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

export const MOCK_ACCESS_TOKEN = 'demo-access-token-xyz';
export const MOCK_REFRESH_TOKEN = 'demo-refresh-token-xyz';

// ─── Mock Dashboard Data ────────────────────────────────────────────────────

function generateMonthlyData() {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return months.map((month) => ({
    month,
    count: Math.floor(Math.random() * 16) + 10, // 10-25
  }));
}

export const MOCK_DASHBOARD = {
  stats: { totalCRs: 156, openCRs: 42, closedCRs: 114, avgDaysToClose: 5.3 },
  crByMonth: generateMonthlyData(),
  crByImpact: [
    { impactLevel: 'Major', count: 12 },
    { impactLevel: 'High', count: 35 },
    { impactLevel: 'Medium', count: 67 },
    { impactLevel: 'Low', count: 30 },
    { impactLevel: 'Very Low', count: 12 },
  ],
  crByChangeType: [
    { changeType: 'Application', count: 45 },
    { changeType: 'Network', count: 28 },
    { changeType: 'Server', count: 22 },
    { changeType: 'Hardware', count: 18 },
    { changeType: 'Other', count: 43 },
  ],
  crByStatus: [
    { status: 'Draft', count: 5 },
    { status: 'Submitted', count: 8 },
    { status: 'IT Review', count: 12 },
    { status: 'Approval', count: 7 },
    { status: 'Implementation', count: 5 },
    { status: 'Verification', count: 3 },
    { status: 'Closed', count: 114 },
  ],
};

// ─── Mock CR List ───────────────────────────────────────────────────────────

export const MOCK_CR_LIST = {
  data: [
    {
      id: 'cr-001',
      crNumber: 'CR-2026-0001',
      title: 'Upgrade ERP Application to v4.2',
      description: 'Upgrade ERP system to latest version with security patches',
      status: 'Closed',
      impactLevel: 'High',
      changeType: 'Application',
      requesterName: 'สมชาย วงศ์สวัสดิ์',
      affectedService: 'ERP System',
      createdAt: '2026-01-10T08:00:00.000Z',
      updatedAt: '2026-01-15T16:00:00.000Z',
    },
    {
      id: 'cr-002',
      crNumber: 'CR-2026-0002',
      title: 'Add Firewall Rule for New Partner VPN',
      description: 'Configure firewall rules to allow VPN traffic from partner network',
      status: 'Implementation',
      impactLevel: 'Medium',
      changeType: 'Network',
      requesterName: 'วิชัย สุขสำราญ',
      affectedService: 'Network Infrastructure',
      createdAt: '2026-01-12T09:30:00.000Z',
      updatedAt: '2026-01-18T10:00:00.000Z',
    },
    {
      id: 'cr-003',
      crNumber: 'CR-2026-0003',
      title: 'Replace Production Database Server RAM',
      description: 'Upgrade RAM from 64GB to 128GB on production DB server',
      status: 'Approval',
      impactLevel: 'Major',
      changeType: 'Hardware',
      requesterName: 'ปรีชา ธนาเจริญ',
      affectedService: 'Database Server',
      createdAt: '2026-01-15T07:45:00.000Z',
      updatedAt: '2026-01-20T14:00:00.000Z',
    },
    {
      id: 'cr-004',
      crNumber: 'CR-2026-0004',
      title: 'Deploy New HR Module',
      description: 'Deploy new HR self-service module for employee leave management',
      status: 'IT Review',
      impactLevel: 'Medium',
      changeType: 'Application',
      requesterName: 'สุดา มีสุข',
      affectedService: 'HR System',
      createdAt: '2026-01-18T11:00:00.000Z',
      updatedAt: '2026-01-22T09:30:00.000Z',
    },
    {
      id: 'cr-005',
      crNumber: 'CR-2026-0005',
      title: 'Migrate File Server to New Hardware',
      description: 'Migrate corporate file server to new Dell PowerEdge R750',
      status: 'Submitted',
      impactLevel: 'High',
      changeType: 'Server',
      requesterName: 'อนันต์ ศรีสมบูรณ์',
      affectedService: 'File Storage',
      createdAt: '2026-01-20T13:15:00.000Z',
      updatedAt: '2026-01-20T13:15:00.000Z',
    },
    {
      id: 'cr-006',
      crNumber: 'CR-2026-0006',
      title: 'Update SSL Certificates for Web Apps',
      description: 'Renew and deploy new SSL certificates before expiry',
      status: 'Closed',
      impactLevel: 'Low',
      changeType: 'Application',
      requesterName: 'กมล อรุณรุ่ง',
      affectedService: 'Web Applications',
      createdAt: '2026-01-05T10:00:00.000Z',
      updatedAt: '2026-01-08T11:30:00.000Z',
    },
    {
      id: 'cr-007',
      crNumber: 'CR-2026-0007',
      title: 'Configure New Wi-Fi Access Points',
      description: 'Install and configure 10 new access points in Building B',
      status: 'Verification',
      impactLevel: 'Low',
      changeType: 'Network',
      requesterName: 'ธนพล เกษมสุข',
      affectedService: 'Office Network',
      createdAt: '2026-01-22T08:00:00.000Z',
      updatedAt: '2026-01-25T14:00:00.000Z',
    },
    {
      id: 'cr-008',
      crNumber: 'CR-2026-0008',
      title: 'Emergency: Fix Critical Auth Bug',
      description: 'Critical authentication bypass vulnerability discovered — emergency fix required',
      status: 'Closed',
      impactLevel: 'Major',
      changeType: 'Application',
      requesterName: 'Admin Demo',
      affectedService: 'Authentication Service',
      createdAt: '2026-01-25T03:00:00.000Z',
      updatedAt: '2026-01-25T06:30:00.000Z',
    },
    {
      id: 'cr-009',
      crNumber: 'CR-2026-0009',
      title: 'Setup VPN for Remote Office',
      description: 'Configure site-to-site VPN between HQ and new Chiang Mai office',
      status: 'Draft',
      impactLevel: 'Medium',
      changeType: 'Network',
      requesterName: 'พิชัย รุ่งเรือง',
      affectedService: 'VPN Infrastructure',
      createdAt: '2026-01-26T09:00:00.000Z',
      updatedAt: '2026-01-26T09:00:00.000Z',
    },
    {
      id: 'cr-010',
      crNumber: 'CR-2026-0010',
      title: 'Upgrade Windows Server OS',
      description: 'Upgrade 5 Windows Server 2019 instances to Windows Server 2022',
      status: 'IT Review',
      impactLevel: 'High',
      changeType: 'Server',
      requesterName: 'เอกชัย บุญเลิศ',
      affectedService: 'Server Infrastructure',
      createdAt: '2026-01-27T07:30:00.000Z',
      updatedAt: '2026-01-28T10:00:00.000Z',
    },
  ],
  meta: {
    total: 10,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
};

// ─── Mock Approval Queue ────────────────────────────────────────────────────

export const MOCK_APPROVALS = {
  data: [
    {
      id: 'appr-001',
      crNumber: 'CR-2026-0003',
      requesterName: 'ปรีชา ธนาเจริญ',
      affectedService: 'Database Server',
      impactLevel: 'Major',
      changeType: 'Hardware',
      description: 'Upgrade RAM from 64GB to 128GB on production DB server',
      justification: 'Current RAM usage is at 92% causing performance degradation during peak hours',
      submittedAt: '2026-01-15T07:45:00.000Z',
      currentStep: 'IT Approval',
    },
    {
      id: 'appr-002',
      crNumber: 'CR-2026-0005',
      requesterName: 'อนันต์ ศรีสมบูรณ์',
      affectedService: 'File Storage',
      impactLevel: 'High',
      changeType: 'Server',
      description: 'Migrate corporate file server to new Dell PowerEdge R750',
      justification: 'Current server is end-of-life and no longer under warranty',
      submittedAt: '2026-01-20T13:15:00.000Z',
      currentStep: 'Manager Approval',
    },
    {
      id: 'appr-003',
      crNumber: 'CR-2026-0010',
      requesterName: 'เอกชัย บุญเลิศ',
      affectedService: 'Server Infrastructure',
      impactLevel: 'High',
      changeType: 'Server',
      description: 'Upgrade 5 Windows Server 2019 instances to Windows Server 2022',
      justification: 'Windows Server 2019 extended support ending soon; security compliance requirement',
      submittedAt: '2026-01-27T07:30:00.000Z',
      currentStep: 'IT Approval',
    },
  ],
  meta: {
    total: 3,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
};

// ─── Mock Notifications ─────────────────────────────────────────────────────

export const MOCK_UNREAD_COUNT = 3;

export const MOCK_NOTIFICATIONS = {
  data: [
    {
      id: 'notif-001',
      title: 'CR-2026-0003 needs your approval',
      message: 'A new change request for Database Server RAM upgrade requires your approval.',
      type: 'approval_required',
      entityType: 'change_request',
      entityId: 'cr-003',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
    },
    {
      id: 'notif-002',
      title: 'CR-2026-0008 has been closed',
      message: 'Emergency fix for authentication bug has been completed and verified.',
      type: 'status_change',
      entityType: 'change_request',
      entityId: 'cr-008',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    {
      id: 'notif-003',
      title: 'CR-2026-0005 submitted for review',
      message: 'File server migration request has been submitted and is pending IT review.',
      type: 'status_change',
      entityType: 'change_request',
      entityId: 'cr-005',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    },
    {
      id: 'notif-004',
      title: 'CR-2026-0006 implementation completed',
      message: 'SSL certificate renewal has been deployed successfully.',
      type: 'status_change',
      entityType: 'change_request',
      entityId: 'cr-006',
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    },
    {
      id: 'notif-005',
      title: 'Weekly CR Summary Report',
      message: 'Your weekly summary: 3 new CRs, 2 closed, 1 pending approval.',
      type: 'system',
      entityType: null,
      entityId: null,
      isRead: true,
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    },
  ],
  meta: {
    total: 5,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  },
};

// ─── Mock API Response Map ──────────────────────────────────────────────────

/**
 * Returns mock data based on URL path matching.
 * Used by the axios interceptor to provide fallback data when backend is unavailable.
 */
export function getMockResponse(url: string | undefined, method: string | undefined): unknown | null {
  if (!url) return null;

  const normalizedUrl = url.replace(/^\/api\/v1/, '');

  // Auth endpoints
  if (normalizedUrl.includes('/auth/login') && method === 'post') {
    return {
      data: {
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
        user: MOCK_USER,
      },
    };
  }

  if (normalizedUrl.includes('/auth/me')) {
    return { data: MOCK_USER };
  }

  if (normalizedUrl.includes('/auth/refresh')) {
    return {
      data: {
        accessToken: MOCK_ACCESS_TOKEN,
        refreshToken: MOCK_REFRESH_TOKEN,
      },
    };
  }

  // Dashboard
  if (normalizedUrl.includes('/reports/dashboard')) {
    return { data: MOCK_DASHBOARD };
  }

  // Change requests list
  if (normalizedUrl.match(/\/change-requests\/?$/) || normalizedUrl.match(/\/change-requests\?/)) {
    return { data: MOCK_CR_LIST };
  }

  // Single change request detail
  if (normalizedUrl.match(/\/change-requests\/[^/]+$/)) {
    const crId = normalizedUrl.split('/').pop();
    const cr = MOCK_CR_LIST.data.find((c) => c.id === crId || c.crNumber === crId);
    return { data: cr ?? MOCK_CR_LIST.data[0] };
  }

  // Approvals
  if (normalizedUrl.includes('/approvals/pending')) {
    return { data: MOCK_APPROVALS };
  }

  // Notifications
  if (normalizedUrl.includes('/notifications/unread-count')) {
    return { data: { count: MOCK_UNREAD_COUNT } };
  }

  if (normalizedUrl.match(/\/notifications\/?$/) || normalizedUrl.match(/\/notifications\?/)) {
    return { data: MOCK_NOTIFICATIONS };
  }

  // Mark as read / mark all - just return success
  if (normalizedUrl.includes('/notifications/') && (method === 'patch' || method === 'put')) {
    return { data: { success: true } };
  }

  if (normalizedUrl.includes('/notifications/read-all')) {
    return { data: { success: true } };
  }

  // Approve/reject
  if (normalizedUrl.includes('/approve') || normalizedUrl.includes('/reject')) {
    return { data: { success: true } };
  }

  // Workflow validate
  if (normalizedUrl.includes('/validate') && method === 'post') {
    return { data: { isValid: true, errors: [], warnings: ['Consider adding a rollback step for high-impact changes'] } };
  }

  // Export endpoints — return empty blob-like response
  if (normalizedUrl.includes('/export/')) {
    return { data: new Blob(['Demo export - no real data'], { type: 'text/plain' }) };
  }

  // Audit logs
  if (normalizedUrl.includes('/audit-logs')) {
    return {
      data: {
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 },
      },
    };
  }

  // Workflow definitions
  if (normalizedUrl.includes('/admin/workflows')) {
    return {
      data: [
        {
          id: 'wf-001',
          name: 'Normal Change Workflow',
          version: 1,
          isActive: true,
          description: 'Standard workflow for normal change requests',
          steps: [
            { id: 'step-1', name: 'Submission', stepType: 'submission', assignedRole: 'requester', requiredFields: ['title', 'description', 'changeType'], sortOrder: 1, conditions: [] },
            { id: 'step-2', name: 'IT Review', stepType: 'review', assignedRole: 'it_reviewer', requiredFields: ['impactAnalysis', 'riskAssessment'], sortOrder: 2, conditions: [] },
            { id: 'step-3', name: 'Approval', stepType: 'approval', assignedRole: 'approver', requiredFields: [], sortOrder: 3, conditions: [] },
            { id: 'step-4', name: 'Implementation', stepType: 'implementation', assignedRole: 'implementer', requiredFields: ['implementationNotes'], sortOrder: 4, conditions: [] },
            { id: 'step-5', name: 'Verification', stepType: 'verification', assignedRole: 'it_reviewer', requiredFields: ['verificationResult'], sortOrder: 5, conditions: [] },
            { id: 'step-6', name: 'Closure', stepType: 'closure', assignedRole: 'admin', requiredFields: [], sortOrder: 6, conditions: [] },
          ],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
        },
        {
          id: 'wf-002',
          name: 'Emergency Change Workflow',
          version: 1,
          isActive: true,
          description: 'Expedited workflow for emergency changes (post-approval)',
          steps: [
            { id: 'step-e1', name: 'Emergency Submission', stepType: 'submission', assignedRole: 'requester', requiredFields: ['title', 'description', 'justification'], sortOrder: 1, conditions: [] },
            { id: 'step-e2', name: 'Implementation', stepType: 'implementation', assignedRole: 'implementer', requiredFields: ['implementationNotes'], sortOrder: 2, conditions: [] },
            { id: 'step-e3', name: 'Post-Approval', stepType: 'approval', assignedRole: 'approver', requiredFields: [], sortOrder: 3, conditions: [] },
            { id: 'step-e4', name: 'Closure', stepType: 'closure', assignedRole: 'admin', requiredFields: [], sortOrder: 4, conditions: [] },
          ],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-06-01T00:00:00.000Z',
        },
      ],
    };
  }

  // Master data
  if (normalizedUrl.includes('/admin/master-data')) {
    return {
      data: {
        data: [
          { id: 'md-1', code: 'application', nameEn: 'Application', nameTh: 'แอปพลิเคชัน', description: 'Application changes', isActive: true, sortOrder: 1, createdAt: '2024-01-01T00:00:00.000Z' },
          { id: 'md-2', code: 'network', nameEn: 'Network', nameTh: 'เครือข่าย', description: 'Network infrastructure changes', isActive: true, sortOrder: 2, createdAt: '2024-01-01T00:00:00.000Z' },
          { id: 'md-3', code: 'server', nameEn: 'Server', nameTh: 'เซิร์ฟเวอร์', description: 'Server changes', isActive: true, sortOrder: 3, createdAt: '2024-01-01T00:00:00.000Z' },
          { id: 'md-4', code: 'hardware', nameEn: 'Hardware', nameTh: 'ฮาร์ดแวร์', description: 'Hardware changes', isActive: true, sortOrder: 4, createdAt: '2024-01-01T00:00:00.000Z' },
          { id: 'md-5', code: 'firewall', nameEn: 'Firewall', nameTh: 'ไฟร์วอลล์', description: 'Firewall rule changes', isActive: true, sortOrder: 5, createdAt: '2024-01-01T00:00:00.000Z' },
        ],
        meta: { total: 5 },
      },
    };
  }

  // Users admin
  if (normalizedUrl.includes('/users')) {
    return {
      data: {
        data: [
          MOCK_USER,
          { id: 'user-2', email: 'reviewer@dits.co.th', firstName: 'สมชาย', lastName: 'วงศ์สวัสดิ์', role: 'it_reviewer', isActive: true, createdAt: '2024-02-01T00:00:00.000Z', lastLoginAt: '2026-01-28T08:00:00.000Z' },
          { id: 'user-3', email: 'approver@dits.co.th', firstName: 'วิชัย', lastName: 'สุขสำราญ', role: 'approver', isActive: true, createdAt: '2024-02-01T00:00:00.000Z', lastLoginAt: '2026-01-27T10:00:00.000Z' },
          { id: 'user-4', email: 'implementer@dits.co.th', firstName: 'ปรีชา', lastName: 'ธนาเจริญ', role: 'implementer', isActive: true, createdAt: '2024-03-01T00:00:00.000Z', lastLoginAt: '2026-01-26T14:00:00.000Z' },
          { id: 'user-5', email: 'callcenter@dits.co.th', firstName: 'สุดา', lastName: 'มีสุข', role: 'call_center', isActive: true, createdAt: '2024-03-15T00:00:00.000Z', lastLoginAt: '2026-01-28T09:00:00.000Z' },
          { id: 'user-6', email: 'auditor@dits.co.th', firstName: 'กมล', lastName: 'อรุณรุ่ง', role: 'auditor', isActive: false, createdAt: '2024-04-01T00:00:00.000Z', lastLoginAt: '2026-01-10T11:00:00.000Z' },
        ],
        meta: { total: 6, page: 1, pageSize: 20, totalPages: 1 },
      },
    };
  }

  // Reports
  if (normalizedUrl.includes('/reports')) {
    return { data: MOCK_DASHBOARD };
  }

  // Default: return empty success
  return { data: { data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } } };
}
