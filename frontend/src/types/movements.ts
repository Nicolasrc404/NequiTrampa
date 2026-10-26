export type MovementType =
  | 'TRANSFER_SENT'
  | 'TRANSFER_RECEIVED'
  | 'RECHARGE'
  | 'OTHER';

export type MovementFilter = 'TODOS' | 'ENVIADOS' | 'RECIBIDOS' | 'RECARGAS';

export interface MovementItem {
  id: string;
  reference: string;
  title: string;
  type: MovementType;
  categoryLabel: string;
  timestamp: string;
  formattedDate: string;
  amount: number; // in COP (legacy; prefer amountCents)
  /** Signed amount in integer cents when it comes from the API. */
  amountCents?: number;
  balanceAfter: number | null;
  /** Balance after in integer cents when the API provides it. */
  balanceAfterCents?: number | null;
  status: 'Completada' | 'Pendiente' | 'Fallida' | 'Desconocido';
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
