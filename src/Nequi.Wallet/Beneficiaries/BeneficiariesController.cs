using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Shared.Http;
using Nequi.Shared.Security;
using Nequi.Wallet.Security;

namespace Nequi.Wallet.Beneficiaries;

/// <summary>
/// Beneficiarios frecuentes del cliente autenticado. El propietario se resuelve siempre desde la
/// identidad (auth_subject → client_id). Eliminar un beneficiario nunca elimina dinero ni
/// historial financiero.
/// </summary>
[ApiController]
[Route("v1/beneficiaries")]
[Authorize(Policy = Policies.Client)]
[Produces("application/json")]
public sealed class BeneficiariesController(
    BeneficiaryService service, ClientIdentityResolver identities) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<BeneficiaryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var owner = await WalletOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        return Ok(await service.ListAsync(owner, ct));
    }

    [HttpGet("{id}")]
    [ProducesResponseType(typeof(BeneficiaryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(string id, CancellationToken ct)
    {
        var owner = await WalletOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var beneficiary = await service.GetAsync(owner, id, ct);
        return beneficiary is null
            ? this.ProblemJson(404, "Beneficiary not found",
                "No beneficiary with this id belongs to you.", "BENEFICIARY_NOT_FOUND")
            : Ok(beneficiary);
    }

    /// <summary>
    /// Agrega un beneficiario validando que el código público exista y esté ACTIVE y que no sea
    /// el propio cliente. No realiza verificación bancaria externa ni ejecuta dinero.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(BeneficiaryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create(
        [FromBody] CreateBeneficiaryRequest request, CancellationToken ct)
    {
        var owner = await WalletOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var (outcome, beneficiary) = await service.CreateAsync(owner, request, ct);
        return outcome switch
        {
            BeneficiaryCreateOutcome.Created => Created(
                $"/v1/beneficiaries/{beneficiary!.Id}", beneficiary),
            BeneficiaryCreateOutcome.Duplicate => this.ProblemJson(
                409, "Beneficiary already exists",
                "You already have this transfer code saved as a beneficiary.", "BENEFICIARY_DUPLICATE"),
            BeneficiaryCreateOutcome.DestinationNotFound => this.ProblemJson(
                404, "Transfer code not found",
                "The transfer code does not belong to an active client of the platform.",
                "BENEFICIARY_CODE_NOT_FOUND"),
            BeneficiaryCreateOutcome.CannotAddSelf => this.ProblemJson(
                422, "Cannot add yourself",
                "You cannot save your own transfer code as a beneficiary.", "BENEFICIARY_SELF"),
            BeneficiaryCreateOutcome.InvalidCode => this.ProblemJson(
                422, "Invalid transfer code",
                "The transfer code must contain 1-20 alphanumeric, dash or underscore characters.",
                "VALIDATION_ERROR"),
            _ => this.ProblemJson(
                422, "Invalid beneficiary name",
                "The name must contain 2-60 printable characters.", "VALIDATION_ERROR"),
        };
    }

    /// <summary>Elimina el beneficiario propio. No afecta saldos ni movimientos financieros.</summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(typeof(BeneficiaryDeletedDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var owner = await WalletOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var outcome = await service.DeleteAsync(owner, id, ct);
        return outcome == BeneficiaryDeleteOutcome.Deleted
            ? Ok(new BeneficiaryDeletedDto(id, true))
            : this.ProblemJson(404, "Beneficiary not found",
                "No beneficiary with this id belongs to you.", "BENEFICIARY_NOT_FOUND");
    }
}
