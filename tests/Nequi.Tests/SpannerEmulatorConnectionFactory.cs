using Google.Api.Gax;
using Google.Cloud.Spanner.Data;

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

        var dataSource =
            $"projects/{configuration.ProjectId}/instances/{configuration.InstanceId}/databases/{configuration.DatabaseId}";

        var builder = new SpannerConnectionStringBuilder($"Data Source={dataSource}")
        {
            EmulatorDetection = EmulatorDetection.EmulatorOnly,
        };

        return builder;
    }
}
