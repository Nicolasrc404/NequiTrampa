using FluentValidation;
using ProfileService.Application.DTOs;

namespace ProfileService.Application.Validators;

public class RegisterClientValidator : AbstractValidator<RegisterClientRequest>
{
    public RegisterClientValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("El correo electrónico es obligatorio.")
            .EmailAddress().WithMessage("El formato del correo electrónico es inválido.")
            .MaximumLength(254).WithMessage("El correo electrónico no puede exceder 254 caracteres.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("La contraseña es obligatoria.")
            .MinimumLength(8).WithMessage("La contraseña debe tener al menos 8 caracteres.")
            .Matches(@"[A-Z]").WithMessage("La contraseña debe contener al menos una letra mayúscula.")
            .Matches(@"[a-z]").WithMessage("La contraseña debe contener al menos una letra minúscula.")
            .Matches(@"[0-9]").WithMessage("La contraseña debe contener al menos un dígito numérico.");

        RuleFor(x => x.Username)
            .NotEmpty().WithMessage("El nombre de usuario es obligatorio.")
            .Matches(@"^[a-zA-Z0-9_]{3,50}$").WithMessage("El nombre de usuario debe tener entre 3 y 50 caracteres alfanuméricos o guión bajo.");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("El nombre es obligatorio.")
            .MaximumLength(100).WithMessage("El nombre no puede exceder 100 caracteres.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("El apellido es obligatorio.")
            .MaximumLength(100).WithMessage("El apellido no puede exceder 100 caracteres.");

        RuleFor(x => x.Alias)
            .MaximumLength(50).WithMessage("El alias no puede exceder 50 caracteres.")
            .When(x => !string.IsNullOrWhiteSpace(x.Alias));
    }
}

public class UpdateProfileValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("El nombre es obligatorio.")
            .MaximumLength(100).WithMessage("El nombre no puede exceder 100 caracteres.");

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("El apellido es obligatorio.")
            .MaximumLength(100).WithMessage("El apellido no puede exceder 100 caracteres.");

        RuleFor(x => x.Alias)
            .MaximumLength(50).WithMessage("El alias no puede exceder 50 caracteres.")
            .When(x => !string.IsNullOrWhiteSpace(x.Alias));
    }
}

public class CreateBeneficiaryValidator : AbstractValidator<CreateBeneficiaryRequest>
{
    public CreateBeneficiaryValidator()
    {
        RuleFor(x => x.TargetPublicCode)
            .NotEmpty().WithMessage("El código público del destinatario es obligatorio.")
            .MaximumLength(20).WithMessage("El código público no puede exceder 20 caracteres.");

        RuleFor(x => x.Alias)
            .NotEmpty().WithMessage("El alias o apodo del beneficiario es obligatorio.")
            .MaximumLength(100).WithMessage("El alias no puede exceder 100 caracteres.");
    }
}

public class UpdateBeneficiaryValidator : AbstractValidator<UpdateBeneficiaryRequest>
{
    public UpdateBeneficiaryValidator()
    {
        RuleFor(x => x.Alias)
            .NotEmpty().WithMessage("El alias o apodo del beneficiario es obligatorio.")
            .MaximumLength(100).WithMessage("El alias no puede exceder 100 caracteres.");
    }
}

public class UpdateUserStatusValidator : AbstractValidator<UpdateUserStatusRequest>
{
    public UpdateUserStatusValidator()
    {
        RuleFor(x => x.Reason)
            .NotEmpty().WithMessage("El motivo del cambio de estado es obligatorio.")
            .MaximumLength(500).WithMessage("El motivo no puede exceder 500 caracteres.");
    }
}

public class CreateAdminValidator : AbstractValidator<CreateAdminRequest>
{
    public CreateAdminValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("El correo electrónico es obligatorio.")
            .EmailAddress().WithMessage("El formato del correo es inválido.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("La contraseña es obligatoria.")
            .MinimumLength(8).WithMessage("La contraseña debe tener al menos 8 caracteres.");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("El nombre completo es obligatorio.")
            .MaximumLength(200).WithMessage("El nombre completo no puede exceder 200 caracteres.");
    }
}
