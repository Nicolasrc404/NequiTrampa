import { ApiError, configureHttp, request } from './http';

// Clave web pública de Identity Platform (no es un secreto); se inyecta en build.
const WEB_API_KEY = process.env.EXPO_PUBLIC_IDENTITY_API_KEY ?? '';

interface Session {
  idToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
}

// Solo en memoria: no se persisten tokens en el dispositivo.
let session: Session | null = null;
let listeners: Array<() => void> = [];

export const subscribeSession = (fn: () => void) => {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
};
const notify = () => listeners.forEach((l) => l());
export const hasSession = () => session !== null;
export const sessionEmail = () => session?.email ?? '';

function store(email: string, idToken: string, refreshToken: string, expiresIn: string) {
  session = { email, idToken, refreshToken, expiresAt: Date.now() + (Number(expiresIn) - 60) * 1000 };
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!WEB_API_KEY) throw new ApiError(500, 'Falta EXPO_PUBLIC_IDENTITY_API_KEY.', 'config_missing');
  let res: Response;
  try {
    res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${WEB_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
  } catch {
    throw new ApiError(503, 'No hay conexión con el servicio.', 'network_error');
  }
  if (!res.ok) throw new ApiError(401, 'Correo o contraseña inválidos.', 'invalid_credentials');
  const b = await res.json();
  store(email, b.idToken, b.refreshToken, b.expiresIn);
  notify();
}

async function refresh(): Promise<void> {
  if (!session) return;
  const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${WEB_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(session.refreshToken)}`,
  });
  if (!res.ok) {
    signOut();
    return;
  }
  const b = await res.json();
  store(session.email, b.id_token, b.refresh_token, b.expires_in);
}

export function signOut() {
  session = null;
  notify();
}

configureHttp({
  getToken: async () => {
    if (session && Date.now() >= session.expiresAt) await refresh();
    return session?.idToken ?? null;
  },
  onUnauthorized: signOut,
});

export async function fetchRoles(): Promise<string[]> {
  const r = await request<{ roles?: string[] }>('/v1/me/access');
  return r.roles ?? [];
}
