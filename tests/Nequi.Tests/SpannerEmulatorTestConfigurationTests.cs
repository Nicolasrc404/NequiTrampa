namespace Nequi.Tests;

public sealed class SpannerEmulatorTestConfigurationTests
{
    private const string RunId = "run123456";

    [Fact]
    public void MissingEmulatorHost_IsRejected()
    {
        Assert.Throws<InvalidOperationException>(() => CreateEnvironment());
    }

    [Theory]
    [InlineData("spanner.example.com:9010")]
    [InlineData("192.168.1.20:9010")]
    [InlineData("8.8.8.8:9010")]
    [InlineData("projects/demo/instances/test/databases/test")]
    [InlineData("localhost:9010/path")]
    [InlineData("localhost:9010?x=1")]
    public void NonLoopbackOrAmbiguousHost_IsRejected(string host)
    {
        Assert.Throws<ArgumentException>(() => CreateEnvironment(host));
    }

    [Theory]
    [InlineData("localhost")]
    [InlineData("localhost:0")]
    [InlineData("localhost:65536")]
    [InlineData("localhost:abc")]
    [InlineData("localhost:9010:extra")]
    [InlineData("http://localhost:9010")]
    public void MissingOrInvalidPort_IsRejected(string host)
    {
        Assert.Throws<ArgumentException>(() => CreateEnvironment(host));
    }

    [Fact]
    public void CloudCredentials_AreRejectedEvenWhenEmulatorHostIsLocal()
    {
        var environment = new Dictionary<string, string?>
        {
            ["SPANNER_EMULATOR_HOST"] = "localhost:9010",
            ["GOOGLE_APPLICATION_CREDENTIALS"] = "C:\\credentials.json",
        };

        Assert.Throws<InvalidOperationException>(() => CreateConfiguration(environment));
    }

    [Theory]
    [InlineData("production-project", "test-run123456-instance", "test-run123456-database")]
    [InlineData("test-run123456-project", "production-instance", "test-run123456-database")]
    [InlineData("test-run123456-project", "test-run123456-instance", "production-database")]
    [InlineData("test-run123456-project", "test-run123456-project", "test-run123456-database")]
    public void NonExclusiveOrNonTestIdentifiers_AreRejected(string project, string instance, string database)
    {
        var environment = new Dictionary<string, string?> { ["SPANNER_EMULATOR_HOST"] = "localhost:9010" };

        Assert.Throws<ArgumentException>(() => CreateConfiguration(environment, project, instance, database));
    }

    [Theory]
    [InlineData("localhost:9010")]
    [InlineData("127.0.0.1:9010")]
    [InlineData("[::1]:9010")]
    public void ExplicitLoopbackConfiguration_IsAcceptedWithoutConnecting(string host)
    {
        var configuration = CreateEnvironment(host);

        Assert.Equal(host, configuration.EmulatorHost);
        Assert.Equal($"http://{host}", configuration.EmulatorEndpoint);
        Assert.StartsWith("test-", configuration.ProjectId, StringComparison.Ordinal);
        Assert.StartsWith("test-", configuration.InstanceId, StringComparison.Ordinal);
        Assert.StartsWith("test-", configuration.DatabaseId, StringComparison.Ordinal);
        Assert.NotEqual(configuration.ProjectId, configuration.InstanceId);
        Assert.NotEqual(configuration.ProjectId, configuration.DatabaseId);
        Assert.NotEqual(configuration.InstanceId, configuration.DatabaseId);
    }

    [Fact]
    public void ConnectionBuilder_UsesEmulatorOnlyAndInsecureLocalTransport()
    {
        var configuration = CreateEnvironment("127.0.0.1:9010");

        var builder = SpannerEmulatorConnectionFactory.CreateBuilder(configuration);

        Assert.Equal(Google.Api.Gax.EmulatorDetection.EmulatorOnly, builder.EmulatorDetection);
        Assert.Equal("127.0.0.1", builder.Host);
        Assert.Equal(9010, builder.Port);
        Assert.Contains("projects/test-run123456-project/instances/test-run123456-instance/databases/test-run123456-database", builder.DataSource, StringComparison.Ordinal);
        Assert.True(string.IsNullOrEmpty(builder.CredentialFile));
    }

    [Fact]
    public void Validation_DoesNotMutateTheSuppliedEnvironment()
    {
        var environment = new Dictionary<string, string?>
        {
            ["SPANNER_EMULATOR_HOST"] = "localhost:9010",
        };

        _ = CreateConfiguration(environment);

        Assert.Single(environment);
        Assert.Equal("localhost:9010", environment["SPANNER_EMULATOR_HOST"]);
    }

    private static SpannerEmulatorTestConfiguration CreateEnvironment(string? host = null) =>
        CreateConfiguration(
            host is null
                ? new Dictionary<string, string?>()
                : new Dictionary<string, string?> { ["SPANNER_EMULATOR_HOST"] = host });

    private static SpannerEmulatorTestConfiguration CreateConfiguration(
        IReadOnlyDictionary<string, string?> environment,
        string project = "test-run123456-project",
        string instance = "test-run123456-instance",
        string database = "test-run123456-database") =>
        SpannerEmulatorTestConfiguration.Create(environment, project, instance, database, RunId);
}
