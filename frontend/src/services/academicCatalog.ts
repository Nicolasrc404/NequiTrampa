import type { TransferRecipient } from '../types/transfers';

export interface AcademicDemoUser {
  readonly email: string;
  readonly password: string;
  readonly uid: string;
  readonly transferCode: string;
  readonly displayName: string;
  readonly active: boolean;
}

export const ACADEMIC_DEMO_USERS: readonly AcademicDemoUser[] = [
  { email: 'laura@demo.local', password: 'DemoLaura123!', uid: 'academic-laura', transferCode: 'LAUR-5120', displayName: 'Laura Demo', active: true },
  { email: 'carlos@demo.local', password: 'DemoCarlos123!', uid: 'academic-carlos', transferCode: 'CARL-9941', displayName: 'Carlos Demo', active: true },
  { email: 'sofia@demo.local', password: 'DemoSofia123!', uid: 'academic-sofia', transferCode: 'SOFI-3307', displayName: 'Sofía Demo', active: true },
  { email: 'ana@demo.local', password: 'DemoAna123!', uid: 'academic-ana', transferCode: 'ANA-3092', displayName: 'Ana Demo', active: false },
];

export const ACADEMIC_TRANSFER_RECIPIENTS: readonly TransferRecipient[] =
  ACADEMIC_DEMO_USERS.map((user) => ({
    id: user.uid,
    name: user.displayName,
    code: user.transferCode,
    initialLetter: user.displayName.slice(0, 1).toUpperCase(),
    isActive: user.active,
  }));

export function findAcademicUser(email: string): AcademicDemoUser | undefined {
  const normalized = email.trim().toLowerCase();
  return ACADEMIC_DEMO_USERS.find((user) => user.email === normalized);
}
