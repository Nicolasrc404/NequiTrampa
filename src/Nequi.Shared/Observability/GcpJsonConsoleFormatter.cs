using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Logging.Console;
using Microsoft.Extensions.Options;

namespace Nequi.Shared.Observability;

/// <summary>Structured stdout logs that Cloud Logging parses (severity, message, trace, labels).</summary>
public sealed class GcpJsonConsoleFormatter : ConsoleFormatter, IDisposable
{
    public const string FormatterName = "gcp-json";
    private readonly IDisposable? _optionsReloadToken;

    public GcpJsonConsoleFormatter(IOptionsMonitor<ConsoleFormatterOptions> options) : base(FormatterName)
    {
        _optionsReloadToken = options.OnChange(_ => { });
    }

    public override void Write<TState>(in LogEntry<TState> logEntry, IExternalScopeProvider? scopeProvider, TextWriter textWriter)
    {
        var message = logEntry.Formatter?.Invoke(logEntry.State, logEntry.Exception);
        if (message is null && logEntry.Exception is null) return;

        var fields = new Dictionary<string, object?>
        {
            ["severity"] = Severity(logEntry.LogLevel),
            ["message"] = logEntry.Exception is null ? message : $"{message}\n{logEntry.Exception}",
            ["category"] = logEntry.Category,
            ["time"] = DateTimeOffset.UtcNow.ToString("O"),
        };

        scopeProvider?.ForEachScope((scope, dict) =>
        {
            if (scope is IEnumerable<KeyValuePair<string, object?>> kvps)
                foreach (var (k, v) in kvps)
                {
                    if (k == "{OriginalFormat}") continue;
                    dict[k == CorrelationKeys.Trace ? "logging.googleapis.com/trace" : k] = v;
                }
        }, fields);

        textWriter.WriteLine(JsonSerializer.Serialize(fields));
    }

    private static string Severity(LogLevel level) => level switch
    {
        LogLevel.Trace or LogLevel.Debug => "DEBUG",
        LogLevel.Information => "INFO",
        LogLevel.Warning => "WARNING",
        LogLevel.Error => "ERROR",
        LogLevel.Critical => "CRITICAL",
        _ => "DEFAULT",
    };

    public void Dispose() => _optionsReloadToken?.Dispose();
}
