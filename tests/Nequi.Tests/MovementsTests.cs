using System.Net;
using System.Text.Json;

namespace Nequi.Tests;

public sealed class MovementsTests : IDisposable
{
    private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Nequi.Finance.FinanceMarker> _factory = Env.Finance();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task List_Empty_ReturnsEmptyArrayAndNoCursor()
    {
        var clientId = Phase4.NewClient();
        using var http = _factory.Client(clientId);

        var response = await http.GetAsync("/v1/movements");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await Phase4.BodyAsync(response);
        Assert.Equal(0, body.GetProperty("count").GetInt32());
        Assert.Equal(JsonValueKind.Array, body.GetProperty("items").ValueKind);
        Assert.Equal(JsonValueKind.Null, body.GetProperty("nextCursor").ValueKind);
    }

    [Fact]
    public async Task List_MultiplePages_CursorCoversAllRowsExactlyOnceInOrder()
    {
        var clientId = Phase4.NewClient();
        var baseTime = DateTimeOffset.Parse("2026-01-01T00:00:00Z");

        // 5 movements, newest first once sorted: event-4 .. event-0.
        for (var i = 0; i < 5; i++)
            await Phase4.SeedMovementAsync(_factory.Services, clientId, $"event-{i}", 1_000 * (i + 1), baseTime.AddMinutes(i));

        using var http = _factory.Client(clientId);

        var seen = new List<string>();
        string? cursor = null;
        for (var page = 0; page < 10 && (page == 0 || cursor is not null); page++)
        {
            var url = cursor is null ? "/v1/movements?limit=2" : $"/v1/movements?limit=2&cursor={Uri.EscapeDataString(cursor)}";
            var response = await http.GetAsync(url);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var body = await Phase4.BodyAsync(response);
            seen.AddRange(body.GetProperty("items").EnumerateArray().Select(i => i.GetProperty("eventId").GetString()!));
            cursor = body.GetProperty("nextCursor").ValueKind == JsonValueKind.Null
                ? null
                : body.GetProperty("nextCursor").GetString();

            if (cursor is null) break;
        }

        Assert.Equal(["event-4", "event-3", "event-2", "event-1", "event-0"], seen);
    }

    [Fact]
    public async Task List_SameOccurredAt_TieBreaksByEventIdWithoutSkippingOrDuplicating()
    {
        var clientId = Phase4.NewClient();
        var sameInstant = DateTimeOffset.Parse("2026-02-01T00:00:00Z");

        await Phase4.SeedMovementAsync(_factory.Services, clientId, "tie-a", 1_000, sameInstant);
        await Phase4.SeedMovementAsync(_factory.Services, clientId, "tie-b", 2_000, sameInstant);

        using var http = _factory.Client(clientId);

        var first = await Phase4.BodyAsync(await http.GetAsync("/v1/movements?limit=1"));
        var firstEventId = first.GetProperty("items")[0].GetProperty("eventId").GetString();
        var cursor = first.GetProperty("nextCursor").GetString();
        Assert.NotNull(cursor);

        var second = await Phase4.BodyAsync(await http.GetAsync($"/v1/movements?limit=1&cursor={Uri.EscapeDataString(cursor!)}"));
        var secondEventId = second.GetProperty("items")[0].GetProperty("eventId").GetString();

        Assert.NotEqual(firstEventId, secondEventId);
        Assert.Equal(["tie-a", "tie-b"], new[] { firstEventId, secondEventId }.OrderBy(x => x));
        Assert.Equal(JsonValueKind.Null, second.GetProperty("nextCursor").ValueKind);
    }

    [Fact]
    public async Task List_InvalidCursor_Returns400()
    {
        var clientId = Phase4.NewClient();
        using var http = _factory.Client(clientId);

        var response = await http.GetAsync("/v1/movements?cursor=not-valid-base64!!");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_cursor", await Phase4.ProblemCodeAsync(response));
    }
}
