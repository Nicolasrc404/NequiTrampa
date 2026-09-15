using ProfileService.Domain.Common;

namespace ProfileService.Domain.Entities;

public class Beneficiary : BaseEntity
{
    public Guid BeneficiaryId { get; private set; }
    public Guid ClientId { get; private set; }
    public Guid TargetClientId { get; private set; }
    public string Alias { get; private set; } = string.Empty;
    public string TargetPhoneNumber { get; private set; } = string.Empty;
    public string TargetName { get; private set; } = string.Empty;

    private Beneficiary() { }

    public static Beneficiary Create(
        Guid beneficiaryId,
        Guid clientId,
        Guid targetClientId,
        string alias,
        string targetPhoneNumber,
        string targetName)
    {
        if (beneficiaryId == Guid.Empty)
            throw new BusinessRuleValidationException("El ID del beneficiario no puede ser vacío.", "INVALID_BENEFICIARY_ID");

        if (clientId == Guid.Empty)
            throw new BusinessRuleValidationException("El ID del cliente propietario es obligatorio.", "REQUIRED_CLIENT_ID");

        if (targetClientId == Guid.Empty)
            throw new BusinessRuleValidationException("El ID del destinatario es obligatorio.", "REQUIRED_TARGET_CLIENT_ID");

        if (clientId == targetClientId)
            throw new BusinessRuleValidationException("Un cliente no puede registrarse a sí mismo como beneficiario.", "CANNOT_ADD_SELF_AS_BENEFICIARY");

        if (string.IsNullOrWhiteSpace(alias))
            throw new BusinessRuleValidationException("El alias o apodo del beneficiario es obligatorio.", "REQUIRED_ALIAS");

        return new Beneficiary
        {
            BeneficiaryId = beneficiaryId,
            ClientId = clientId,
            TargetClientId = targetClientId,
            Alias = alias.Trim(),
            TargetPhoneNumber = targetPhoneNumber.Trim(),
            TargetName = targetName.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public void UpdateAlias(string newAlias)
    {
        if (string.IsNullOrWhiteSpace(newAlias))
            throw new BusinessRuleValidationException("El alias no puede ser vacío.", "REQUIRED_ALIAS");

        Alias = newAlias.Trim();
        UpdatedAt = DateTime.UtcNow;
    }
}
