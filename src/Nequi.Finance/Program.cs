using Nequi.Finance.Movements;
using Nequi.Shared;
using Nequi.Shared.OpenApi;

var builder = WebApplication.CreateBuilder(args);

builder.AddNequiCommon();

builder.Services.AddControllers();
builder.AddNequiSwagger("NequiTrampa Finance API",
    "Consulta de movimientos financieros proyectados en Firestore (lectura; la autoridad del saldo es Spanner).");

var app = builder.Build();

app.UseNequiSwagger(); // antes de UseNequiCommon: deny-by-default bloquearía la UI
app.UseNequiCommon();

app.UseHttpsRedirection();

app.MapControllers();
app.MapMovements();

app.Run();

public partial class Program { }