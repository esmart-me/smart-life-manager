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
  {
    country: "Pakistan",
    countryCode: "PK",
    currency: "Pakistani Rupee",
    currencyCode: "PKR",
    currencySymbol: "₨",
    locale: "ur-PK",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-PK",
    flag: "🇵🇰",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 1499, family: 2999 },
    defaultYearlyPrice: { free: 0, premium: 14999, family: 29999 },
  },
  {
    country: "Sri Lanka",
    countryCode: "LK",
    currency: "Sri Lankan Rupee",
    currencyCode: "LKR",
    currencySymbol: "Rs",
    locale: "si-LK",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-LK",
    flag: "🇱🇰",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 2500, family: 4900 },
    defaultYearlyPrice: { free: 0, premium: 25000, family: 49000 },
  },
  {
    country: "Bangladesh",
    countryCode: "BD",
    currency: "Bangladeshi Taka",
    currencyCode: "BDT",
    currencySymbol: "৳",
    locale: "bn-BD",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-BD",
    flag: "🇧🇩",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 799, family: 1599 },
    defaultYearlyPrice: { free: 0, premium: 7999, family: 15999 },
  },
  {
    country: "Nepal",
    countryCode: "NP",
    currency: "Nepalese Rupee",
    currencyCode: "NPR",
    currencySymbol: "रू",
    locale: "ne-NP",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-NP",
    flag: "🇳🇵",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 799, family: 1599 },
    defaultYearlyPrice: { free: 0, premium: 7999, family: 15999 },
  },
  {
    country: "Canada",
    countryCode: "CA",
    currency: "Canadian Dollar",
    currencyCode: "CAD",
    currencySymbol: "CA$",
    locale: "en-CA",
    dateFormat: "YYYY-MM-DD",
    numberFormat: "en-CA",
    flag: "🇨🇦",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 12.99, family: 24.99 },
    defaultYearlyPrice: { free: 0, premium: 119.99, family: 229.99 },
  },
  {
    country: "Australia",
    countryCode: "AU",
    currency: "Australian Dollar",
    currencyCode: "AUD",
    currencySymbol: "A$",
    locale: "en-AU",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-AU",
    flag: "🇦🇺",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 14.99, family: 29.99 },
    defaultYearlyPrice: { free: 0, premium: 139.99, family: 279.99 },
  },
  {
    country: "Singapore",
    countryCode: "SG",
    currency: "Singapore Dollar",
    currencyCode: "SGD",
    currencySymbol: "S$",
    locale: "en-SG",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-SG",
    flag: "🇸🇬",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 12.99, family: 24.99 },
    defaultYearlyPrice: { free: 0, premium: 119.99, family: 229.99 },
  },
  {
    country: "Japan",
    countryCode: "JP",
    currency: "Japanese Yen",
    currencyCode: "JPY",
    currencySymbol: "¥",
    locale: "ja-JP",
    dateFormat: "YYYY/MM/DD",
    numberFormat: "ja-JP",
    flag: "🇯🇵",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 1200, family: 2400 },
    defaultYearlyPrice: { free: 0, premium: 11000, family: 22000 },
  },
  {
    country: "Switzerland",
    countryCode: "CH",
    currency: "Swiss Franc",
    currencyCode: "CHF",
    currencySymbol: "CHF",
    locale: "de-CH",
    dateFormat: "DD.MM.YYYY",
    numberFormat: "de-CH",
    flag: "🇨🇭",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 9.90, family: 18.90 },
    defaultYearlyPrice: { free: 0, premium: 99.00, family: 189.00 },
  },
  {
    country: "Malaysia",
    countryCode: "MY",
    currency: "Malaysian Ringgit",
    currencyCode: "MYR",
    currencySymbol: "RM",
    locale: "ms-MY",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-MY",
    flag: "🇲🇾",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 39, family: 79 },
    defaultYearlyPrice: { free: 0, premium: 390, family: 790 },
  },
  {
    country: "Philippines",
    countryCode: "PH",
    currency: "Philippine Peso",
    currencyCode: "PHP",
    currencySymbol: "₱",
    locale: "en-PH",
    dateFormat: "MM/DD/YYYY",
    numberFormat: "en-PH",
    flag: "🇵🇭",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 499, family: 999 },
    defaultYearlyPrice: { free: 0, premium: 4990, family: 9990 },
  },
  {
    country: "Indonesia",
    countryCode: "ID",
    currency: "Indonesian Rupiah",
    currencyCode: "IDR",
    currencySymbol: "Rp",
    locale: "id-ID",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "id-ID",
    flag: "🇮🇩",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 99000, family: 199000 },
    defaultYearlyPrice: { free: 0, premium: 990000, family: 1990000 },
  },
  {
    country: "Thailand",
    countryCode: "TH",
    currency: "Thai Baht",
    currencyCode: "THB",
    currencySymbol: "฿",
    locale: "th-TH",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "th-TH",
    flag: "🇹🇭",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 299, family: 599 },
    defaultYearlyPrice: { free: 0, premium: 2990, family: 5990 },
  },
  {
    country: "South Africa",
    countryCode: "ZA",
    currency: "South African Rand",
    currencyCode: "ZAR",
    currencySymbol: "R",
    locale: "en-ZA",
    dateFormat: "YYYY/MM/DD",
    numberFormat: "en-ZA",
    flag: "🇿🇦",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 149, family: 299 },
    defaultYearlyPrice: { free: 0, premium: 1490, family: 2990 },
  },
  {
    country: "New Zealand",
    countryCode: "NZ",
    currency: "New Zealand Dollar",
    currencyCode: "NZD",
    currencySymbol: "NZ$",
    locale: "en-NZ",
    dateFormat: "DD/MM/YYYY",
    numberFormat: "en-NZ",
    flag: "🇳🇿",
    enabled: true,
    defaultMonthlyPrice: { free: 0, premium: 15.99, family: 31.99 },
    defaultYearlyPrice: { free: 0, premium: 149.99, family: 299.99 },
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

  // Explicit country tag matching
  if (normalized.includes("-in") || normalized.includes("_in")) return getRegion("IN");
  if (normalized.includes("-ae") || normalized.includes("_ae")) return getRegion("AE");
  if (normalized.includes("-gb") || normalized.includes("_gb") || normalized.includes("-uk")) return getRegion("GB");
  if (normalized.includes("-sa") || normalized.includes("_sa")) return getRegion("SA");
  if (normalized.includes("-qa") || normalized.includes("_qa")) return getRegion("QA");
  if (normalized.includes("-kw") || normalized.includes("_kw")) return getRegion("KW");
  if (normalized.includes("-om") || normalized.includes("_om")) return getRegion("OM");
  if (normalized.includes("-bh") || normalized.includes("_bh")) return getRegion("BH");
  if (normalized.includes("-pk") || normalized.includes("_pk")) return getRegion("PK");
  if (normalized.includes("-lk") || normalized.includes("_lk")) return getRegion("LK");
  if (normalized.includes("-bd") || normalized.includes("_bd")) return getRegion("BD");
  if (normalized.includes("-np") || normalized.includes("_np")) return getRegion("NP");
  if (normalized.includes("-ca") || normalized.includes("_ca")) return getRegion("CA");
  if (normalized.includes("-au") || normalized.includes("_au")) return getRegion("AU");
  if (normalized.includes("-sg") || normalized.includes("_sg")) return getRegion("SG");
  if (normalized.includes("-jp") || normalized.includes("_jp")) return getRegion("JP");
  if (normalized.includes("-ch") || normalized.includes("_ch")) return getRegion("CH");
  if (normalized.includes("-my") || normalized.includes("_my")) return getRegion("MY");
  if (normalized.includes("-ph") || normalized.includes("_ph")) return getRegion("PH");
  if (normalized.includes("-id") || normalized.includes("_id")) return getRegion("ID");
  if (normalized.includes("-th") || normalized.includes("_th")) return getRegion("TH");
  if (normalized.includes("-za") || normalized.includes("_za")) return getRegion("ZA");
  if (normalized.includes("-nz") || normalized.includes("_nz")) return getRegion("NZ");
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

const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW", "VND", "IDR", "CLP", "PYG", "RWF", "UGX"]);
const THREE_DECIMAL_CURRENCIES = new Set(["KWD", "BHD", "OMR", "JOD", "TND", "LYD", "IQD"]);

/**
 * Returns the standard decimal places for a currency code.
 */
export function getCurrencyDecimalDigits(currencyCode?: string | null): number {
  const code = (currencyCode || "").trim().toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  return 2;
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
  const currencyCode = (currencyCodeOrRegion && currencyCodeOrRegion.length === 3)
    ? currencyCodeOrRegion.toUpperCase()
    : reg.currencyCode;
  const locale = customLocale || reg.locale;
  const fractionDigits = getCurrencyDecimalDigits(currencyCode);

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return formatter.format(amount);
  } catch {
    // Graceful fallback if Intl fails
    const formattedNum = amount.toLocaleString(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `${reg.currencySymbol || currencyCode} ${formattedNum}`;
  }
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
  country: string;
}

export const ISO_CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸", country: "United States" },
  { code: "AED", name: "UAE Dirham", symbol: "AED", flag: "🇦🇪", country: "United Arab Emirates" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", flag: "🇮🇳", country: "India" },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR", flag: "🇸🇦", country: "Saudi Arabia" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KWD", flag: "🇰🇼", country: "Kuwait" },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR", flag: "🇶🇦", country: "Qatar" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BHD", flag: "🇧🇭", country: "Bahrain" },
  { code: "OMR", name: "Omani Rial", symbol: "OMR", flag: "🇴🇲", country: "Oman" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺", country: "European Union" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧", country: "United Kingdom" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", flag: "🇵🇰", country: "Pakistan" },
  { code: "LKR", name: "Sri Lankan Rupee", symbol: "Rs", flag: "🇱🇰", country: "Sri Lanka" },
  { code: "BDT", name: "Bangladeshi Taka", symbol: "৳", flag: "🇧🇩", country: "Bangladesh" },
  { code: "NPR", name: "Nepalese Rupee", symbol: "रू", flag: "🇳🇵", country: "Nepal" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", flag: "🇨🇦", country: "Canada" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", flag: "🇦🇺", country: "Australia" },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", flag: "🇸🇬", country: "Singapore" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", flag: "🇯🇵", country: "Japan" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", flag: "🇨🇭", country: "Switzerland" },
  { code: "MYR", name: "Malaysian Ringgit", symbol: "RM", flag: "🇲🇾", country: "Malaysia" },
  { code: "PHP", name: "Philippine Peso", symbol: "₱", flag: "🇵🇭", country: "Philippines" },
  { code: "IDR", name: "Indonesian Rupiah", symbol: "Rp", flag: "🇮🇩", country: "Indonesia" },
  { code: "THB", name: "Thai Baht", symbol: "฿", flag: "🇹🇭", country: "Thailand" },
  { code: "ZAR", name: "South African Rand", symbol: "R", flag: "🇿🇦", country: "South Africa" },
  { code: "NZD", name: "New Zealand Dollar", symbol: "NZ$", flag: "🇳🇿", country: "New Zealand" },
];

