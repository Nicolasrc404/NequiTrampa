export interface ProjectionEventStatusDto {
  readonly eventId: string;
  readonly eventType: string;
  readonly published: boolean;
  readonly attempts: number;
  readonly lastError: string | null;
  readonly projected: boolean;
}

export interface ProjectionStatusDto {
  readonly operationId: string;
  readonly status: string;
  readonly events: readonly ProjectionEventStatusDto[];
}
