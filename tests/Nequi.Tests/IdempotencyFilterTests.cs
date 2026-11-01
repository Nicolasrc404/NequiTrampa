using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging.Abstractions;
using Nequi.Shared.Idempotency;

namespace Nequi.Tests;

/// <summary>
/// Garantías de idempotencia en el borde HTTP de los POST financieros: el mismo cuerpo
/// se reproduce sin reejecutar la acción, un cuerpo distinto es 409 y un fallo/resultado
/// incierto (excepción o 5xx) deja el registro IN_PROGRESS para que un reintento no
/// pueda reproducir un éxito fantasma.
/// </summary>
public sealed class IdempotencyFilterTests
{
    private const string Body = """{"amount":1000}""";
    private const string Actor = "uid-1";
    private const string Scope = "POST:/v1/transfers";

    private static string Hash(string body) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body)));

    private static (IdempotencyActionFilter Filter, DefaultHttpContext Http, ActionExecutingContext Context) New(
        string key, IIdempotencyStore store, string body = Body)
    {
        var http = new DefaultHttpContext();
        http.Request.Method = "POST";
        http.Request.Path = "/v1/transfers";
        http.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        http.Request.Headers[IdempotencyFilter.HeaderName] = key;
        http.User = new ClaimsPrincipal(new ClaimsIdentity([new Claim("user_id", Actor)], "demo"));

        var actionContext = new ActionContext(http, new RouteData(), new ActionDescriptor());
        var context = new ActionExecutingContext(actionContext, [], new Dictionary<string, object?>(), new object());
        return (new IdempotencyActionFilter(store, NullLogger<IdempotencyActionFilter>.Instance), http, context);
    }

    private static ActionExecutionDelegate Next(ActionExecutingContext context, Action counter, IActionResult result) =>
        () =>
        {
            counter();
            return Task.FromResult(new ActionExecutedContext(context, [], new object()) { Result = result });
        };

    [Fact]
    public async Task SameKeyAndBody_ReplaysWithoutExecutingTheActionAgain()
    {
        var store = new InMemoryIdempotencyStore();
        var calls = 0;

        var (first, _, firstCtx) = New("key-1", store);
        await first.OnActionExecutionAsync(firstCtx, Next(firstCtx, () => calls++, new OkObjectResult(new { id = "op-1" })));

        var (second, secondHttp, secondCtx) = New("key-1", store);
        await second.OnActionExecutionAsync(secondCtx, Next(secondCtx, () => calls++, new OkObjectResult(new { id = "op-2" })));

        Assert.Equal(1, calls);
        Assert.Equal("true", secondHttp.Response.Headers["Idempotent-Replayed"]);
    }

    [Fact]
    public async Task SameKeyDifferentBody_IsConflictAndDoesNotExecute()
    {
        var store = new InMemoryIdempotencyStore();
        var calls = 0;

        var (first, _, firstCtx) = New("key-2", store);
        await first.OnActionExecutionAsync(firstCtx, Next(firstCtx, () => calls++, new OkObjectResult(new { id = "op-1" })));

        var (second, _, secondCtx) = New("key-2", store, """{"amount":2000}""");
        await second.OnActionExecutionAsync(secondCtx, Next(secondCtx, () => calls++, new OkObjectResult(new { id = "op-2" })));

        Assert.Equal(1, calls);
        Assert.Equal(StatusCodes.Status409Conflict, ((ObjectResult)secondCtx.Result!).StatusCode);
    }

    [Fact]
    public async Task ActionThrows_LeavesRecordInProgress_SoARetryCannotDuplicateTheCharge()
    {
        var store = new InMemoryIdempotencyStore();
        var (filter, _, context) = New("key-3", store);
        var executed = new ActionExecutedContext(context, [], new object())
        {
            Exception = new InvalidOperationException("fallo incierto tras un posible COMMIT"),
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            filter.OnActionExecutionAsync(context, () => Task.FromResult(executed)));

        var (outcome, _) = await store.BeginAsync(Actor, Scope, "key-3", Hash(Body), default);
        Assert.Equal(BeginOutcome.InProgress, outcome);
    }

    [Fact]
    public async Task ServerError_DoesNotCompleteTheRecord()
    {
        var store = new InMemoryIdempotencyStore();
        var (filter, _, context) = New("key-4", store);

        await filter.OnActionExecutionAsync(context, Next(context, () => { }, new ObjectResult(new { error = "unavailable" })
        {
            StatusCode = StatusCodes.Status503ServiceUnavailable,
        }));

        var (outcome, _) = await store.BeginAsync(Actor, Scope, "key-4", Hash(Body), default);
        Assert.Equal(BeginOutcome.InProgress, outcome);
    }

    [Fact]
    public async Task ConcurrentRequestsWithSameKey_OnlyOneExecutesTheAction()
    {
        var store = new InMemoryIdempotencyStore();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var calls = 0;

        var (first, _, firstCtx) = New("key-5", store);
        var running = first.OnActionExecutionAsync(firstCtx, async () =>
        {
            Interlocked.Increment(ref calls);
            entered.TrySetResult();
            await release.Task;
            return new ActionExecutedContext(firstCtx, [], new object()) { Result = new OkObjectResult(new { id = "op-1" }) };
        });

        await entered.Task;

        var (second, _, secondCtx) = New("key-5", store);
        await second.OnActionExecutionAsync(secondCtx, Next(secondCtx, () => Interlocked.Increment(ref calls), new OkObjectResult(new { id = "op-2" })));

        Assert.Equal(1, calls);
        Assert.Equal(StatusCodes.Status409Conflict, ((ObjectResult)secondCtx.Result!).StatusCode);

        release.TrySetResult();
        await running;
    }
}
