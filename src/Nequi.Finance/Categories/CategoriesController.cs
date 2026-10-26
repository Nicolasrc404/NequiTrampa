using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nequi.Finance.Common;
using Nequi.Shared.Http;
using Nequi.Shared.Security;

namespace Nequi.Finance.Categories;

/// <summary>
/// Catálogo de categorías del cliente autenticado. El propietario siempre se resuelve desde
/// la identidad (auth_subject → client_id); nunca se acepta un clientId de la petición.
/// </summary>
[ApiController]
[Route("v1/categories")]
[Authorize(Policy = Policies.Client)]
[Produces("application/json")]
public sealed class CategoriesController(
    CategoryService service, ClientIdentityResolver identities) : ControllerBase
{
    /// <summary>Lista las categorías propias y las del catálogo del sistema (activas por defecto).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CategoryDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> List([FromQuery] bool includeInactive, CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        return Ok(await service.ListAsync(owner, includeInactive, ct));
    }

    /// <summary>Crea una categoría personal. Nombre único por propietario y tipo (409 si existe).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Create([FromBody] CreateCategoryRequest request, CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var (outcome, category) = await service.CreateAsync(owner, request, ct);
        return outcome switch
        {
            CategoryCreateOutcome.Created => Created($"/v1/categories/{category!.Id}", category),
            CategoryCreateOutcome.InvalidName => this.ProblemJson(
                422, "Invalid category name", "The name must contain 2-40 printable characters.", "VALIDATION_ERROR"),
            _ => this.ProblemJson(
                409, "Category already exists",
                "You already have an active category with this name and type.",
                "CATEGORY_DUPLICATE"),
        };
    }

    /// <summary>Edita el nombre de una categoría propia. El tipo es inmutable (422).</summary>
    [HttpPatch("{id}")]
    [ProducesResponseType(typeof(CategoryDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateCategoryRequest request, CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var (outcome, category) = await service.UpdateAsync(owner, id, request, ct);
        return outcome switch
        {
            CategoryUpdateOutcome.Updated => Ok(category),
            CategoryUpdateOutcome.NotFound => this.ProblemJson(
                404, "Category not found", "No category with this id belongs to you.", "CATEGORY_NOT_FOUND"),
            CategoryUpdateOutcome.ForbiddenSystem => this.ProblemJson(
                403, "Forbidden", "System categories cannot be modified.", "SYSTEM_CATEGORY_IMMUTABLE"),
            CategoryUpdateOutcome.TypeImmutable => this.ProblemJson(
                422, "Category type is immutable",
                "Changing the type would reclassify historical movements; create a new category instead.",
                "CATEGORY_TYPE_IMMUTABLE"),
            CategoryUpdateOutcome.Duplicate => this.ProblemJson(
                409, "Category already exists",
                "You already have an active category with this name and type.",
                "CATEGORY_DUPLICATE"),
            CategoryUpdateOutcome.NothingToUpdate => this.ProblemJson(
                422, "Nothing to update", "Send 'name' and/or 'type'.", "VALIDATION_ERROR"),
            _ => this.ProblemJson(
                422, "Invalid category name", "The name must contain 2-40 printable characters.", "VALIDATION_ERROR"),
        };
    }

    /// <summary>
    /// Desactiva (soft delete) una categoría propia. No borra movimientos ni presupuestos
    /// históricos: solo deja de ofrecerse para nuevas clasificaciones.
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var owner = await FinanceOwner.ResolveAsync(User, identities, ct);
        if (owner is null)
            return this.ProblemJson(403, "Forbidden", "No linked client context for this identity.", "client_context_unresolved");

        var outcome = await service.DeactivateAsync(owner, id, ct);
        return outcome switch
        {
            CategoryDeleteOutcome.Deactivated => NoContent(),
            CategoryDeleteOutcome.ForbiddenSystem => this.ProblemJson(
                403, "Forbidden", "System categories cannot be deleted.", "SYSTEM_CATEGORY_IMMUTABLE"),
            _ => this.ProblemJson(
                404, "Category not found", "No category with this id belongs to you.", "CATEGORY_NOT_FOUND"),
        };
    }
}
