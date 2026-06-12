import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MasterData } from '@prisma/client';
import { CreateMasterDataDto, UpdateMasterDataDto } from './dto/master-data.dto';

@Injectable()
export class MasterDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all master data, optionally filtered by category.
   */
  async findAll(category?: string): Promise<MasterData[]> {
    const where = category ? { category } : {};
    return this.prisma.masterData.findMany({
      where,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { nameEn: 'asc' }],
    });
  }

  /**
   * Get a single master data record by ID.
   */
  async findById(id: string): Promise<MasterData | null> {
    return this.prisma.masterData.findUnique({ where: { id } });
  }

  /**
   * Get a master data record by category and code (unique constraint).
   */
  async findByCode(category: string, code: string): Promise<MasterData | null> {
    return this.prisma.masterData.findUnique({
      where: { category_code: { category, code } },
    });
  }

  /**
   * Create a new master data entry.
   */
  async create(data: CreateMasterDataDto): Promise<MasterData> {
    return this.prisma.masterData.create({ data });
  }

  /**
   * Update a master data entry.
   */
  async update(id: string, data: UpdateMasterDataDto): Promise<MasterData> {
    return this.prisma.masterData.update({ where: { id }, data });
  }

  /**
   * Soft-disable: set isActive=false (existing references are preserved).
   */
  async disable(id: string): Promise<MasterData> {
    return this.prisma.masterData.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Re-enable: set isActive=true.
   */
  async enable(id: string): Promise<MasterData> {
    return this.prisma.masterData.update({
      where: { id },
      data: { isActive: true },
    });
  }
}
