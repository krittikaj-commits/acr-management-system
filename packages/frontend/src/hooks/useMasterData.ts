import { useState, useEffect } from 'react';
import { api } from '@/services/api';

/**
 * Master data item returned from the API.
 */
export interface MasterDataItem {
  id: string;
  category: string;
  code: string;
  nameEn: string;
  nameTh: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
}

interface ApiResponse<T> {
  data: T;
}

interface UseMasterDataReturn {
  /** Services list for affected service dropdown */
  services: MasterDataItem[];
  /** Whether data is being loaded */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Re-fetch master data */
  refetch: () => void;
}

/**
 * Hook to fetch master data for CR form dropdowns.
 * Fetches service list from /admin/master-data/service endpoint.
 *
 * Change types and impact levels use the shared constants (not from master data),
 * but affected service uses dynamically managed master data.
 */
export function useMasterData(): UseMasterDataReturn {
  const [services, setServices] = useState<MasterDataItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMasterData = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.get<ApiResponse<MasterDataItem[]>>(
        '/admin/master-data/service',
      );
      const items = response.data.data;
      // Only show active items, sorted by sortOrder
      const activeItems = items
        .filter((item) => item.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      setServices(activeItems);
    } catch (err) {
      // If unauthorized or master data not available, provide empty list
      // This allows the form to still function in anonymous mode
      setServices([]);
      const message = err instanceof Error ? err.message : 'Failed to load master data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  return {
    services,
    isLoading,
    error,
    refetch: fetchMasterData,
  };
}
