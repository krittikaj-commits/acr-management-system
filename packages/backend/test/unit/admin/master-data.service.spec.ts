import { NotFoundException, ConflictException } from '@nestjs/common';
import { MasterDataService } from '../../../src/modules/admin/master-data.service';
import { MasterDataRepository } from '../../../src/modules/admin/master-data.repository';
import { RedisService } from '../../../src/modules/redis/redis.service';

describe('MasterDataService', () => {
  let masterDataService: MasterDataService;
  let masterDataRepository: jest.Mocked<MasterDataRepository>;
  let redisService: jest.Mocked<RedisService>;

  const mockMasterData = {
    id: 'md-uuid-001',
    category: 'service',
    code: 'app_server',
    nameEn: 'Application Server',
    nameTh: 'เซิร์ฟเวอร์แอปพลิเคชัน',
    description: 'Application server changes',
    isActive: true,
    sortOrder: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockMasterDataList = [
    mockMasterData,
    {
      id: 'md-uuid-002',
      category: 'service',
      code: 'network',
      nameEn: 'Network',
      nameTh: 'เครือข่าย',
      description: 'Network changes',
      isActive: true,
      sortOrder: 2,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
  ];

  beforeEach(() => {
    masterDataRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      disable: jest.fn(),
      enable: jest.fn(),
    } as unknown as jest.Mocked<MasterDataRepository>;

    redisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
      getClient: jest.fn(),
      onModuleDestroy: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    masterDataService = new MasterDataService(masterDataRepository, redisService);
  });

  describe('getAll', () => {
    it('should return data from database and cache on first call', async () => {
      redisService.get.mockResolvedValue(null);
      masterDataRepository.findAll.mockResolvedValue(mockMasterDataList);
      redisService.set.mockResolvedValue(undefined);

      const result = await masterDataService.getAll('service');

      expect(redisService.get).toHaveBeenCalledWith('master-data:service');
      expect(masterDataRepository.findAll).toHaveBeenCalledWith('service');
      expect(redisService.set).toHaveBeenCalledWith(
        'master-data:service',
        JSON.stringify(mockMasterDataList),
        300,
      );
      expect(result).toEqual(mockMasterDataList);
    });

    it('should return cached data on second call without hitting database', async () => {
      redisService.get.mockResolvedValue(JSON.stringify(mockMasterDataList));

      const result = await masterDataService.getAll('service');

      expect(redisService.get).toHaveBeenCalledWith('master-data:service');
      expect(masterDataRepository.findAll).not.toHaveBeenCalled();
      expect(result).toEqual(mockMasterDataList);
    });

    it('should use "all" cache key when no category specified', async () => {
      redisService.get.mockResolvedValue(null);
      masterDataRepository.findAll.mockResolvedValue(mockMasterDataList);
      redisService.set.mockResolvedValue(undefined);

      await masterDataService.getAll();

      expect(redisService.get).toHaveBeenCalledWith('master-data:all');
      expect(masterDataRepository.findAll).toHaveBeenCalledWith(undefined);
      expect(redisService.set).toHaveBeenCalledWith(
        'master-data:all',
        JSON.stringify(mockMasterDataList),
        300,
      );
    });
  });

  describe('create', () => {
    it('should create master data and invalidate Redis cache', async () => {
      const createDto = {
        category: 'service' as const,
        code: 'firewall',
        nameEn: 'Firewall',
        nameTh: 'ไฟร์วอลล์',
        description: 'Firewall changes',
        sortOrder: 3,
      };

      const created = {
        id: 'md-uuid-003',
        ...createDto,
        isActive: true,
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15'),
      };

      masterDataRepository.findByCode.mockResolvedValue(null);
      masterDataRepository.create.mockResolvedValue(created);
      redisService.del.mockResolvedValue(1);

      const result = await masterDataService.create(createDto);

      expect(masterDataRepository.findByCode).toHaveBeenCalledWith('service', 'firewall');
      expect(masterDataRepository.create).toHaveBeenCalledWith(createDto);
      // Verify cache invalidation
      expect(redisService.del).toHaveBeenCalledWith('master-data:all');
      expect(redisService.del).toHaveBeenCalledWith('master-data:service');
      expect(result).toEqual(created);
    });

    it('should throw ConflictException when category+code already exists', async () => {
      const createDto = {
        category: 'service' as const,
        code: 'app_server',
        nameEn: 'Duplicate',
        nameTh: 'ซ้ำ',
      };

      masterDataRepository.findByCode.mockResolvedValue(mockMasterData);

      await expect(masterDataService.create(createDto)).rejects.toThrow(ConflictException);
      expect(masterDataRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should update master data and invalidate Redis cache', async () => {
      const updateDto = {
        nameEn: 'Updated Application Server',
        nameTh: 'เซิร์ฟเวอร์แอปพลิเคชันที่อัพเดต',
      };

      const updated = {
        ...mockMasterData,
        nameEn: updateDto.nameEn,
        nameTh: updateDto.nameTh,
        updatedAt: new Date('2024-02-01'),
      };

      masterDataRepository.findById.mockResolvedValue(mockMasterData);
      masterDataRepository.update.mockResolvedValue(updated);
      redisService.del.mockResolvedValue(1);

      const result = await masterDataService.update('md-uuid-001', updateDto);

      expect(masterDataRepository.findById).toHaveBeenCalledWith('md-uuid-001');
      expect(masterDataRepository.update).toHaveBeenCalledWith('md-uuid-001', updateDto);
      // Verify cache invalidation
      expect(redisService.del).toHaveBeenCalledWith('master-data:all');
      expect(redisService.del).toHaveBeenCalledWith('master-data:service');
      expect(result.nameEn).toBe('Updated Application Server');
    });

    it('should throw NotFoundException when ID does not exist', async () => {
      masterDataRepository.findById.mockResolvedValue(null);

      await expect(
        masterDataService.update('nonexistent-id', { nameEn: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when changing to an existing category+code', async () => {
      const updateDto = { code: 'network' };

      const conflictRecord = {
        ...mockMasterData,
        id: 'md-uuid-002',
        code: 'network',
      };

      masterDataRepository.findById.mockResolvedValue(mockMasterData);
      masterDataRepository.findByCode.mockResolvedValue(conflictRecord);

      await expect(
        masterDataService.update('md-uuid-001', updateDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('disable', () => {
    it('should set isActive=false and invalidate cache (preserves record for existing references)', async () => {
      const disabled = {
        ...mockMasterData,
        isActive: false,
        updatedAt: new Date('2024-02-01'),
      };

      masterDataRepository.findById.mockResolvedValue(mockMasterData);
      masterDataRepository.disable.mockResolvedValue(disabled);
      redisService.del.mockResolvedValue(1);

      const result = await masterDataService.disable('md-uuid-001');

      expect(masterDataRepository.findById).toHaveBeenCalledWith('md-uuid-001');
      expect(masterDataRepository.disable).toHaveBeenCalledWith('md-uuid-001');
      // Record still exists — only isActive is changed
      expect(result.isActive).toBe(false);
      expect(result.id).toBe('md-uuid-001');
      expect(result.code).toBe('app_server');
      // Cache invalidated
      expect(redisService.del).toHaveBeenCalledWith('master-data:all');
      expect(redisService.del).toHaveBeenCalledWith('master-data:service');
    });

    it('should throw NotFoundException when ID does not exist', async () => {
      masterDataRepository.findById.mockResolvedValue(null);

      await expect(masterDataService.disable('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('enable', () => {
    it('should set isActive=true and invalidate cache', async () => {
      const disabledRecord = { ...mockMasterData, isActive: false };
      const enabled = {
        ...mockMasterData,
        isActive: true,
        updatedAt: new Date('2024-02-01'),
      };

      masterDataRepository.findById.mockResolvedValue(disabledRecord);
      masterDataRepository.enable.mockResolvedValue(enabled);
      redisService.del.mockResolvedValue(1);

      const result = await masterDataService.enable('md-uuid-001');

      expect(masterDataRepository.findById).toHaveBeenCalledWith('md-uuid-001');
      expect(masterDataRepository.enable).toHaveBeenCalledWith('md-uuid-001');
      expect(result.isActive).toBe(true);
      // Cache invalidated
      expect(redisService.del).toHaveBeenCalledWith('master-data:all');
      expect(redisService.del).toHaveBeenCalledWith('master-data:service');
    });

    it('should throw NotFoundException when ID does not exist', async () => {
      masterDataRepository.findById.mockResolvedValue(null);

      await expect(masterDataService.enable('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getById', () => {
    it('should return the master data record', async () => {
      masterDataRepository.findById.mockResolvedValue(mockMasterData);

      const result = await masterDataService.getById('md-uuid-001');

      expect(masterDataRepository.findById).toHaveBeenCalledWith('md-uuid-001');
      expect(result).toEqual(mockMasterData);
    });

    it('should throw NotFoundException when ID does not exist', async () => {
      masterDataRepository.findById.mockResolvedValue(null);

      await expect(masterDataService.getById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('invalidateCache', () => {
    it('should delete both "all" and category-specific keys', async () => {
      redisService.del.mockResolvedValue(1);

      await masterDataService.invalidateCache('impact_level');

      expect(redisService.del).toHaveBeenCalledWith('master-data:all');
      expect(redisService.del).toHaveBeenCalledWith('master-data:impact_level');
    });

    it('should delete only "all" key when no category specified', async () => {
      redisService.del.mockResolvedValue(1);

      await masterDataService.invalidateCache();

      expect(redisService.del).toHaveBeenCalledWith('master-data:all');
      expect(redisService.del).toHaveBeenCalledTimes(1);
    });
  });
});
