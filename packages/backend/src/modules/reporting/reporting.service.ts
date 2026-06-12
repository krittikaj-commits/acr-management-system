import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CrCountByMonth {
  month: string; // 'YYYY-MM'
  count: number;
}

export interface CrCountByStatus {
  status: string;
  count: number;
}

export interface CrCountByImpact {
  impactLevel: string;
  count: number;
}

export interface CrCountByChangeType {
  changeType: string;
  count: number;
}

export interface DashboardStats {
  crCountByMonth: CrCountByMonth[];
  crCountByStatus: CrCountByStatus[];
  crCountByImpact: CrCountByImpact[];
  crCountByChangeType: CrCountByChangeType[];
  averageTimeToClose: number;
  totalCrs: number;
  openCrs: number;
  closedCrs: number;
}

/**
 * ReportingService — provides dashboard statistics and aggregation queries
 * for the ACR Management System reporting module.
 */
@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive dashboard statistics including:
   * - CR count by month (last 12 months)
   * - CR count by status (from workflow step names)
   * - CR count by impact level
   * - CR count by change type
   * - Average time to close (in days)
   * - Total, open, and closed CR counts
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const [
      crCountByMonth,
      crCountByStatus,
      crCountByImpact,
      crCountByChangeType,
      averageTimeToClose,
      totalCrs,
      openCrs,
      closedCrs,
    ] = await Promise.all([
      this.getCrCountByMonth(),
      this.getCrCountByStatus(),
      this.getCrCountByImpact(),
      this.getCrCountByChangeType(),
      this.getAverageTimeToClose(),
      this.getTotalCrs(),
      this.getOpenCrs(),
      this.getClosedCrs(),
    ]);

    return {
      crCountByMonth,
      crCountByStatus,
      crCountByImpact,
      crCountByChangeType,
      averageTimeToClose,
      totalCrs,
      openCrs,
      closedCrs,
    };
  }

  /**
   * Get CR count grouped by month for the last 12 months.
   */
  async getCrCountByMonth(): Promise<CrCountByMonth[]> {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const changeRequests = await this.prisma.changeRequest.findMany({
      where: {
        createdAt: {
          gte: twelveMonthsAgo,
        },
      },
      select: {
        createdAt: true,
      },
    });

    // Group by month manually for cross-DB compatibility
    const monthCounts = new Map<string, number>();

    // Initialize all 12 months with zero counts
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts.set(key, 0);
    }

    // Count CRs per month
    for (const cr of changeRequests) {
      const date = new Date(cr.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthCounts.has(key)) {
        monthCounts.set(key, (monthCounts.get(key) || 0) + 1);
      }
    }

    // Convert to sorted array (oldest first)
    return Array.from(monthCounts.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Get CR count grouped by current workflow step name (status).
   */
  async getCrCountByStatus(): Promise<CrCountByStatus[]> {
    const instances = await this.prisma.workflowInstance.findMany({
      select: {
        currentStep: {
          select: {
            name: true,
          },
        },
      },
    });

    const statusCounts = new Map<string, number>();
    for (const instance of instances) {
      const stepName = instance.currentStep.name;
      statusCounts.set(stepName, (statusCounts.get(stepName) || 0) + 1);
    }

    return Array.from(statusCounts.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get CR count grouped by impact level using Prisma groupBy.
   */
  async getCrCountByImpact(): Promise<CrCountByImpact[]> {
    const results = await this.prisma.changeRequest.groupBy({
      by: ['impactLevel'],
      _count: {
        id: true,
      },
    });

    return results.map((r) => ({
      impactLevel: r.impactLevel,
      count: r._count.id,
    }));
  }

  /**
   * Get CR count grouped by change type using Prisma groupBy.
   */
  async getCrCountByChangeType(): Promise<CrCountByChangeType[]> {
    const results = await this.prisma.changeRequest.groupBy({
      by: ['changeType'],
      _count: {
        id: true,
      },
    });

    return results.map((r) => ({
      changeType: r.changeType,
      count: r._count.id,
    }));
  }

  /**
   * Calculate the average time to close CRs in days.
   * Only considers CRs with completed workflow instances.
   */
  async getAverageTimeToClose(): Promise<number> {
    const completedInstances = await this.prisma.workflowInstance.findMany({
      where: {
        status: 'completed',
        completedAt: {
          not: null,
        },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
    });

    if (completedInstances.length === 0) {
      return 0;
    }

    const totalDays = completedInstances.reduce((sum, instance) => {
      const startedAt = new Date(instance.startedAt).getTime();
      const completedAt = new Date(instance.completedAt!).getTime();
      const diffDays = (completedAt - startedAt) / (1000 * 60 * 60 * 24);
      return sum + diffDays;
    }, 0);

    return Math.round((totalDays / completedInstances.length) * 100) / 100;
  }

  /**
   * Get total count of all CRs.
   */
  async getTotalCrs(): Promise<number> {
    return this.prisma.changeRequest.count();
  }

  /**
   * Get count of open CRs (workflow instances not completed).
   */
  async getOpenCrs(): Promise<number> {
    return this.prisma.workflowInstance.count({
      where: {
        status: {
          not: 'completed',
        },
      },
    });
  }

  /**
   * Get count of closed CRs (workflow instances completed).
   */
  async getClosedCrs(): Promise<number> {
    return this.prisma.workflowInstance.count({
      where: {
        status: 'completed',
      },
    });
  }
}
