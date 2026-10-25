export type MovementType = 'TRANSFER_SENT' | 'TRANSFER_RECEIVED' | 'RECHARGE';

export type MovementFilter = 'TODOS' | 'ENVIADOS' | 'RECIBIDOS' | 'RECARGAS';

export interface MovementItem {
  id: string;
  reference: string;
  title: string;
  type: MovementType;
  categoryLabel: string;
  timestamp: string;
  formattedDate: string;
  amount: number; // in COP
  balanceAfter: number;
  status: 'Completada' | 'Pendiente' | 'Fallida';
  initialLetter?: string;
}

export type MovementsState = 
  | 'Movements_01' // Historial
  | 'Movements_02' // Estado vacío
  | 'Movements_03' // Skeleton de carga
  | 'Movements_04' // Filtros
  | 'Movements_05' // Detalle del movimiento
  | 'Movements_06' // Movimiento no encontrado (404)
  | 'Movements_07' // Sesión vencida (401)
  | 'Movements_08'; // Servicio no disponible (503)
