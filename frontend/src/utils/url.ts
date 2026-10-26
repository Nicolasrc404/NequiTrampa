// ============================================================
// Utilidades de URL para la capa HTTP
// ============================================================

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Readonly<Record<string, QueryValue>>;

/**
 * Normaliza una URL base: recorta espacios y barras finales.
 * Devuelve `null` si falta o no es una URL absoluta http(s) válida.
 */
export function normalizeBaseUrl(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (trimmed.length === 0) return null;
  if (!/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(trimmed)) return null;
  try {
    // Valida además que el runtime pueda interpretarla.
    // eslint-disable-next-line no-new
    new URL(trimmed);
  } catch {
    return null;
  }
  return trimmed;
}

/**
 * Une la URL base con una ruta y serializa los parámetros de consulta.
 * Omite valores `undefined`, `null` y cadenas vacías.
 */
export function buildUrl(
  baseUrl: string,
  path: string,
  query?: QueryParams,
): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = baseUrl.replace(/\/+$/, '');
  let url = `${base}${normalizedPath}`;
  if (!query) return url;

  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    const text = String(value);
    if (text.length === 0) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(text)}`);
  }
  if (parts.length > 0) url += `?${parts.join('&')}`;
  return url;
}
