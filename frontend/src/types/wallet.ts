export interface WalletDto {
  readonly walletId: string;
  readonly clientId: string;
  readonly phoneNumber: string;
  readonly status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED' | string;
  readonly currency: 'COP';
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface WalletBalanceDto {
  readonly walletId: string;
  readonly clientId: string;
  readonly availableBalance: number;
  readonly availableBalanceCents: number;
  readonly currency: 'COP';
  readonly asOfTimestamp: string | null;
  readonly sourceAuthority: string;
}
