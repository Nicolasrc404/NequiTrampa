export type BottomTab = 'inicio' | 'movimientos' | 'asistente' | 'perfil';
export type BottomTabTarget = 'Wallet_01' | 'Movements_01' | 'Profile_01';

/** Rutas disponibles del MVP; Asistente queda informativo mientras está fuera de alcance. */
export function resolveBottomTab(tab: BottomTab): BottomTabTarget | null {
  switch (tab) {
    case 'inicio':
      return 'Wallet_01';
    case 'movimientos':
      return 'Movements_01';
    case 'perfil':
      return 'Profile_01';
    case 'asistente':
      return null;
  }
}
