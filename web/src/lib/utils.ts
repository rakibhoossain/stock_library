import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a monetary number into standard currency string using Intl.NumberFormat.
 * e.g. 7.85 with "USD" -> "$7.85"
 * e.g. 12.5 with "EUR" -> "€12.50"
 */
export function formatCurrency(
  amount?: number | null,
  currency: string = "USD",
  locale: string = "en-US"
): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "";
  }
  const cleanCurrency = (currency || "USD").trim().toUpperCase();
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: cleanCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if non-standard or custom currency string is provided
    return `$${amount.toFixed(2)}`;
  }
}

/**
 * Formats full fabric price with currency symbol and unit.
 * Supports:
 * - formatPrice(amount, currency, unit, notes, status)
 * - Legacy: formatPrice(amount, unit, notes)
 */
export function formatPrice(
  amount?: number | null,
  currencyOrUnit: string = "USD",
  unitOrNotes?: string | null,
  notes?: string | null,
  status?: string | null
): string {
  const hasAmount = amount !== undefined && amount !== null && !isNaN(amount) && amount > 0;
  const rawNotes =
    notes ||
    (typeof unitOrNotes === "string" && !["KG", "YDS", "YD", "METER", "M", "PIECE", "PCS", "ROLL"].includes(unitOrNotes.toUpperCase())
      ? unitOrNotes
      : null);
  const cleanNotes =
    rawNotes && !rawNotes.toLowerCase().includes("explore") ? rawNotes.trim() : null;

  if (hasAmount) {
    const commonUnits = ["KG", "YDS", "YD", "METER", "M", "PIECE", "PCS", "ROLL"];
    const isLegacyUnit =
      commonUnits.includes((currencyOrUnit || "").replace(/^\//, "").toUpperCase()) &&
      (notes === undefined || notes === null);

    let currency = "USD";
    let unit = "kg";

    if (isLegacyUnit) {
      currency = "USD";
      unit = (currencyOrUnit || "kg").replace(/^\//, "").toLowerCase();
    } else {
      currency = (currencyOrUnit || "USD").trim();
      unit = (unitOrNotes || "kg").replace(/^\//, "").toLowerCase();
    }

    const formatted = formatCurrency(amount, currency);
    const priceStr = `${formatted}/${unit}`;

    // If both exist, FIRST show price, THEN note
    if (cleanNotes && cleanNotes.length > 0) {
      return `${priceStr} (${cleanNotes})`;
    }
    return priceStr;
  }

  // If only note exists
  if (cleanNotes && cleanNotes.length > 0) {
    return cleanNotes;
  }

  if (status) {
    switch (status) {
      case "PENDING":
        return "-";
      case "UPON_REQUEST":
        return "Upon Request";
      case "NOT_DISCLOSED":
        return "Not Disclosed";
      case "CONFIRMED":
        return "-";
      default:
        return status;
    }
  }

  return "-";
}

export function formatWeight(min: number, max?: number | null): string {
  if (max && max > min) {
    return `${min}-${max} GSM`;
  }
  return `${min} GSM`;
}
