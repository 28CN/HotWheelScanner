export interface ScannedCar {
  id: string;
  name: string;
  series: string;
  batchYear: number | string;
  collectorNumber?: string;
  isTreasureHunt: boolean;
  isHotModel: boolean;
  isOnWishlist: boolean;
  estimatedPriceUSD: number;
  priceLowUSD?: number;
  priceHighUSD?: number;
  priceConfidence?: "high" | "medium" | "low";
  recommendation: string;
  story?: string;
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
