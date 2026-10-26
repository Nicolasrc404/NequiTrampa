// ============================================================
// Utilidades monetarias — COP en unidades menores (centavos)
// ============================================================
// El backend expone `amountCents` / `balanceAfterCents` como enteros (int64) y
// `amount` como decimal. El frontend NUNCA debe operar con punto flotante:
// toda aritmética se hace sobre enteros de centavos y el parseo de entrada se
// hace sobre la representación decimal en texto para evitar 0.1 + 0.2.

export const CENTS_PER_COP = 100;

/** Error de validación monetaria. Nunca debe llegar al usuario como stack. */
export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyError';
  }
}

const DECIMAL_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;
const CURRENCY_NOISE = /[\s\u00A0$COP]/gi;

/** `true` si el valor es un entero de centavos seguro (sin fracciones ni NaN). */
export function isValidCents(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

/** Valida que un monto sea un entero de centavos seguro. */
export function assertCents(value: number, label = 'amountCents'): number {
  if (!isValidCents(value)) {
    throw new MoneyError(
      `${label} debe ser un entero de centavos seguro. Recibido: ${String(value)}.`,
    );
  }
  return value;
}

/**
 * Convierte una representación decimal ("1234.56", "1234", "10.5") a centavos.
 * Acepta como máximo dos decimales; rechaza notación exponencial y valores no finitos.
 */
export function copDecimalToCents(value: number | string): number {
  const text = typeof value === 'number' ? numberToDecimalString(value) : value;
  const match = DECIMAL_PATTERN.exec(text.trim());
  if (!match) {
    throw new MoneyError(`Valor decimal inválido para COP: "${String(value)}".`);
  }
  const sign = match[1] === '-' ? -1 : 1;
  const whole = match[2];
  const fraction = (match[3] ?? '').padEnd(2, '0');
  // Se construye el entero a partir de los dígitos, sin multiplicar floats.
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, '');
  return assertCents(sign * Number(digits));
}

function numberToDecimalString(value: number): string {
  if (!Number.isFinite(value)) {
    throw new MoneyError('El monto debe ser un número finito.');
  }
  const text = String(value);
  if (/[eE]/.test(text)) {
    throw new MoneyError(
      'No se admite notación exponencial; envía el monto como string decimal.',
    );
  }
  return text;
}

/** Convierte centavos a la cadena decimal que espera el backend ("1234.56"). */
export function centsToCopDecimal(cents: number): string {
  const safe = assertCents(cents);
  const sign = safe < 0 ? '-' : '';
  const absolute = Math.abs(safe);
  const whole = Math.trunc(absolute / CENTS_PER_COP);
  const fraction = absolute % CENTS_PER_COP;
  return `${sign}${whole}.${String(fraction).padStart(2, '0')}`;
}

export interface ParseCopInputOptions {
  /** Permite montos negativos (por defecto `false`: los formularios son de valor absoluto). */
  readonly allowNegative?: boolean;
  /** Tope en centavos; si se supera devuelve `null`. */
  readonly maxCents?: number;
}

/**
 * Interpreta el texto escrito por un usuario en un formulario de dinero.
 * Acepta formato es-CO ("$ 1.234,56"), formato con punto decimal ("1234.56"),
 * separadores de miles ("1.234") y montos sin decimales ("1234").
 * Devuelve `null` cuando la entrada es inválida (no lanza).
 */
export function parseCopInput(
  input: string | null | undefined,
  options: ParseCopInputOptions = {},
): number | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  let cleaned = trimmed.replace(CURRENCY_NOISE, '');
  if (cleaned.length === 0) return null;

  const negative = cleaned.startsWith('-');
  if (negative) cleaned = cleaned.slice(1);

  // Solo dígitos y separadores; cualquier otro carácter invalida la entrada.
  if (!/^[\d.,]+$/.test(cleaned)) return null;
  if (!/\d/.test(cleaned)) return null;

  let normalized: string;
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    normalized =
      lastComma > lastDot
        ? cleaned.replace(/\./g, '').replace(',', '.') // 1.234,56 → 1234.56
        : cleaned.replace(/,/g, ''); // 1,234.56 → 1234.56
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.'); // 1234,56 → 1234.56
  } else if (hasDot) {
    const groups = cleaned.split('.');
    const groupedThousands = groups
      .slice(1)
      .every((group) => group.length === 3);
    normalized = groupedThousands ? groups.join('') : cleaned; // 1.234 → 1234
  } else {
    normalized = cleaned;
  }

  try {
    const cents = copDecimalToCents(normalized);
    const absolute = Math.abs(cents);
    if (negative && !options.allowNegative) return null;
    if (options.maxCents !== undefined && absolute > options.maxCents) {
      return null;
    }
    return negative ? -absolute : absolute;
  } catch {
    return null;
  }
}

export type CopCentsDisplay = 'auto' | 'always' | 'never';

export interface FormatCopCentsOptions {
  /** `auto` muestra decimales solo si existen (por defecto). */
  readonly showCents?: CopCentsDisplay;
  /** Incluye el símbolo "$ " (por defecto `true`). */
  readonly withSymbol?: boolean;
  /** Agrupa miles con punto (por defecto `true`). */
  readonly groupThousands?: boolean;
}

/**
 * Formatea centavos como moneda COP: `formatCopCents(123456) === '$ 1.234,56'`.
 * Implementación determinista (sin depender de Intl) para que los tests y las
 * capturas de Stitch coincidan en todos los dispositivos.
 */
export function formatCopCents(
  cents: number,
  options: FormatCopCentsOptions = {},
): string {
  const safe = assertCents(cents);
  const {
    showCents = 'auto',
    withSymbol = true,
    groupThousands = true,
  } = options;

  const negative = safe < 0;
  const absolute = Math.abs(safe);
  const whole = Math.trunc(absolute / CENTS_PER_COP);
  const fraction = absolute % CENTS_PER_COP;

  const wholeText = groupThousands
    ? String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : String(whole);

  const withFractions =
    showCents === 'always' || (showCents === 'auto' && fraction !== 0);

  const amount = withFractions
    ? `${wholeText},${String(fraction).padStart(2, '0')}`
    : wholeText;

  const symbol = withSymbol ? '$ ' : '';
  return negative ? `-${symbol}${amount}` : `${symbol}${amount}`;
}

/** Suma centavos validando que cada operando y el resultado sean enteros seguros. */
export function addCents(...values: readonly number[]): number {
  let total = 0;
  for (const value of values) {
    total = assertCents(total + assertCents(value));
  }
  return total;
}

/** Suma una lista de centavos. */
export function sumCents(values: readonly number[]): number {
  return addCents(...values);
}

/** Resta validada: `subtractCents(a, b) === a - b`. */
export function subtractCents(minuend: number, subtrahend: number): number {
  return assertCents(assertCents(minuend) - assertCents(subtrahend));
}

export function isZeroCents(value: number): boolean {
  return assertCents(value) === 0;
}
