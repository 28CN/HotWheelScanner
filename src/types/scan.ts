export interface ScannedCar {
  id: string;
  name: string;
  series: string;
  batchYear: number | string;
  isTreasureHunt: boolean;
  isHotModel: boolean;
  isOnWishlist: boolean;
  estimatedPriceUSD: number;
  recommendation: string;
}

export interface ScanSession {
  id: string;
  timestamp: number;
  mode: ScanMode;
  imagePreview?: string;
  cars: ScannedCar[];
}

export type ScanMode = "quick" | "deep";
export type FilterType = "all" | "price" | "hot" | "recent";
