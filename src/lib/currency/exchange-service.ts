/**
 * Currency Exchange Service
 * Provides live exchange rates with server-side caching and offline fallback.
 * Base currency: USD
 */

export interface CurrencyMetadata {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  region: "GCC" | "Major" | "Asia" | "Other";
}

export const SUPPORTED_CURRENCIES: CurrencyMetadata[] = [
  // GCC Currencies
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", region: "GCC" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", flag: "🇸🇦", region: "GCC" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", flag: "🇶🇦", region: "GCC" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", flag: "🇰🇼", region: "GCC" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD", flag: "🇧🇭", region: "GCC" },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", flag: "🇴🇲", region: "GCC" },

  // Major Currencies
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", region: "Major" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", region: "Major" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", region: "Major" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", region: "Major" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", flag: "🇨🇦", region: "Major" },
  { code: "AUD", name: "Australian Dollar", symbol: "AU$", flag: "🇦🇺", region: "Major" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", region: "Major" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭", region: "Major" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", region: "Major" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", flag: "🇨🇳", region: "Major" },

  // Regional Neighbors
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", flag: "🇵🇰", region: "Asia" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", flag: "🇧🇩", region: "Asia" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", flag: "🇵🇭", region: "Asia" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", flag: "🇲🇾", region: "Asia" },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭", region: "Asia" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", flag: "🇮🇩", region: "Asia" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", flag: "🇹🇷", region: "Other" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", region: "Other" },
];

// Fallback rates relative to 1 USD in case external network fails
const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  AED: 3.6725,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.3075,
  BHD: 0.376,
  OMR: 0.3845,
  EUR: 0.92,
  GBP: 0.78,
  INR: 83.5,
  CAD: 1.37,
  AUD: 1.51,
  JPY: 154.2,
  CHF: 0.89,
  SGD: 1.34,
  CNY: 7.23,
  PKR: 278.5,
  BDT: 117.2,
  PHP: 58.4,
  MYR: 4.71,
  THB: 36.6,
  IDR: 16250.0,
  TRY: 32.8,
  ZAR: 18.2,
};

// In-memory cache for fast lookups
interface CacheEntry {
  rates: Record<string, number>;
  lastUpdated: string;
  timestamp: number;
}

let ratesCache: CacheEntry | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getExchangeRates(): Promise<{
  rates: Record<string, number>;
  lastUpdated: string;
  source: "live" | "cache" | "fallback";
}> {
  const now = Date.now();

  // Return cached rates if fresh
  if (ratesCache && now - ratesCache.timestamp < CACHE_TTL_MS) {
    return {
      rates: ratesCache.rates,
      lastUpdated: ratesCache.lastUpdated,
      source: "cache",
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && typeof data.rates === "object") {
        const rates: Record<string, number> = {};
        for (const curr of SUPPORTED_CURRENCIES) {
          rates[curr.code] = data.rates[curr.code] || FALLBACK_RATES[curr.code] || 1;
        }

        ratesCache = {
          rates,
          lastUpdated: data.time_last_update_utc || new Date().toUTCString(),
          timestamp: now,
        };

        return {
          rates,
          lastUpdated: ratesCache.lastUpdated,
          source: "live",
        };
      }
    }
  } catch (err) {
    console.warn("External exchange rate API fetch failed, using fallback/cached rates:", err);
  }

  if (ratesCache) {
    return {
      rates: ratesCache.rates,
      lastUpdated: ratesCache.lastUpdated,
      source: "cache",
    };
  }

  return {
    rates: FALLBACK_RATES,
    lastUpdated: new Date().toUTCString(),
    source: "fallback",
  };
}

export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>
): { result: number; rate: number } {
  if (isNaN(amount) || amount < 0) return { result: 0, rate: 0 };
  const fromRate = rates[from] || 1;
  const toRate = rates[to] || 1;

  // Direct formula: (amount / fromRate) * toRate
  const rate = toRate / fromRate;
  const result = amount * rate;

  return { result, rate };
}
