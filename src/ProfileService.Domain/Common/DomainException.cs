namespace ProfileService.Domain.Common;

public class DomainException : Exception
{
    public DomainException(string message) : base(message) { }
    public DomainException(string message, Exception innerException) : base(message, innerException) { }
}

public class EntityNotFoundException : DomainException
{
    public string EntityName { get; }
    public object Key { get; }

    public EntityNotFoundException(string entityName, object key) 
        : base($"No se encontró la entidad '{entityName}' con identificador '{key}'.")
    {
        EntityName = entityName;
        Key = key;
    }
}

public class ConflictException : DomainException
{
    public string ConflictReason { get; }

    public ConflictException(string message, string conflictReason = "CONFLICT") 
        : base(message)
    {
        ConflictReason = conflictReason;
    }
}

public class BusinessRuleValidationException : DomainException
{
    public string RuleName { get; }

    public BusinessRuleValidationException(string message, string ruleName = "BUSINESS_RULE_VIOLATION") 
        : base(message)
    {
        RuleName = ruleName;
    }
}
