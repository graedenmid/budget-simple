/**
 * Format a number as currency (USD)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Parse a currency string back to a number
 */
export function parseCurrency(currencyString: string): number {
  // Remove currency symbols and parse
  const cleaned = currencyString.replace(/[$,\s]/g, "");
  return parseFloat(cleaned) || 0;
}
