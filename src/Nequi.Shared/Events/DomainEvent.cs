using System.Text.Json;
using System.Text.Json.Serialization;

namespace Nequi.Shared.Events;

public static class EventTypes
{
    public const string TransferCompleted = "TRANSFER_COMPLETED";
    public const string RechargeCompleted = "RECHARGE_COMPLETED";
    public const string ReversalCompleted = "REVERSAL_COMPLETED";
    public const string AdminAdjustment = "ADMIN_ADJUSTMENT";
}

/// <summary>
/// Event confirmed in Spanner (written to the outbox in the same transaction as the money movement).
/// Money is always integer cents in COP.
/// </summary>
public sealed record DomainEvent(
    string EventId,
    string EventType,
    string OperationId,
    string ClientId,
    DateTimeOffset OccurredAt,
    long AmountCents,
    string Currency,
    string? CounterpartyClientId = null,
    string? Description = null,
    long? BalanceAfterCents = null)
{
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    public string ToJson() => JsonSerializer.Serialize(this, Json);
    public static DomainEvent? FromJson(string json) => JsonSerializer.Deserialize<DomainEvent>(json, Json);

    public bool IsValid(out string error)
    {
        if (string.IsNullOrWhiteSpace(EventId) || string.IsNullOrWhiteSpace(OperationId) || string.IsNullOrWhiteSpace(ClientId))
            error = "eventId, operationId and clientId are required";
        else if (Currency != "COP")
            error = "only COP is supported";
        else if (AmountCents == 0)
            error = "amountCents must be non-zero (signed delta for clientId: negative = debit)";
        else { error = ""; return true; }
        return false;
    }
}
