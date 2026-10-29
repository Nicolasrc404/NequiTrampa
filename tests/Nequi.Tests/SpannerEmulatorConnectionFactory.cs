using Google.Api.Gax;
using Google.Cloud.Spanner.Data;
using Grpc.Core;

namespace Nequi.Tests;

/// <summary>
/// Builds configuration for a future local Spanner Emulator fixture.
/// Validation must complete before this method is called. This method only
/// creates a connection-string builder; it does not open a connection.
/// </summary>
public static class SpannerEmulatorConnectionFactory
{
    public static SpannerConnectionStringBuilder CreateBuilder(SpannerEmulatorTestConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var (host, port) = SplitHost(configuration.EmulatorHost);
        var dataSource =
            $"projects/{configuration.ProjectId}/instances/{configuration.InstanceId}/databases/{configuration.DatabaseId}";

        var builder = new SpannerConnectionStringBuilder(
            $"Data Source={dataSource};Host={host};Port={port}",
            ChannelCredentials.Insecure)
        {
            EmulatorDetection = EmulatorDetection.EmulatorOnly,
        };

        return builder;
    }

    private static (string Host, int Port) SplitHost(string value)
    {
        var separator = value.LastIndexOf(':');
        var host = value.StartsWith("[", StringComparison.Ordinal)
            ? value[1..separator]
            : value[..separator];

        return (host, int.Parse(value[(separator + 1)..], System.Globalization.CultureInfo.InvariantCulture));
    }
}
