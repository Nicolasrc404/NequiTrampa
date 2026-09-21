using Nequi.Shared.Data;
using Nequi.Shared.Events;

namespace Nequi.Workers.Outbox;

/// <summary>Uses the Spanner outbox_events table when Spanner:Database is configured; otherwise null (in-memory).</summary>
public static class SpannerOutbox
{
    public static IOutboxStore? Create(IServiceProvider sp) =>
        sp.GetService<SpannerDb>() is { } db ? new SpannerOutboxStore(db) : null;
}
