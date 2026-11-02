import { AuthError } from './errors';
import type { IdentityPlatformClient, } from './identityPlatform';
import type { IdentityTokens } from './types';

const encoder = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function utf8(value: string): number[] {
  const bytes: number[] = [];
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
  }
  return bytes;
}

function base64Url(value: string): string {
  const bytes = utf8(value);
  let output = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1] ?? 0;
    const c = bytes[i + 2] ?? 0;
    output += encoder[a >> 2] + encoder[((a & 3) << 4) | (b >> 4)];
    if (i + 1 < bytes.length) output += encoder[((b & 15) << 2) | (c >> 6)];
    if (i + 2 < bytes.length) output += encoder[c & 63];
  }
  return output;
}

function tokenFor(uid: string, now = Date.now()): string {
  const exp = Math.floor(now / 1000) + 3600;
  const header = base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const payload = base64Url(JSON.stringify({ sub: uid, user_id: uid, role: 'CLIENTE', exp }));
  return `${header}.${payload}.academic`;
}

export function createAcademicIdentityPlatformClient(): IdentityPlatformClient {
  let currentUid: string | null = null;
  return {
    async signInWithPassword(email: string, password: string): Promise<IdentityTokens> {
      const normalized = email.trim().toLowerCase();
      if (!normalized || !password) throw new AuthError('invalid_credentials', 'Correo y contraseña requeridos.');
      currentUid = `academic-${normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
      return { idToken: tokenFor(currentUid), refreshToken: `academic-refresh:${currentUid}`, expiresInSeconds: 3600 };
    },
    async refresh(refreshToken: string): Promise<IdentityTokens> {
      const prefix = 'academic-refresh:';
      if (!refreshToken.startsWith(prefix) || refreshToken.length === prefix.length) {
        throw new AuthError('invalid_session', 'La sesión académica no es válida.');
      }
      currentUid = refreshToken.slice(prefix.length);
      return { idToken: tokenFor(currentUid), refreshToken, expiresInSeconds: 3600 };
    },
  };
}
