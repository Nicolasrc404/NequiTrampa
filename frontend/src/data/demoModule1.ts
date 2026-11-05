import { Module1ScreenKey, Module1Section } from '../types/module1';

export const MODULE1_SCREEN_COUNTS: Record<Module1Section, number> = {
  Access: 3,
  Wallet: 9,
  Profile: 9,
  Configuration: 9,
  Projection_Status: 5,
};

export const MODULE1_SECTION_LABELS: Record<Module1Section, string> = {
  Access: 'Acceso',
  Wallet: 'Billetera',
  Profile: 'Perfil',
  Configuration: 'Configuración',
  Projection_Status: 'Estado de proyección',
};

export const MODULE1_STATUS_LABELS: Record<Module1Section, readonly string[]> = {
  Access: ['Inicio de sesión', 'Sesión expirada', 'Acceso denegado'],
  Wallet: ['Saldo disponible', 'Billetera vacía', 'Cargando saldo…', 'Opciones de billetera', 'Servicio no disponible', 'Detalle de billetera', 'Acceso requerido', 'Billetera no encontrada', 'Error temporal'],
  Profile: ['Mi perfil', 'Cargando perfil…', 'Editar información', 'Cambios guardados', 'Revisa los campos', 'Acceso requerido', 'No se pudo guardar', 'Seguridad de acceso', 'Sesión expirada'],
  Configuration: ['Preferencias', 'Notificaciones', 'Apariencia', 'Seguridad', 'Idioma', 'No se pudo actualizar', 'Preferencias guardadas', 'Sin preferencias', 'Acceso requerido'],
  Projection_Status: ['Procesando proyección…', 'Proyección disponible', 'No se pudo cargar', 'Sin datos para mostrar', 'Detalle de proyección'],
};

export const getModule1Section = (key: Module1ScreenKey): Module1Section => {
  if (key.startsWith('Projection_Status')) return 'Projection_Status';
  if (key.startsWith('Configuration')) return 'Configuration';
  if (key.startsWith('Profile')) return 'Profile';
  if (key.startsWith('Wallet')) return 'Wallet';
  return 'Access';
};

export const getModule1Number = (key: Module1ScreenKey): number =>
  Number(key.split('_').pop() ?? 1);

export const getNextModule1Screen = (key: Module1ScreenKey): Module1ScreenKey => {
  const section = getModule1Section(key);
  const number = getModule1Number(key);
  const next = number >= MODULE1_SCREEN_COUNTS[section] ? 1 : number + 1;
  return `${section}_${String(next).padStart(2, '0')}` as Module1ScreenKey;
};

export const getPreviousModule1Screen = (key: Module1ScreenKey): Module1ScreenKey => {
  const section = getModule1Section(key);
  const number = getModule1Number(key);
  const previous = number <= 1 ? MODULE1_SCREEN_COUNTS[section] : number - 1;
  return `${section}_${String(previous).padStart(2, '0')}` as Module1ScreenKey;
};
