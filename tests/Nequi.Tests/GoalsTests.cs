using System.Net;
using Nequi.Finance.Goals;
using Nequi.Shared.Data;

namespace Nequi.Tests;

public sealed class GoalsTests : IDisposable
{
    private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Nequi.Finance.FinanceMarker> _factory = Env.Finance();

    public void Dispose() => _factory.Dispose();

    private static object Draft(string name = "Viaje a Cartagena", string date = "2027-12-31", long target = 30_000_000) =>
        new { name, targetCents = target, targetDate = date };

    [Fact]
    public async Task Create_ValidGoal_StartsAtZeroSaved()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var response = await http.PostAsync("/v1/goals", Phase4.Json(Draft()));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Phase4.BodyAsync(response);
        Assert.Equal("Viaje a Cartagena", body.GetProperty("name").GetString());
        Assert.Equal(0, body.GetProperty("savedCents").GetInt64());
        Assert.Equal(0, body.GetProperty("percent").GetInt32());
        Assert.False(body.GetProperty("isAchieved").GetBoolean());
        Assert.Equal("2027-12-31", body.GetProperty("targetDate").GetString());
    }

    [Fact]
    public async Task Create_DuplicateName_Returns409()
    {
        using var http = _factory.Client(Phase4.NewClient());

        Assert.Equal(HttpStatusCode.Created,
            (await http.PostAsync("/v1/goals", Phase4.Json(Draft()))).StatusCode);

        var duplicate = await http.PostAsync("/v1/goals", Phase4.Json(Draft("viaje a cartagena")));

        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal("GOAL_DUPLICATE", await Phase4.ProblemCodeAsync(duplicate));
    }

    [Fact]
    public async Task Create_PastDate_Returns422_AndInvalidNameReturns422()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var past = await http.PostAsync("/v1/goals",
            Phase4.Json(Draft(date: "2020-01-01")));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, past.StatusCode);
        Assert.Equal("INVALID_TARGET_DATE", await Phase4.ProblemCodeAsync(past));

        var shortName = await http.PostAsync("/v1/goals",
            Phase4.Json(Draft(name: "X")));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, shortName.StatusCode);
        Assert.Equal("VALIDATION_ERROR", await Phase4.ProblemCodeAsync(shortName));
    }

    [Fact]
    public async Task Update_SavedCents_ComputesPercentageAndCapsVisualAt100()
    {
        using var http = _factory.Client(Phase4.NewClient());
        var created = await Phase4.BodyAsync(await http.PostAsync("/v1/goals", Phase4.Json(Draft(target: 100_000))));
        var id = created.GetProperty("id").GetString();

        var half = await http.PatchAsync($"/v1/goals/{id}", Phase4.Json(new { savedCents = 50_000 }));
        Assert.Equal(HttpStatusCode.OK, half.StatusCode);
        var halfBody = await Phase4.BodyAsync(half);
        Assert.Equal(50, halfBody.GetProperty("percent").GetInt32());
        Assert.False(halfBody.GetProperty("isAchieved").GetBoolean());

        var over = await http.PatchAsync($"/v1/goals/{id}", Phase4.Json(new { savedCents = 250_000 }));
        var overBody = await Phase4.BodyAsync(over);
        Assert.Equal(100, overBody.GetProperty("percent").GetInt32());
        Assert.True(overBody.GetProperty("isAchieved").GetBoolean());
        Assert.Equal(250_000, overBody.GetProperty("savedCents").GetInt64());
    }

    [Fact]
    public async Task Update_EmptyBody_Returns422()
    {
        using var http = _factory.Client(Phase4.NewClient());
        var created = await Phase4.BodyAsync(await http.PostAsync("/v1/goals", Phase4.Json(Draft())));
        var id = created.GetProperty("id").GetString();

        var response = await http.PatchAsync($"/v1/goals/{id}", Phase4.Json(new { }));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task CrossClient_GoalAccess_Returns404()
    {
        using var owner = _factory.Client(Phase4.NewClient());
        using var other = _factory.Client(Phase4.NewClient());
        var created = await Phase4.BodyAsync(await owner.PostAsync("/v1/goals", Phase4.Json(Draft())));
        var id = created.GetProperty("id").GetString();

        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/v1/goals/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound,
            (await other.PatchAsync($"/v1/goals/{id}", Phase4.Json(new { savedCents = 1 }))).StatusCode);

        var list = await Phase4.BodyAsync(await other.GetAsync("/v1/goals"));
        Assert.DoesNotContain(list.EnumerateArray(), g => g.GetProperty("id").GetString() == id);
    }

    [Fact]
    public async Task ConcurrentCreate_SameName_OnlyOneSucceeds()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var statuses = (await Task.WhenAll(
                Enumerable.Range(0, 2).Select(async _ =>
                {
                    using var response = await http.PostAsync("/v1/goals", Phase4.Json(Draft()));
                    return response.StatusCode;
                })))
            .OrderBy(s => (int)s)
            .ToList();

        Assert.Equal(new[] { HttpStatusCode.Created, HttpStatusCode.Conflict }, statuses);
    }

    [Fact]
    public async Task Create_WhileAnotherRequestIsWriting_DoesNotStealNameReservation()
    {
        var inner = new InMemoryDocumentStore();
        var writing = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var store = new FlakyDocumentStore(inner)
        {
            BeforeCreateAsync = async (collection, _, _) =>
            {
                if (collection != GoalCollections.Goals) return;
                writing.TrySetResult();
                await release.Task;
            },
        };
        var service = new GoalService(store);
        var owner = Phase4.NewClient();
        var request = new CreateGoalRequest("Viaje a Cartagena", 30_000_000, "2027-12-31");

        var first = service.CreateAsync(owner, request, CancellationToken.None);
        await writing.Task.WaitAsync(TimeSpan.FromSeconds(5));

        var second = await service.CreateAsync(owner, request, CancellationToken.None);
        Assert.Equal(GoalCreateOutcome.Duplicate, second.Outcome);

        release.TrySetResult();
        Assert.Equal(GoalCreateOutcome.Created, (await first).Outcome);

        var goals = await service.ListAsync(owner, CancellationToken.None);
        Assert.Single(goals, g => g.Name == "Viaje a Cartagena");
    }

    [Fact]
    public async Task Unauthenticated_Returns401_AndStaffReturns403()
    {
        using var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/v1/goals")).StatusCode);

        using var staff = _factory.Client("staff-1", "OPERADOR_FINANCIERO");
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.GetAsync("/v1/goals")).StatusCode);
    }
}
