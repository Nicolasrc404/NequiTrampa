using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Nequi.Shared.Security;

namespace Nequi.Tests;

public sealed class BeneficiariesTests : IDisposable
{
    private readonly Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Nequi.Wallet.WalletMarker> _factory = Env.Wallet();

    public void Dispose() => _factory.Dispose();

    private InMemoryClientTransferDirectory Directory =>
        _factory.Services.GetRequiredService<InMemoryClientTransferDirectory>();

    [Fact]
    public async Task Create_WithActiveCode_Returns201_WithoutExposingDestinationIdentity()
    {
        Directory.Register("client-laura", "LAUR-5120");
        using var http = _factory.Client(Phase4.NewClient());

        var response = await http.PostAsync("/v1/beneficiaries",
            Phase4.Json(new { name = "Laura Gómez", transferCode = "LAUR-5120" }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await Phase4.BodyAsync(response);
        Assert.Equal("Laura Gómez", body.GetProperty("name").GetString());
        Assert.Equal("LAUR-5120", body.GetProperty("transferCode").GetString());
        Assert.False(body.TryGetProperty("destinationClientId", out _));
    }

    [Fact]
    public async Task Create_UnknownCode_Returns404()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var response = await http.PostAsync("/v1/beneficiaries",
            Phase4.Json(new { name = "Nadie", transferCode = "NOEX-0001" }));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("BENEFICIARY_CODE_NOT_FOUND", await Phase4.ProblemCodeAsync(response));
    }

    [Fact]
    public async Task Create_OwnCode_Returns422()
    {
        var uid = Phase4.NewClient();
        Directory.Register(uid, "MINE-0001");
        using var http = _factory.Client(uid);

        var response = await http.PostAsync("/v1/beneficiaries",
            Phase4.Json(new { name = "Yo", transferCode = "MINE-0001" }));

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("BENEFICIARY_SELF", await Phase4.ProblemCodeAsync(response));
    }

    [Fact]
    public async Task Create_DuplicateCode_Returns409_CaseInsensitive()
    {
        Directory.Register("client-sofia", "SOFI-3307");
        using var http = _factory.Client(Phase4.NewClient());

        Assert.Equal(HttpStatusCode.Created, (await http.PostAsync("/v1/beneficiaries",
            Phase4.Json(new { name = "Sofía", transferCode = "SOFI-3307" }))).StatusCode);

        var duplicate = await http.PostAsync("/v1/beneficiaries",
            Phase4.Json(new { name = "Otra", transferCode = "sofi-3307" }));

        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal("BENEFICIARY_DUPLICATE", await Phase4.ProblemCodeAsync(duplicate));
    }

    [Fact]
    public async Task Create_InvalidNameOrCodeFormat_Returns422()
    {
        using var http = _factory.Client(Phase4.NewClient());

        var badName = await http.PostAsync("/v1/beneficiaries",
            Phase4.Json(new { name = "X", transferCode = "ABCD-0001" }));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, badName.StatusCode);
        Assert.Equal("VALIDATION_ERROR", await Phase4.ProblemCodeAsync(badName));

        var badCode = await http.PostAsync("/v1/beneficiaries",
            Phase4.Json(new { name = "Laura", transferCode = "bad code!" }));
        Assert.Equal(HttpStatusCode.UnprocessableEntity, badCode.StatusCode);
        Assert.Equal("VALIDATION_ERROR", await Phase4.ProblemCodeAsync(badCode));
    }

    [Fact]
    public async Task ListGetAndDelete_WorkOnlyOnOwnBeneficiaries()
    {
        Directory.Register("client-carlos", "CARL-9941");
        using var http = _factory.Client(Phase4.NewClient());
        var created = await Phase4.BodyAsync(await http.PostAsync("/v1/beneficiaries",
            Phase4.Json(new { name = "Carlos", transferCode = "CARL-9941" })));
        var id = created.GetProperty("id").GetString();

        var list = await Phase4.BodyAsync(await http.GetAsync("/v1/beneficiaries"));
        Assert.Single(list.EnumerateArray());

        Assert.Equal(HttpStatusCode.OK, (await http.GetAsync($"/v1/beneficiaries/{id}")).StatusCode);

        var deleted = await http.DeleteAsync($"/v1/beneficiaries/{id}");
        Assert.Equal(HttpStatusCode.OK, deleted.StatusCode);
        Assert.True((await Phase4.BodyAsync(deleted)).GetProperty("deleted").GetBoolean());

        Assert.Equal(HttpStatusCode.NotFound, (await http.GetAsync($"/v1/beneficiaries/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await http.DeleteAsync($"/v1/beneficiaries/{id}")).StatusCode);

        // The code is released: it can be saved again after deletion.
        Assert.Equal(HttpStatusCode.Created, (await http.PostAsync("/v1/beneficiaries",
            Phase4.Json(new { name = "Carlos", transferCode = "CARL-9941" }))).StatusCode);
    }

    [Fact]
    public async Task CrossClient_CannotReadOrDeleteForeignBeneficiary()
    {
        Directory.Register("client-mama", "MARI-1182");
        using var owner = _factory.Client(Phase4.NewClient());
        using var other = _factory.Client(Phase4.NewClient());
        var created = await Phase4.BodyAsync(await owner.PostAsync("/v1/beneficiaries",
            Phase4.Json(new { name = "Mamá", transferCode = "MARI-1182" })));
        var id = created.GetProperty("id").GetString();

        Assert.Equal(HttpStatusCode.NotFound, (await other.GetAsync($"/v1/beneficiaries/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await other.DeleteAsync($"/v1/beneficiaries/{id}")).StatusCode);

        var otherList = await Phase4.BodyAsync(await other.GetAsync("/v1/beneficiaries"));
        Assert.Equal(0, otherList.GetArrayLength());

        // Still present for its owner.
        Assert.Equal(HttpStatusCode.OK, (await owner.GetAsync($"/v1/beneficiaries/{id}")).StatusCode);
    }

    [Fact]
    public async Task ConcurrentCreate_SameCode_OnlyOneSucceeds()
    {
        Directory.Register("client-laura", "LAUR-5120");
        using var http = _factory.Client(Phase4.NewClient());
        var body = new { name = "Laura", transferCode = "LAUR-5120" };

        var statuses = (await Task.WhenAll(
                Enumerable.Range(0, 2).Select(async _ =>
                {
                    using var response = await http.PostAsync("/v1/beneficiaries", Phase4.Json(body));
                    return response.StatusCode;
                })))
            .OrderBy(s => (int)s)
            .ToList();

        Assert.Equal(new[] { HttpStatusCode.Created, HttpStatusCode.Conflict }, statuses);
    }

    [Fact]
    public async Task Unauthenticated_Returns401_AndStaffReturns403()
    {
        using var anonymous = _factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/v1/beneficiaries")).StatusCode);

        using var staff = _factory.Client("staff-1", "SOPORTE");
        Assert.Equal(HttpStatusCode.Forbidden, (await staff.GetAsync("/v1/beneficiaries")).StatusCode);
    }

    [Fact]
    public async Task Create_WhenPersistenceFails_ReleasesCodeReservation()
    {
        var inner = new Nequi.Shared.Data.InMemoryDocumentStore();
        var store = new FlakyDocumentStore(inner)
        {
            FailCreate = (collection, _) => collection == Nequi.Wallet.Beneficiaries.BeneficiaryCollections.Beneficiaries,
        };
        var directory = new InMemoryClientTransferDirectory();
        directory.Register("client-laura", "LAUR-5120");
        var service = new Nequi.Wallet.Beneficiaries.BeneficiaryService(store, directory);
        var owner = Phase4.NewClient();

        await Assert.ThrowsAsync<IOException>(() => service.CreateAsync(
            owner,
            new Nequi.Wallet.Beneficiaries.CreateBeneficiaryRequest("Laura", "LAUR-5120"),
            CancellationToken.None));

        var keys = await inner.QueryEqualsAsync(
            Nequi.Wallet.Beneficiaries.BeneficiaryCollections.Keys, "clientId", owner, 10, CancellationToken.None);
        Assert.Empty(keys);

        store.FailCreate = null;
        var (outcome, beneficiary) = await service.CreateAsync(
            owner,
            new Nequi.Wallet.Beneficiaries.CreateBeneficiaryRequest("Laura", "LAUR-5120"),
            CancellationToken.None);
        Assert.Equal(Nequi.Wallet.Beneficiaries.BeneficiaryCreateOutcome.Created, outcome);
        Assert.NotNull(beneficiary);
    }
}
