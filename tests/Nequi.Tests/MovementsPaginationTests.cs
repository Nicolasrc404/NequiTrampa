using System.Net;
using System.Text.Json;

namespace Nequi.Tests;

/// <summary>Cursor pagination of GET /v1/movements (occurredAt DESC, eventId ASC tie-break).</summary>
public sealed class MovementsPaginationTests : IDisposable
{
    private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Nequi.Finance.FinanceMarker> _factory = Env.Finance();

    public void Dispose() => _factory.Dispose();

    private static DateTimeOffset At(int minute) =>
        new(2026, 10, 20, 12, minute, 0, TimeSpan.Zero);

    private async Task SeedAsync(string clientId, int count)
    {
        for (var i = 0; i < count; i++)
            await Phase4.SeedMovementAsync(
                _factory.Services, clientId, $"evt-{clientId}-{i:00}",
                amountCents: 1_000 * (i + 1), occurredAt: At(i));
    }

    private static async Task<JsonElement> GetAsync(HttpClient http, string query)
    {
        var response = await http.GetAsync($"/v1/movements?{query}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await Phase4.BodyAsync(response);
    }

    private static string[] EventIds(JsonElement page) =>
        page.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("eventId").GetString() ?? "")
            .ToArray();

    [Fact]
    public async Task FirstPage_ReturnsNewestFirst_AndNextCursor()
    {
        var clientId = Phase4.NewClient();
        await SeedAsync(clientId, 3);
        using var http = _factory.Client("uid-page", "CLIENTE", clientId);

        var page = await GetAsync(http, "limit=2");

        Assert.Equal(2, page.GetProperty("count").GetInt32());
        Assert.Equal(new[] { "evt-" + clientId + "-02", "evt-" + clientId + "-01" }, EventIds(page));
        Assert.False(string.IsNullOrWhiteSpace(page.GetProperty("nextCursor").GetString()));
    }

    [Fact]
    public async Task SecondPage_UsesCursor_WithoutDuplicates()
    {
        var clientId = Phase4.NewClient();
        await SeedAsync(clientId, 3);
        using var http = _factory.Client("uid-page", "CLIENTE", clientId);

        var first = await GetAsync(http, "limit=2");
        var cursor = first.GetProperty("nextCursor").GetString()!;
        var second = await GetAsync(http, $"limit=2&cursor={Uri.EscapeDataString(cursor)}");

        var all = EventIds(first).Concat(EventIds(second)).ToArray();
        Assert.Equal(all.Length, all.Distinct().Count());
        Assert.Equal(new[] { "evt-" + clientId + "-02", "evt-" + clientId + "-01", "evt-" + clientId + "-00" }, all);
        Assert.True(
            second.GetProperty("nextCursor").ValueKind == JsonValueKind.Null,
            "the last page must not return a cursor");
    }

    [Fact]
    public async Task EqualTimestamps_UseEventIdTieBreak_AndDoNotSkipItems()
    {
        var clientId = Phase4.NewClient();
        foreach (var id in new[] { "evt-c", "evt-a", "evt-b" })
            await Phase4.SeedMovementAsync(_factory.Services, clientId, id, 1_000, At(0));
        using var http = _factory.Client("uid-ties", "CLIENTE", clientId);

        var first = await GetAsync(http, "limit=2");
        var cursor = first.GetProperty("nextCursor").GetString()!;
        var second = await GetAsync(http, $"limit=2&cursor={Uri.EscapeDataString(cursor)}");

        var all = EventIds(first).Concat(EventIds(second)).ToArray();
        Assert.Equal(new[] { "evt-a", "evt-b", "evt-c" }, all);
        Assert.Equal(all.Length, all.Distinct().Count());
    }

    [Fact]
    public async Task InvalidLimit_Returns400()
    {
        using var http = _factory.Client("uid-limit", "CLIENTE", Phase4.NewClient());

        var response = await http.GetAsync("/v1/movements?limit=0");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_limit", await Phase4.ProblemCodeAsync(response));
    }

    [Fact]
    public async Task InvalidCursor_Returns400()
    {
        using var http = _factory.Client("uid-cursor", "CLIENTE", Phase4.NewClient());

        var response = await http.GetAsync("/v1/movements?cursor=not-a-cursor");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("invalid_cursor", await Phase4.ProblemCodeAsync(response));
    }

    [Fact]
    public void Cursor_RoundTrips()
    {
        var encoded = Nequi.Finance.Movements.MovementsCursor.Encode("2026-10-20T12:00:00.0000000Z", "evt-1");

        Assert.True(Nequi.Finance.Movements.MovementsCursor.TryDecode(encoded, out var occurredAt, out var eventId));
        Assert.Equal("2026-10-20T12:00:00.0000000Z", occurredAt);
        Assert.Equal("evt-1", eventId);
        Assert.False(Nequi.Finance.Movements.MovementsCursor.TryDecode("%%%", out _, out _));
    }
}
