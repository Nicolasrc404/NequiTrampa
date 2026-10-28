import { formatCopFromCents } from './demoTransfers';
import {
  GoalDraft,
  GoalInvalidDetail,
  GoalItem,
} from '../types/goals';

export const DEMO_GOALS: GoalItem[] = [
  {
    id: 'demo-goal-emergency',
    name: 'Fondo de emergencia',
    savedCents: 150_000_000,
    targetCents: 500_000_000,
    percent: 30,
    targetDateLabel: '31 de diciembre de 2027',
    targetDate: '2027-12-31',
    currencyLabel: 'COP · pesos colombianos',
  },
  {
    id: 'demo-goal-computer',
    name: 'Mi nuevo computador',
    savedCents: 120_000_000,
    targetCents: 240_000_000,
    percent: 50,
    targetDateLabel: '31 de marzo de 2027',
    targetDate: '2027-03-31',
    currencyLabel: 'COP · pesos colombianos',
  },
  {
    id: 'demo-goal-trip',
    name: 'Viaje a Cartagena',
    savedCents: 0,
    targetCents: 300_000_000,
    percent: 0,
    targetDateLabel: '30 de junio de 2027',
    targetDate: '2027-06-30',
    currencyLabel: 'COP · pesos colombianos',
  },
];

export const DEMO_GOAL_CREATED: GoalItem = {
  id: 'demo-goal-created',
  name: 'Viaje a Cartagena',
  savedCents: 0,
  targetCents: 300_000_000,
  percent: 0,
  targetDateLabel: '30 de junio de 2027',
  currencyLabel: 'COP · pesos colombianos',
};

export const DEMO_GOAL_EDITED: GoalItem = {
  id: 'demo-goal-edited',
  name: 'Viaje a Cartagena',
  savedCents: 0,
  targetCents: 360_000_000,
  percent: 0,
  targetDateLabel: '31 de julio de 2027',
  currencyLabel: 'COP · pesos colombianos',
};

export const DEMO_GOAL_CREATE_DRAFT: GoalDraft = {
  name: 'V',
  targetCents: 0,
  targetDateLabel: '30 de junio de 2027',
};

export const DEMO_GOAL_EDIT_DRAFT: GoalDraft = {
  name: 'Viaje a Cartagena',
  targetCents: -10_000_000,
  targetDateLabel: '31 de julio de 2027',
};

export const DEMO_GOAL_INVALID_DATE: GoalInvalidDetail = {
  name: 'Viaje a Cartagena',
  targetCents: 300_000_000,
  targetDateLabel: '30 de septiembre de 2026',
};

export const formatGoalAmount = (amountCents: number): string =>
  formatCopFromCents(amountCents);

export const formatGoalSignedAmount = (amountCents: number): string => {
  const label = formatCopFromCents(Math.abs(amountCents));
  return amountCents < 0 ? label.replace('$ ', '$ -') : label;
};
