export interface ProfileDto {
  readonly clientId: string;
  readonly authSubject: string;
  readonly email: string;
  readonly username: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly alias: string | null;
  readonly transferCode: string;
  readonly status: string;
  readonly timezone: string;
  readonly walletId: string | null;
  readonly walletStatus: string | null;
  readonly currency: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface UpdateProfileInput {
  readonly timezone?: string;
  readonly alias?: string;
}
