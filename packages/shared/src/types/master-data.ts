/** Master Data entity interface */
export interface IMasterData {
  id: string;
  category: string;
  code: string;
  nameEn: string;
  nameTh: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}
