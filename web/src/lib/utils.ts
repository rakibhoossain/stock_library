import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount?: number | null, unit: string = "KG", notes?: string | null): string {
  if (amount !== undefined && amount !== null && amount > 0) {
    return `$${amount.toFixed(2)}/${unit}`;
  }
  if (notes) {
    return notes;
  }
  return "Price on request";
}

export function formatWeight(min: number, max?: number | null): string {
  if (max && max > min) {
    return `${min}-${max} GSM`;
  }
  return `${min} GSM`;
}
