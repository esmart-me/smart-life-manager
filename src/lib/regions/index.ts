// Smart Life Manager - Centralized Regional & Multi-Currency System
// Configurable, extensible country and currency registry

export interface RegionDefinition {
  country: string;
  countryCode: string; // ISO 3166-1 alpha-2
  currency: string;
  currencyCode: string; // ISO 4217
  currencySymbol: string;
  locale: string;
  dateFormat: string;
  numberFormat: string;
  flag: string; // Emoji flag
  enabled: boolean;
  defaultMonthlyPrice: {
    free: number;
    premium: number;
    family: number;
  };
  defaultYearlyPrice: {
    free: number;
    premium: number;
    family: number;
  };
}

/**
 * Standard registry of supported regions and currencies.
 * Admin or database configurations can enable/disable or extend this list.
 */
export const SUPPORTED_REGIONS: RegionDefinition[] = [
  {
    country: "India",
    countryCode: "IN",
    currency: "Indian Rupee",
    currencyCode: "INR",
    currencySymbol: "₹",
    locale: "en-IN",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-IN",
    flag: "🇮🇳",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 499, family: 999 },
    defaultYearlyPrice: { free: 0, premium: 4999, family: 9999 },
  },
  {
    country: "United Arab Emirates",
    countryCode: "AE",
    currency: "UAE Dirham",
    currencyCode: "AED",
    currencySymbol: "AED",
    locale: "en-AE",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-AE",
    flag: "🇦🇪",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 35, family: 69 },
    defaultYearlyPrice: { free: 0, premium: 350, family: 690 },
  },
  {
    country: "United States",
    countryCode: "US",
    currency: "US Dollar",
    currencyCode: "USD",
    currencySymbol: "$",
    locale: "en-US",
    dateFormat: "MM/DD/YYYY",
    numberFormat: "en-US",
    flag: "🇺🇸",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 9.99, family: 19.99 },
    defaultYearlyPrice: { free: 0, premium: 89.99, family: 179.99 },
  },
  {
    country: "United Kingdom",
    countryCode: "GB",
    currency: "British Pound",
    currencyCode: "GBP",
    currencySymbol: "£",
    locale: "en-GB",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-GB",
    flag: "🇬🇧",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 7.99, family: 15.99 },
    defaultYearlyPrice: { free: 0, premium: 79.99, family: 149.99 },
  },
  {
    country: "European Union",
    countryCode: "EU",
    currency: "Euro",
    currencyCode: "EUR",
    currencySymbol: "€",
    locale: "de-DE",
    dateFormat: "DD.MM.YYYY",
    numberFormat: "de-DE",
    flag: "🇪🇺",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 8.99, family: 17.99 },
    defaultYearlyPrice: { free: 0, premium: 89.99, family: 169.99 },
  },
  {
    country: "Saudi Arabia",
    countryCode: "SA",
    currency: "Saudi Riyal",
    currencyCode: "SAR",
    currencySymbol: "SAR",
    locale: "en-SA",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-SA",
    flag: "🇸🇦",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 39, family: 79 },
    defaultYearlyPrice: { free: 0, premium: 390, family: 790 },
  },
  {
    country: "Qatar",
    countryCode: "QA",
    currency: "Qatari Riyal",
    currencyCode: "QAR",
    currencySymbol: "QAR",
    locale: "en-QA",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-QA",
    flag: "🇶🇦",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 39, family: 79 },
    defaultYearlyPrice: { free: 0, premium: 390, family: 790 },
  },
  {
    country: "Kuwait",
    countryCode: "KW",
    currency: "Kuwaiti Dinar",
    currencyCode: "KWD",
    currencySymbol: "KWD",
    locale: "en-KW",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-KW",
    flag: "🇰🇼",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 3.5, family: 6.9 },
    defaultYearlyPrice: { free: 0, premium: 35, family: 69 },
  },
  {
    country: "Oman",
    countryCode: "OM",
    currency: "Omani Rial",
    currencyCode: "OMR",
    currencySymbol: "OMR",
    locale: "en-OM",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-OM",
    flag: "🇴🇲",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 4, family: 8 },
    defaultYearlyPrice: { free: 0, premium: 40, family: 80 },
  },
  {
    country: "Bahrain",
    countryCode: "BH",
    currency: "Bahraini Dinar",
    currencyCode: "BHD",
    currencySymbol: "BHD",
    locale: "en-BH",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-BH",
    flag: "🇧🇭",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 4, family: 8 },
    defaultYearlyPrice: { free: 0, premium: 40, family: 80 },
  },
];

export const DEFAULT_REGION_CODE = "US";

/**
 * Returns all active/enabled regions.
 */
export function getSupportedRegions(): RegionDefinition[] {
  return SUPPORTED_REGIONS.filter((r) => r.enabled);
}

/**
 * Look up a region definition by country code or currency code.
 */
export function getRegion(codeOrCurrency?: string | null): RegionDefinition {
  if (!codeOrCurrency) {
    return SUPPORTED_REGIONS.find((r) => r.countryCode === DEFAULT_REGION_CODE)!;
  }
  const needle = codeOrCurrency.trim().toUpperCase();
  const found = SUPPORTED_REGIONS.find(
    (r) =>
      r.countryCode === needle ||
      r.currencyCode === needle ||
      r.country.toUpperCase() === needle
  );
  return found || SUPPORTED_REGIONS.find((r) => r.countryCode === DEFAULT_REGION_CODE)!;
}

/**
 * Detects the most appropriate region from a browser locale or Accept-Language string.
 * Non-sensitive method (does not rely on IP geolocation).
 */
export function detectRegionFromLocale(localeString?: string | null): RegionDefinition {
  if (!localeString) {
    return getRegion(DEFAULT_REGION_CODE);
  }

  const normalized = localeString.toLowerCase();

  // Explicit country tag matching (e.g. "en-in", "hi-in", "ar-ae")
  if (normalized.includes("-in") || normalized.includes("_in")) return getRegion("IN");
  if (normalized.includes("-ae") || normalized.includes("_ae")) return getRegion("AE");
  if (normalized.includes("-gb") || normalized.includes("_gb") || normalized.includes("-uk")) return getRegion("GB");
  if (normalized.includes("-sa") || normalized.includes("_sa")) return getRegion("SA");
  if (normalized.includes("-qa") || normalized.includes("_qa")) return getRegion("QA");
  if (normalized.includes("-kw") || normalized.includes("_kw")) return getRegion("KW");
  if (normalized.includes("-om") || normalized.includes("_om")) return getRegion("OM");
  if (normalized.includes("-bh") || normalized.includes("_bh")) return getRegion("BH");
  if (
    normalized.includes("-de") ||
    normalized.includes("-fr") ||
    normalized.includes("-it") ||
    normalized.includes("-es") ||
    normalized.includes("-nl") ||
    normalized.includes("-eu")
  ) {
    return getRegion("EU");
  }
  if (normalized.includes("-us") || normalized.includes("_us")) return getRegion("US");

  // Fallback to default
  return getRegion(DEFAULT_REGION_CODE);
}

/**
 * Formats a currency amount with localized currency symbol and proper number separation.
 */
export function formatRegionalCurrency(
  amount: number,
  currencyCodeOrRegion?: string | null,
  customLocale?: string
): string {
  const reg = getRegion(currencyCodeOrRegion);
  const locale = customLocale || reg.locale;

  try {
    // If currency has fractional parts or is integer
    const hasFractions = amount % 1 !== 0;
    const fractionDigits = reg.currencyCode === "KWD" || reg.currencyCode === "BHD" || reg.currencyCode === "OMR" 
      ? (hasFractions ? 3 : 0) 
      : (hasFractions ? 2 : 0);

    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: reg.currencyCode,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return formatter.format(amount);
  } catch {
    // Graceful fallback if Intl fails
    const formattedNum = amount.toLocaleString(locale);
    return `${reg.currencySymbol} ${formattedNum}`;
  }
}
