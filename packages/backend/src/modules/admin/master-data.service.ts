import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { MasterData } from '@prisma/client';
import { RedisService } from '../redis/redis.service';
import { MasterDataRepository } from './master-data.repository';
import { CreateMasterDataDto, UpdateMasterDataDto } from './dto/master-data.dto';

const CACHE_PREFIX = 'master-data';
const CACHE_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class MasterDataService {
  constructor(
    private readonly masterDataRepository: MasterDataRepository,
    private readonly redisService: RedisService,
  ) {}

  /**
   * Get all master data, optionally filtered by category.
   * Results are cached in Redis with a 5-minute TTL.
   */
  async getAll(category?: string): Promise<MasterData[]> {
    const cacheKey = category
      ? `${CACHE_PREFIX}:${category}`
      : `${CACHE_PREFIX}:all`;

    // Try cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as MasterData[];
    }

    // Fetch from database
    const data = await this.masterDataRepository.findAll(category);

    // Store in cache
    await this.redisService.set(cacheKey, JSON.stringify(data), CACHE_TTL_SECONDS);

    return data;
  }

  /**
   * Get a single master data entry by ID.
   */
  async getById(id: string): Promise<MasterData> {
    const record = await this.masterDataRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Master data with ID "${id}" not found`);
    }
    return record;
  }

  /**
   * Create a new master data entry and invalidate cache.
   */
  async create(dto: CreateMasterDataDto): Promise<MasterData> {
    // Check for duplicate category+code
    const existing = await this.masterDataRepository.findByCode(dto.category, dto.code);
    if (existing) {
      throw new ConflictException(
        `Master data with category "${dto.category}" and code "${dto.code}" already exists`,
      );
    }

    const record = await this.masterDataRepository.create(dto);
    await this.invalidateCache(dto.category);
    return record;
  }

  /**
   * Update a master data entry and invalidate cache.
   */
  async update(id: string, dto: UpdateMasterDataDto): Promise<MasterData> {
    const existing = await this.masterDataRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Master data with ID "${id}" not found`);
    }

    // If category+code is changing, check for conflict
    const newCategory = dto.category ?? existing.category;
    const newCode = dto.code ?? existing.code;
    if (newCategory !== existing.category || newCode !== existing.code) {
      const conflict = await this.masterDataRepository.findByCode(newCategory, newCode);
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Master data with category "${newCategory}" and code "${newCode}" already exists`,
        );
      }
    }

    const record = await this.masterDataRepository.update(id, dto);
    // Invalidate cache for both old and new category if changed
    await this.invalidateCache(existing.category);
    if (dto.category && dto.category !== existing.category) {
      await this.invalidateCache(dto.category);
    }
    return record;
  }

  /**
   * Soft-disable a master data entry (set isActive=false).
   * Existing references remain valid — the record is not deleted.
   */
  async disable(id: string): Promise<MasterData> {
    const existing = await this.masterDataRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Master data with ID "${id}" not found`);
    }

    const record = await this.masterDataRepository.disable(id);
    await this.invalidateCache(existing.category);
    return record;
  }

  /**
   * Re-enable a previously disabled master data entry.
   */
  async enable(id: string): Promise<MasterData> {
    const existing = await this.masterDataRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Master data with ID "${id}" not found`);
    }

    const record = await this.masterDataRepository.enable(id);
    await this.invalidateCache(existing.category);
    return record;
  }

  /**
   * Invalidate Redis cache keys for master data.
   * Deletes the category-specific key and the "all" key.
   */
  async invalidateCache(category?: string): Promise<void> {
    // Always invalidate the "all" key
    await this.redisService.del(`${CACHE_PREFIX}:all`);

    // If a specific category is provided, also invalidate that key
    if (category) {
      await this.redisService.del(`${CACHE_PREFIX}:${category}`);
    }
  }
}
