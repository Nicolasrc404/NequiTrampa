// ============================================================
// Beneficiarios: DTO de API → view model
// ============================================================
// `BeneficiaryDto` solo contiene el alias elegido por el propietario y el
// código público de transferencia. No existe verificación bancaria: la UI no
// debe presentar el beneficiario como "cuenta verificada".

import type { BeneficiaryDto } from '../beneficiariesService';
import type { BeneficiaryItem } from '../../types/beneficiaries';

/** Primera letra imprimible del alias, en mayúscula. */
export function beneficiaryInitial(name: string): string {
  const trimmed = (name ?? '').trim();
  return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : '?';
}

export function mapBeneficiary(dto: BeneficiaryDto): BeneficiaryItem {
  return {
    id: dto.id,
    name: dto.name,
    code: dto.transferCode,
    initialLetter: beneficiaryInitial(dto.name),
  };
}

export function mapBeneficiaries(
  dtos: readonly BeneficiaryDto[],
): readonly BeneficiaryItem[] {
  return dtos.map(mapBeneficiary);
}
