using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using ProfileService.Application.Interfaces;
using ProfileService.Application.Services;

namespace ProfileService.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddScoped<IAuthApplicationService, AuthApplicationService>();
        services.AddScoped<IProfileService, ProfileApplicationService>();
        services.AddScoped<IBeneficiaryService, BeneficiaryApplicationService>();
        services.AddScoped<IAdminService, AdminApplicationService>();

        return services;
    }
}
