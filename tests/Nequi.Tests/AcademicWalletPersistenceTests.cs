using System.Text.Json;
using Nequi.Shared.Idempotency;
using Nequi.Wallet.DTOs;
using Nequi.Wallet.Services;

namespace Nequi.Tests;

public sealed class AcademicWalletPersistenceTests
{
    [Fact]
    public async Task ConfirmedOperationAndIdempotencySurviveRestartWithoutSecondEffect()
    {
        var directory = Path.Combine(Path.GetTempPath(), "nequitrampa-tests", Guid.NewGuid().ToString("N"));
        var path = Path.Combine(directory, "wallet.json");
        try
        {
            var first = new AcademicWalletStore(path);
            var reservation = await first.BeginAsync(
                "academic-laura", IdempotencyOperationClassification.TransferScope, "transfer-key", "hash-1", CancellationToken.None);
            Assert.Equal(BeginOutcome.Started, reservation.Outcome);

            var transfer = await new MockTransferService(first).CreateTransferAsync(
                "academic-laura", "transfer-key",
                new CreateTransferRequestDto("TRF-DEST-0001", 50_000m, "persisted", "COP"));

            var afterRestart = new AcademicWalletStore(path);
            var replay = await afterRestart.BeginAsync(
                "academic-laura", IdempotencyOperationClassification.TransferScope, "transfer-key", "hash-1", CancellationToken.None);

            Assert.Equal(BeginOutcome.Replay, replay.Outcome);
            Assert.NotNull(replay.Record);
            Assert.Contains(transfer.TransferId, replay.Record!.ResponseBody);
            Assert.Equal(1_200_000m, afterRestart.GetBalanceCents("academic-laura") / 100m);
            Assert.Single(afterRestart.GetTransfers("academic-laura", 1, 20));
        }
        finally
        {
            if (Directory.Exists(directory)) Directory.Delete(directory, recursive: true);
        }
    }

    [Fact]
    public async Task SameKeyWithDifferentHashConflictsAfterRestart()
    {
        var directory = Path.Combine(Path.GetTempPath(), "nequitrampa-tests", Guid.NewGuid().ToString("N"));
        var path = Path.Combine(directory, "wallet.json");
        try
        {
            var first = new AcademicWalletStore(path);
            await first.BeginAsync("actor", "POST:/v1/recharges", "same-key", "hash-a", CancellationToken.None);
            await first.CompleteAsync("actor", "POST:/v1/recharges", "same-key", 201, "{}", "application/json", CancellationToken.None);

            var afterRestart = new AcademicWalletStore(path);
            var conflict = await afterRestart.BeginAsync("actor", "POST:/v1/recharges", "same-key", "hash-b", CancellationToken.None);

            Assert.Equal(BeginOutcome.Conflict, conflict.Outcome);
            Assert.Equal(125_000_000, afterRestart.GetBalanceCents("actor"));
        }
        finally
        {
            if (Directory.Exists(directory)) Directory.Delete(directory, recursive: true);
        }
    }

    [Fact]
    public void CorruptStateFailsClosedInsteadOfCreatingInitialBalances()
    {
        var directory = Path.Combine(Path.GetTempPath(), "nequitrampa-tests", Guid.NewGuid().ToString("N"));
        var path = Path.Combine(directory, "wallet.json");
        try
        {
            Directory.CreateDirectory(directory);
            File.WriteAllText(path, "{ not valid json");

            var error = Assert.Throws<InvalidDataException>(() => new AcademicWalletStore(path));

            Assert.Contains("corrupto", error.Message, StringComparison.OrdinalIgnoreCase);
        }
        finally
        {
            if (Directory.Exists(directory)) Directory.Delete(directory, recursive: true);
        }
    }
}
