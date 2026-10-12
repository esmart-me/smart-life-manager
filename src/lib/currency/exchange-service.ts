/**
 * Currency Exchange Service
 * Provides live exchange rates with multi-provider failover, in-memory caching,
 * force-refresh bypass, and truthful offline/fallback status.
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
  // GCC Currencies (Primary priority)
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", flag: "🇦🇪", region: "GCC" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", flag: "🇸🇦", region: "GCC" },
  { code: "QAR", name: "Qatari Riyal", symbol: "﷼", flag: "🇶🇦", region: "GCC" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "د.ك", flag: "🇰🇼", region: "GCC" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD", flag: "🇧🇭", region: "GCC" },
  { code: "OMR", name: "Omani Rial", symbol: "﷼", flag: "🇴🇲", region: "GCC" },

  // Major Global Currencies
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

  // Regional & High Volume
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", flag: "🇵🇰", region: "Asia" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", flag: "🇧🇩", region: "Asia" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", flag: "🇵🇭", region: "Asia" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", flag: "🇲🇾", region: "Asia" },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭", region: "Asia" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", flag: "🇮🇩", region: "Asia" },
  { code: "TRY", name: "Turkish Lira", symbol: "₺", flag: "🇹🇷", region: "Other" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", region: "Other" },
];

// Offline benchmark rates (Clearly labeled as benchmark fallback, never presented as live)
export const FALLBACK_BENCHMARK_DATE = "October 2024 (Static Benchmark)";
export const FALLBACK_RATES: Record<string, number> = {
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

interface CacheEntry {
  rates: Record<string, number>;
  lastUpdated: string;
  provider: string;
  timestamp: number;
}

let ratesCache: CacheEntry | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15-minute standard cache

export interface ExchangeRatesResult {
  rates: Record<string, number>;
  lastUpdated: string;
  source: "live" | "cache" | "fallback";
  provider: string;
  timestamp: number;
  isStaleFallback?: boolean;
}

/**
 * Fetches exchange rates from primary provider (ExchangeRate-API open endpoint).
 */
async function fetchFromPrimaryProvider(): Promise<{ rates: Record<string, number>; provider: string; lastUpdated: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && typeof data.rates === "object") {
        const rates: Record<string, number> = {};
        for (const curr of SUPPORTED_CURRENCIES) {
          rates[curr.code] = data.rates[curr.code] || FALLBACK_RATES[curr.code] || 1;
        }
        return {
          rates,
          provider: "Open Exchange Rates (Live)",
          lastUpdated: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[ExchangeService] Primary exchange rate API failed:", err instanceof Error ? err.message : err);
  }
  return null;
}

/**
 * Fetches exchange rates from secondary provider (Currency-API pages.dev endpoint).
 * Provides GCC + International rates with daily updates.
 */
async function fetchFromSecondaryProvider(): Promise<{ rates: Record<string, number>; provider: string; lastUpdated: string } | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch("https://latest.currency-api.pages.dev/v1/currencies/usd.json", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.usd && typeof data.usd === "object") {
        const rates: Record<string, number> = {};
        for (const curr of SUPPORTED_CURRENCIES) {
          const lower = curr.code.toLowerCase();
          rates[curr.code] = typeof data.usd[lower] === "number" ? data.usd[lower] : FALLBACK_RATES[curr.code] || 1;
        }
        return {
          rates,
          provider: "Currency-API (Live CDN)",
          lastUpdated: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn("[ExchangeService] Secondary exchange rate API failed:", err instanceof Error ? err.message : err);
  }
  return null;
}

/**
 * Retrieves exchange rates.
 * Supports explicit forceRefresh to bypass in-memory caching.
 */
export async function getExchangeRates(forceRefresh = false): Promise<ExchangeRatesResult> {
  const now = Date.now();

  // Return fresh in-memory cache if valid and forceRefresh is NOT requested
  if (!forceRefresh && ratesCache && now - ratesCache.timestamp < CACHE_TTL_MS) {
    return {
      rates: ratesCache.rates,
      lastUpdated: ratesCache.lastUpdated,
      source: "cache",
      provider: ratesCache.provider,
      timestamp: ratesCache.timestamp,
    };
  }

  // 1. Attempt Primary Provider
  const primaryResult = await fetchFromPrimaryProvider();
  if (primaryResult) {
    ratesCache = {
      rates: primaryResult.rates,
      lastUpdated: primaryResult.lastUpdated,
      provider: primaryResult.provider,
      timestamp: now,
    };
    return {
      rates: ratesCache.rates,
      lastUpdated: ratesCache.lastUpdated,
      source: "live",
      provider: ratesCache.provider,
      timestamp: now,
    };
  }

  // 2. Attempt Secondary Provider (Failover)
  const secondaryResult = await fetchFromSecondaryProvider();
  if (secondaryResult) {
    ratesCache = {
      rates: secondaryResult.rates,
      lastUpdated: secondaryResult.lastUpdated,
      provider: secondaryResult.provider,
      timestamp: now,
    };
    return {
      rates: ratesCache.rates,
      lastUpdated: ratesCache.lastUpdated,
      source: "live",
      provider: ratesCache.provider,
      timestamp: now,
    };
  }

  // 3. Fallback: If cache exists from earlier in the session, return with cache indicator
  if (ratesCache) {
    return {
      rates: ratesCache.rates,
      lastUpdated: ratesCache.lastUpdated,
      source: "cache",
      provider: `${ratesCache.provider} (Retained)`,
      timestamp: ratesCache.timestamp,
    };
  }

  // 4. Offline Benchmark Fallback (Truthfully labeled as offline benchmark)
  return {
    rates: FALLBACK_RATES,
    lastUpdated: FALLBACK_BENCHMARK_DATE,
    source: "fallback",
    provider: "Offline Benchmark",
    timestamp: now,
    isStaleFallback: true,
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
