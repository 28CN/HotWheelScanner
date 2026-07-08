import type { ScanSession } from "@/types/scan";

const WISHLIST_KEY = "hw-wishlist";
const HISTORY_KEY = "hw-scan-history";

export function getWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function saveWishlist(items: string[]): void {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
}

export function getScanHistory(): ScanSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ScanSession[]) : [];
  } catch {
    return [];
  }
}

export function saveScanSession(session: ScanSession): void {
  const history = getScanHistory();
  history.unshift(session);
  const trimmed = history.slice(0, 50);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function clearScanHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
