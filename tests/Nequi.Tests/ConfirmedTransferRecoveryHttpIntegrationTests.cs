using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Nequi.Shared.Data;
using Nequi.Shared.Financial;
using Nequi.Shared.Idempotency;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Services;

namespace Nequi.Tests;

public sealed class ConfirmedTransferRecoveryHttpIntegrationTests
{
    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task HttpRetryAfterCompleteFailureRecoversWithoutSecondFinancialEffect()
    {
        var scenario = await SpannerTransferFinancialIntentEmulatorTests.CreateScenarioAsync();
        await using var host = await CreateHostAsync(scenario);
        using var client = host.GetTestServer().CreateClient();
        var request = new CreateTransferRequestDto("DEST-001", 10m, "http-recovery", "COP");
        using var first = new HttpRequestMessage(HttpMethod.Post, "/v1/transfers")
        {
            Content = JsonContent.Create(request),
        };
        first.Headers.Add("Idempotency-Key", "http-recovery-key");
        first.Headers.Add("X-Test-User", "subject-origin");

        var firstException = await Assert.ThrowsAsync<IOException>(async () =>
        {
            using var ignored = await client.SendAsync(first);
        });
        Assert.Equal("Controlled CompleteAsync failure after financial commit.", firstException.Message);

        Assert.Equal("IN_PROGRESS", await ReadStringAsync(scenario,
            "SELECT status FROM idempotency_records WHERE actor_id=@actor AND scope=@scope AND idempotency_key=@key",
            ("actor", "subject-origin"), ("scope", "POST:/v1/transfers"), ("key", "http-recovery-key")));
        var diagnostics = host.Services.GetRequiredService<RecoveryDiagnostics>();
        Assert.Single(diagnostics.RequestHashes);
        Assert.Equal(diagnostics.RequestHashes[0], await ReadStringAsync(scenario,
            "SELECT request_hash FROM idempotency_records WHERE actor_id=@actor AND scope=@scope AND idempotency_key=@key",
            ("actor", "subject-origin"), ("scope", "POST:/v1/transfers"), ("key", "http-recovery-key")));
        Assert.Equal("CONFIRMED", await ReadStringAsync(scenario,
            "SELECT financial_status FROM financial_intents WHERE domain_actor_id=@actor AND operation_type='TRANSFER' AND scope='POST:/v1/transfers' AND idempotency_key=@key",
            ("actor", "client-origin"), ("key", "http-recovery-key")));
        var confirmedOperationId = await ReadStringAsync(scenario,
            "SELECT operation_id FROM financial_intents WHERE domain_actor_id=@actor AND operation_type='TRANSFER' AND scope='POST:/v1/transfers' AND idempotency_key=@key",
            ("actor", "client-origin"), ("key", "http-recovery-key"));
        Assert.NotNull(confirmedOperationId);
        Assert.Equal(confirmedOperationId, await ReadStringAsync(scenario,
            "SELECT operation_id FROM ledger_operations WHERE operation_id=@operation",
            ("operation", confirmedOperationId!)));
        Assert.Equal(1, await CountAsync(scenario, "ledger_operations"));
        Assert.Equal(9000, await ReadBalanceAsync(scenario, "account-origin"));
        Assert.Equal(1000, await ReadBalanceAsync(scenario, "account-dest"));

        using var retry = new HttpRequestMessage(HttpMethod.Post, "/v1/transfers")
        {
            Content = JsonContent.Create(request),
        };
        retry.Headers.Add("Idempotency-Key", "http-recovery-key");
        retry.Headers.Add("X-Test-User", "subject-origin");

        using var recovered = await client.SendAsync(retry);
        var recoveredBody = await recovered.Content.ReadAsStringAsync();
        Assert.True(recovered.StatusCode == HttpStatusCode.OK,
            $"Recovery returned {(int)recovered.StatusCode}: {recoveredBody}; " +
            $"handlerInvocations={diagnostics.HandlerInvocations}; " +
            $"recoveryKind={diagnostics.LastRecoveryResult?.Kind}; " +
            $"recoveryCode={diagnostics.LastRecoveryResult?.Code}");
        Assert.Equal(2, diagnostics.RequestHashes.Count);
        Assert.Equal(diagnostics.RequestHashes[0], diagnostics.RequestHashes[1]);
        Assert.Equal("true", recovered.Headers.GetValues("Idempotent-Recovered").Single());
        var response = await recovered.Content.ReadFromJsonAsync<TransferResponseDto>();
        Assert.NotNull(response);
        Assert.Equal(1, await CountAsync(scenario, "ledger_operations"));
        Assert.Equal(2, await CountAsync(scenario, "ledger_entries"));
        Assert.Equal(2, await CountAsync(scenario, "outbox_events"));
        Assert.Equal(9000, await ReadBalanceAsync(scenario, "account-origin"));
        Assert.Equal(1000, await ReadBalanceAsync(scenario, "account-dest"));
        Assert.Equal(1, host.Services.GetRequiredService<InvocationCounter>().Count);
        Assert.Equal(1, diagnostics.HandlerInvocations);
    }

    [SpannerEmulatorPersistenceFact]
    [Trait("Category", "SpannerEmulatorPersistence")]
    public async Task HttpRetryWithDifferentBodyReturnsConflictWithoutExecutingAction()
    {
        var scenario = await SpannerTransferFinancialIntentEmulatorTests.CreateScenarioAsync();
        await using var host = await CreateHostAsync(scenario);
        using var client = host.GetTestServer().CreateClient();

        var firstException = await Assert.ThrowsAsync<IOException>(async () =>
        {
            using var ignored = await SendAsync(client, "subject-origin", "http-conflict-key",
                new CreateTransferRequestDto("DEST-001", 10m, "original", "COP"));
        });
        Assert.Equal("Controlled CompleteAsync failure after financial commit.", firstException.Message);
        Assert.Equal("IN_PROGRESS", await ReadStringAsync(scenario,
            "SELECT status FROM idempotency_records WHERE actor_id=@actor AND scope=@scope AND idempotency_key=@key",
            ("actor", "subject-origin"), ("scope", "POST:/v1/transfers"), ("key", "http-conflict-key")));
        var diagnostics = host.Services.GetRequiredService<RecoveryDiagnostics>();
        Assert.Single(diagnostics.RequestHashes);
        Assert.Equal("CONFIRMED", await ReadStringAsync(scenario,
            "SELECT financial_status FROM financial_intents WHERE domain_actor_id=@actor AND operation_type='TRANSFER' AND scope='POST:/v1/transfers' AND idempotency_key=@key",
            ("actor", "client-origin"), ("key", "http-conflict-key")));
        Assert.Equal(1, await CountAsync(scenario, "ledger_operations"));
        Assert.Equal(9000, await ReadBalanceAsync(scenario, "account-origin"));
        Assert.Equal(1000, await ReadBalanceAsync(scenario, "account-dest"));

        var conflict = await SendAsync(client, "subject-origin", "http-conflict-key",
            new CreateTransferRequestDto("DEST-001", 11m, "different", "COP"));
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
        Assert.Equal(2, diagnostics.RequestHashes.Count);
        Assert.NotEqual(diagnostics.RequestHashes[0], diagnostics.RequestHashes[1]);
        Assert.Equal(1, host.Services.GetRequiredService<InvocationCounter>().Count);
        Assert.Equal(1, await CountAsync(scenario, "ledger_operations"));
    }

    private static async Task<HttpResponseMessage> SendAsync(
        HttpClient client,
        string actor,
        string key,
        CreateTransferRequestDto request)
    {
        using var message = new HttpRequestMessage(HttpMethod.Post, "/v1/transfers")
        {
            Content = JsonContent.Create(request),
        };
        message.Headers.Add("Idempotency-Key", key);
        message.Headers.Add("X-Test-User", actor);
        return await client.SendAsync(message);
    }

    private static async Task<WebApplication> CreateHostAsync(
        SpannerTransferFinancialIntentEmulatorTests.Scenario scenario)
    {
        var configuration = scenario.Configuration;
        var connectionFactory = () => new Google.Cloud.Spanner.Data.SpannerConnection(
            SpannerEmulatorConnectionFactory.CreateBuilder(configuration));
        var intentStore = new SpannerFinancialIntentStore(connectionFactory);
        var identityResolver = new SpannerFinancialIdentityResolver();
        var recovery = new ConfirmedTransferRecoveryService(connectionFactory, intentStore, identityResolver);
        var idempotency = new ThrowOnceCompleteStore(new SpannerIdempotencyStore(connectionFactory));

        var builder = WebApplication.CreateBuilder();
        builder.WebHost.UseTestServer();
        builder.Services.AddLogging();
        builder.Services.AddSingleton(scenario.Service);
        builder.Services.AddSingleton(scenario.Coordinator);
        builder.Services.AddSingleton<InvocationCounter>();
        builder.Services.AddSingleton<IIdempotencyStore>(idempotency);
        builder.Services.AddSingleton<IFinancialIntentStore>(intentStore);
        builder.Services.AddSingleton<IFinancialIdentityResolver>(identityResolver);
        builder.Services.AddSingleton<RecoveryDiagnostics>();
        builder.Services.AddSingleton<IConfirmedTransferRecoveryService>(sp =>
            new RecordingRecoveryService(recovery, sp.GetRequiredService<RecoveryDiagnostics>()));
        builder.Services.AddSingleton<IIdempotencyRecoveryHandler>(sp =>
            new RecordingRecoveryHandler(
                new ConfirmedTransferIdempotencyRecoveryHandler(
                    sp.GetRequiredService<IConfirmedTransferRecoveryService>()),
                sp.GetRequiredService<RecoveryDiagnostics>()));
        builder.Services.AddTransient<Nequi.Shared.Idempotency.IdempotencyActionFilter>(sp =>
            new Nequi.Shared.Idempotency.IdempotencyActionFilter(
                sp.GetRequiredService<IIdempotencyStore>(),
                NullLogger<Nequi.Shared.Idempotency.IdempotencyActionFilter>.Instance,
                sp.GetRequiredService<IIdempotencyRecoveryHandler>()));
        builder.Services.AddControllers()
            .AddApplicationPart(typeof(RecoveryPipelineTransferController).Assembly);

        var app = builder.Build();
        app.Use(async (context, next) =>
        {
            context.Request.EnableBuffering();
            using var body = new MemoryStream();
            await context.Request.Body.CopyToAsync(body, context.RequestAborted);
            context.Request.Body.Position = 0;
            context.RequestServices.GetRequiredService<RecoveryDiagnostics>()
                .RequestHashes.Add(IdempotencyRequestHash.Compute(body.ToArray()));

            var actor = context.Request.Headers["X-Test-User"].FirstOrDefault() ?? "subject-origin";
            context.User = new ClaimsPrincipal(new ClaimsIdentity(
                [new Claim("user_id", actor)], "test"));
            await next();
        });
        app.MapControllers();
        await app.StartAsync();
        return app;
    }

    private static async Task<long> CountAsync(
        SpannerTransferFinancialIntentEmulatorTests.Scenario scenario,
        string table)
    {
        await using var connection = new Google.Cloud.Spanner.Data.SpannerConnection(
            SpannerEmulatorConnectionFactory.CreateBuilder(scenario.Configuration));
        await connection.OpenAsync();
        await using var command = connection.CreateSelectCommand($"SELECT COUNT(*) FROM {table}");
        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();
        return reader.GetInt64(0);
    }

    private static async Task<long> ReadBalanceAsync(
        SpannerTransferFinancialIntentEmulatorTests.Scenario scenario,
        string accountId)
    {
        await using var connection = new Google.Cloud.Spanner.Data.SpannerConnection(
            SpannerEmulatorConnectionFactory.CreateBuilder(scenario.Configuration));
        await connection.OpenAsync();
        await using var command = connection.CreateSelectCommand(
            "SELECT current_balance_minor FROM wallet_accounts WHERE account_id=@id");
        command.Parameters.Add("id", Google.Cloud.Spanner.Data.SpannerDbType.String, accountId);
        await using var reader = await command.ExecuteReaderAsync();
        await reader.ReadAsync();
        return (long)reader.GetNumeric(0);
    }

    private static async Task<string?> ReadStringAsync(
        SpannerTransferFinancialIntentEmulatorTests.Scenario scenario,
        string sql,
        params (string Name, string Value)[] parameters)
    {
        await using var connection = new Google.Cloud.Spanner.Data.SpannerConnection(
            SpannerEmulatorConnectionFactory.CreateBuilder(scenario.Configuration));
        await connection.OpenAsync();
        await using var command = connection.CreateSelectCommand(sql);
        foreach (var (name, value) in parameters)
            command.Parameters.Add(name, Google.Cloud.Spanner.Data.SpannerDbType.String, value);
        await using var reader = await command.ExecuteReaderAsync();
        return await reader.ReadAsync() && !reader.IsDBNull(0) ? reader.GetString(0) : null;
    }
}

public sealed class InvocationCounter
{
    public int Count { get; private set; }
    public void Increment() => Count++;
}

public sealed class RecoveryDiagnostics
{
    public int HandlerInvocations { get; set; }
    public List<string> RequestHashes { get; } = [];
    public TransferRecoveryResult? LastRecoveryResult { get; set; }
}

internal sealed class RecordingRecoveryService(
    IConfirmedTransferRecoveryService inner,
    RecoveryDiagnostics diagnostics) : IConfirmedTransferRecoveryService
{
    public async Task<TransferRecoveryResult> RecoverAsync(
        string authenticatedActorId,
        string idempotencyKey,
        string requestHash,
        CreateTransferRequestDto request,
        CancellationToken ct)
    {
        var result = await inner.RecoverAsync(
            authenticatedActorId, idempotencyKey, requestHash, request, ct);
        diagnostics.LastRecoveryResult = result;
        return result;
    }
}

internal sealed class RecordingRecoveryHandler(
    IIdempotencyRecoveryHandler inner,
    RecoveryDiagnostics diagnostics) : IIdempotencyRecoveryHandler
{
    public async Task<IdempotencyRecoveryResponse?> TryRecoverAsync(
        HttpContext http,
        string actorId,
        string scope,
        string idempotencyKey,
        string requestHash,
        CancellationToken ct)
    {
        diagnostics.HandlerInvocations++;
        return await inner.TryRecoverAsync(http, actorId, scope, idempotencyKey, requestHash, ct);
    }
}

internal sealed class ThrowOnceCompleteStore(IIdempotencyStore inner) : IIdempotencyStore
{
    private int _hasThrown;

    public Task<(BeginOutcome Outcome, IdempotencyRecord? Record)> BeginAsync(
        string actorId, string scope, string key, string requestHash, CancellationToken ct) =>
        inner.BeginAsync(actorId, scope, key, requestHash, ct);

    public Task CompleteAsync(
        string actorId, string scope, string key, int statusCode,
        string? body, string? contentType, CancellationToken ct)
    {
        if (Interlocked.Exchange(ref _hasThrown, 1) == 0)
            throw new IOException("Controlled CompleteAsync failure after financial commit.");
        return inner.CompleteAsync(actorId, scope, key, statusCode, body, contentType, ct);
    }

    public Task AbandonAsync(string actorId, string scope, string key, CancellationToken ct) =>
        inner.AbandonAsync(actorId, scope, key, ct);

    public Task<IReadOnlyList<IdempotencyRecord>> FindStaleInProgressAsync(
        TimeSpan olderThan, int limit, CancellationToken ct) =>
        inner.FindStaleInProgressAsync(olderThan, limit, ct);
}

[ApiController]
[Route("v1/transfers")]
public sealed class RecoveryPipelineTransferController(
    SpannerTransferService service,
    SpannerFinancialIntentCoordinator coordinator,
    InvocationCounter counter) : ControllerBase
{
    [HttpPost]
    [ServiceFilter(typeof(Nequi.Shared.Idempotency.IdempotencyActionFilter))]
    public async Task<IActionResult> Create(
        [FromHeader(Name = "Idempotency-Key")] string key,
        [FromBody] CreateTransferRequestDto request,
        CancellationToken ct)
    {
        counter.Increment();
        Request.EnableBuffering();
        Request.Body.Position = 0;
        using var body = new MemoryStream();
        await Request.Body.CopyToAsync(body, ct);
        Request.Body.Position = 0;
        var hash = IdempotencyRequestHash.Compute(body.ToArray());
        var actor = User.FindFirst("user_id")?.Value ?? "";
        var result = await service.CreateTransferWithFinancialIntentAsync(
            coordinator, actor, key, hash, request, ct);
        if (result.Result.Kind != FinancialIntentResultKind.Confirmed || result.Value is null)
            return Conflict(new { code = result.Result.ErrorCode ?? result.Result.Kind.ToString() });
        return result.EffectExecuted ? StatusCode(StatusCodes.Status201Created, result.Value) : Ok(result.Value);
    }
}
