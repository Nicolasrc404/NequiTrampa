export type GoalsState =
  | 'Goals_01'
  | 'Goals_02'
  | 'Goals_03'
  | 'Goals_04'
  | 'Goals_05'
  | 'Goals_06'
  | 'Goals_07'
  | 'Goals_08'
  | 'Goals_09'
  | 'Goals_10'
  | 'Goals_11'
  | 'Goals_12'
  | 'Goals_13';

export interface GoalItem {
  readonly id: string;
  readonly name: string;
  readonly savedCents: number;
  readonly targetCents: number;
  readonly percent: number;
  readonly targetDateLabel: string;
  readonly currencyLabel: string;
}

export interface GoalDraft {
  readonly name: string;
  readonly targetCents: number;
  readonly targetDateLabel: string;
}

export interface GoalInvalidDetail {
  readonly name: string;
  readonly targetCents: number;
  readonly targetDateLabel: string;
}
