// Amounts (goal targets, progress, prices) are kept to 2 decimal places.

export function roundAmount(n: number): number {
  return Math.round(n * 100) / 100;
}

// "1,250", "12.50", "0.5" → "0.50". Built by hand so it's identical on every platform.
export function formatAmount(n: number): string {
  const rounded = roundAmount(n);
  const [int, frac] = Math.abs(rounded).toFixed(2).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${rounded < 0 ? '-' : ''}${grouped}${frac === '00' ? '' : `.${frac}`}`;
}

// Filters typing in an amount field to digits and one decimal point (max 2 decimals).
export function sanitizeAmountInput(text: string): string {
  const cleaned = text.replace(/,/g, '.').replace(/[^0-9.]/g, '');
  const [int, ...rest] = cleaned.split('.');
  return rest.length > 0 ? `${int}.${rest.join('').slice(0, 2)}` : int;
}

// A positive amount, or null if the text isn't one.
export function parseAmount(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? roundAmount(n) : null;
}
