// ============================================================
// Decodificación del ID token (sin verificar la firma)
// ============================================================
// El frontend NO valida la firma del JWT: esa es responsabilidad del backend.
// Aquí solo se leen claims para mostrar identidad y calcular expiración.
// Nunca se registra el token ni sus claims sensibles.

import type { SessionUser } from './types';

export type JwtPayload = Record<string, unknown>;

const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function base64UrlToBytes(input: string): Uint8Array | null {
  const clean = input.replace(/=+$/, '');
  if (!/^[A-Za-z0-9_-]+$/.test(clean)) return null;

  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;

  for (const character of clean) {
    const value = BASE64URL_ALPHABET.indexOf(character);
    if (value < 0) return null;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }

  return new Uint8Array(bytes);
}

/** Decodifica UTF-8 sin depender de `TextDecoder` (no siempre disponible en RN). */
function bytesToUtf8(bytes: Uint8Array): string {
  let output = '';

  for (let index = 0; index < bytes.length; ) {
    const first = bytes[index];
    index += 1;

    if (first < 0x80) {
      output += String.fromCharCode(first);
      continue;
    }

    let codePoint = 0;
    let continuation = 0;

    if ((first & 0xe0) === 0xc0) {
      codePoint = first & 0x1f;
      continuation = 1;
    } else if ((first & 0xf0) === 0xe0) {
      codePoint = first & 0x0f;
      continuation = 2;
    } else if ((first & 0xf8) === 0xf0) {
      codePoint = first & 0x07;
      continuation = 3;
    } else {
      output += '\uFFFD';
      continue;
    }

    if (index + continuation > bytes.length) {
      output += '\uFFFD';
      break;
    }

    let valid = true;
    for (let offset = 0; offset < continuation; offset += 1) {
      const next = bytes[index];
      index += 1;
      if ((next & 0xc0) !== 0x80) {
        valid = false;
        break;
      }
      codePoint = (codePoint << 6) | (next & 0x3f);
    }

    if (!valid || codePoint > 0x10ffff) {
      output += '\uFFFD';
      continue;
    }

    output += String.fromCodePoint(codePoint);
  }

  return output;
}

/**
 * Devuelve el payload del JWT, o `null` si el token está mal formado.
 * No lanza: un token corrupto se trata como sesión inválida.
 */
export function decodeJwtPayload(token: string): JwtPayload | null {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3 || parts[1].length === 0) return null;

  const bytes = base64UrlToBytes(parts[1]);
  if (!bytes) return null;

  try {
    const parsed: unknown = JSON.parse(bytesToUtf8(bytes));
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    return parsed as JwtPayload;
  } catch {
    return null;
  }
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

/** `exp` en milisegundos epoch, o `null` si falta o no es numérico. */
export function readExpirationMs(payload: JwtPayload): number | null {
  const exp = payload.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp) || exp <= 0) return null;
  return Math.trunc(exp * 1000);
}

function readRoles(payload: JwtPayload): string[] {
  const roles = new Set<string>();

  const add = (value: unknown) => {
    if (typeof value === 'string') {
      const normalized = readNonEmptyString(value);
      if (normalized) roles.add(normalized);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const normalized = readNonEmptyString(item);
        if (normalized) roles.add(normalized);
      }
    }
  };

  add(payload.roles);
  add(payload.role);

  return [...roles];
}

/**
 * Extrae la identidad de dominio del payload.
 * `uid` es obligatorio; `clientId` es opcional y NUNCA se deriva del uid.
 */
export function readSessionUser(payload: JwtPayload): SessionUser | null {
  const uid =
    readNonEmptyString(payload.user_id) ??
    readNonEmptyString(payload.sub);
  if (!uid) return null;

  return {
    uid,
    clientId: readNonEmptyString(payload.client_id),
    roles: readRoles(payload),
  };
}
