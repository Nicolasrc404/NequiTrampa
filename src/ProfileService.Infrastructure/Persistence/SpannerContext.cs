using Google.Cloud.Spanner.Data;
using Microsoft.Extensions.Options;
using ProfileService.Infrastructure.Configuration;

namespace ProfileService.Infrastructure.Persistence;

public interface ISpannerContext
{
    SpannerConnection GetConnection();
    SpannerTransaction? CurrentTransaction { get; }
    Task<TResult> ExecuteInTransactionAsync<TResult>(Func<SpannerTransaction, Task<TResult>> action, CancellationToken cancellationToken = default);
    Task ExecuteInTransactionAsync(Func<SpannerTransaction, Task> action, CancellationToken cancellationToken = default);
}

public class SpannerContext : ISpannerContext
{
    private readonly SpannerOptions _options;
    private SpannerTransaction? _currentTransaction;

    public SpannerContext(IOptions<SpannerOptions> options)
    {
        _options = options.Value;
    }

    public SpannerTransaction? CurrentTransaction => _currentTransaction;

    public SpannerConnection GetConnection()
    {
        return new SpannerConnection(_options.ConnectionString);
    }

    public async Task<TResult> ExecuteInTransactionAsync<TResult>(Func<SpannerTransaction, Task<TResult>> action, CancellationToken cancellationToken = default)
    {
        if (_currentTransaction != null)
        {
            return await action(_currentTransaction);
        }

        await using var connection = GetConnection();
        await connection.OpenAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        _currentTransaction = transaction;

        try
        {
            var result = await action(transaction);
            await transaction.CommitAsync(cancellationToken);
            return result;
        }
        catch
        {
            try
            {
                await transaction.RollbackAsync(cancellationToken);
            }
            catch
            {
                // Ignorar error secundario de rollback
            }
            throw;
        }
        finally
        {
            _currentTransaction = null;
        }
    }

    public async Task ExecuteInTransactionAsync(Func<SpannerTransaction, Task> action, CancellationToken cancellationToken = default)
    {
        await ExecuteInTransactionAsync(async tx =>
        {
            await action(tx);
            return true;
        }, cancellationToken);
    }
}
