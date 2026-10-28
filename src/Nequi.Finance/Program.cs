using Nequi.Finance.Analytics;
using Nequi.Finance.Budgets;
using Nequi.Finance.Cash;
using Nequi.Finance.Categories;
using Nequi.Finance.Common;
using Nequi.Finance.Goals;
using Nequi.Finance.Movements;
using Nequi.Shared;
using Nequi.Shared.OpenApi;

// =============================================================================
// NequiTrampa — Nequi.Finance (core-api: Movements · Categories · Budgets · Goals ·
// Analytics · Cash)
// Autenticación/Autorización: Nequi.Shared.Security (JWT + RBAC + deny-by-default)
// Identidad: auth_subject → client_id (ClientIdentityResolver). Nunca se acepta clientId
//            desde el cuerpo o la query.
// Persistencia: Firestore (read models y datos personales). Spanner conserva la autoridad
//            financiera; este servicio no escribe en el ledger ni en WalletBalance.
// Cash:      registro personal declarado, atómico por cliente y desacoplado de la billetera.
// =============================================================================
var builder = WebApplication.CreateBuilder(args);
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

builder.AddNequiCommon();

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = context.ModelState
                .Where(e => e.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(err => err.ErrorMessage).ToArray());

            var problem = new Microsoft.AspNetCore.Mvc.ProblemDetails
            {
                Status = StatusCodes.Status422UnprocessableEntity,
                Title = "Error de validación en los datos de la solicitud",
                Detail = "Uno o más campos incumplen las reglas del contrato.",
                Type = "https://errors.nequitrampa.internal/validation-error",
            };
            problem.Extensions["code"] = "VALIDATION_ERROR";
            problem.Extensions["invalidParams"] = errors;

            return new Microsoft.AspNetCore.Mvc.UnprocessableEntityObjectResult(problem)
            {
                ContentTypes = { "application/problem+json" },
            };
        };
    });

builder.Services.AddSingleton<MovementReader>();
builder.Services.AddSingleton<CategoryService>();
builder.Services.AddSingleton<BudgetService>();
builder.Services.AddSingleton<GoalService>();
builder.Services.AddSingleton<AnalyticsService>();

// Cash keeps its own transactional store per client. Firestore transactions in GCP; a per-client
// lock in memory for development. It never writes to Spanner or the wallet balance.
if (string.Equals(builder.Configuration["Data:Backend"], "gcp", StringComparison.OrdinalIgnoreCase))
{
    builder.Services.AddSingleton<ICashStore, FirestoreCashStore>();
}
else
{
    builder.Services.AddSingleton<ICashStore, InMemoryCashStore>();
}
builder.Services.AddSingleton<CashService>();

builder.AddNequiSwagger("NequiTrampa Finance API",
    "Movimientos proyectados, categorías, presupuestos, metas, analítica y registro de efectivo. " +
    "La autoridad del saldo es Cloud Spanner; Firestore solo almacena proyecciones y datos personales.");

var app = builder.Build();

app.UseNequiSwagger(); // antes de UseNequiCommon: deny-by-default bloquearía la UI
app.UseNequiCommon();

if (app.Environment.IsDevelopment() && string.IsNullOrEmpty(Environment.GetEnvironmentVariable("PORT")))
{
    app.UseHttpsRedirection();
}

app.MapControllers();
app.MapMovements();

app.Run();

public partial class Program { }

namespace Nequi.Finance
{
    /// <summary>Stable marker for <c>WebApplicationFactory</c> (avoids collisions with other Program classes).</summary>
    public sealed class FinanceMarker;
}
