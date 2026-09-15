using ProfileService.Domain.Enums;

namespace ProfileService.Domain.Entities;

public class OutboxEvent
{
    public Guid EventId { get; private set; }
    public AggregateType AggregateType { get; private set; }
    public string AggregateId { get; private set; } = string.Empty;
    public string EventType { get; private set; } = string.Empty;
    public string Payload { get; private set; } = string.Empty;
    public OutboxStatus Status { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime? PublishedAt { get; private set; }

    private OutboxEvent() { }

    public static OutboxEvent Create(
        AggregateType aggregateType,
        string aggregateId,
        string eventType,
        string payload)
    {
        return new OutboxEvent
        {
            EventId = Guid.NewGuid(),
            AggregateType = aggregateType,
            AggregateId = aggregateId,
            EventType = eventType,
            Payload = payload,
            Status = OutboxStatus.PENDING,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void MarkAsPublished()
    {
        Status = OutboxStatus.PUBLISHED;
        PublishedAt = DateTime.UtcNow;
    }

    public void MarkAsFailed()
    {
        Status = OutboxStatus.FAILED;
    }
}
