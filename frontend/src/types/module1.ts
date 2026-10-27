export type Module1Section =
  | 'Access'
  | 'Wallet'
  | 'Profile'
  | 'Configuration'
  | 'Projection_Status';

export type Module1ScreenKey = `${Module1Section}_${number}`;

import type { ApiServices } from '../services/factories';

export interface Module1ScreenProps {
  readonly onNavigate: (key: Module1ScreenKey) => void;
  readonly onHome?: () => void;
  readonly services?: ApiServices | null;
  readonly apiEnabled?: boolean;
}

export interface Module1DemoState {
  readonly value: string;
  readonly showSecret: boolean;
  readonly enabled: boolean;
  readonly modalOpen: boolean;
  readonly submitted: boolean;
}

export interface Module1DemoActions {
  readonly setValue: (value: string) => void;
  readonly toggleSecret: () => void;
  readonly setEnabled: (value: boolean) => void;
  readonly openModal: () => void;
  readonly closeModal: () => void;
  readonly submit: () => void;
}
