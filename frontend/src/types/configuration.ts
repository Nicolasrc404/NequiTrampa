export interface ConfigurationDto {
  readonly maintenanceMode: boolean;
  readonly notificationsEnabled: boolean;
  readonly supportEmail: string | null;
  readonly supportHours: string;
  readonly updatedAt: string | null;
  readonly updatedBy: string | null;
}

export interface UpdateConfigurationInput {
  readonly maintenanceMode?: boolean;
  readonly notificationsEnabled?: boolean;
  readonly supportEmail?: string | null;
  readonly supportHours?: string;
}
