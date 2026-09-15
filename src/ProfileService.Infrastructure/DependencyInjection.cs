using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ProfileService.Application.Interfaces;
using ProfileService.Domain.Repositories;
using ProfileService.Infrastructure.Configuration;
using ProfileService.Infrastructure.Identity;
using ProfileService.Infrastructure.Persistence;
using ProfileService.Infrastructure.Services;

namespace ProfileService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // Opciones de configuración
        services.Configure<SpannerOptions>(configuration.GetSection(SpannerOptions.SectionName));
        services.Configure<IdentityPlatformOptions>(configuration.GetSection(IdentityPlatformOptions.SectionName));

        // Persistencia Spanner
        services.AddSingleton<ISpannerContext, SpannerContext>();
        services.AddScoped<IClientRepository, SpannerClientRepository>();
        services.AddScoped<IAdminRepository, SpannerAdminRepository>();
        services.AddScoped<IBeneficiaryRepository, SpannerBeneficiaryRepository>();
        services.AddScoped<IOutboxRepository, SpannerOutboxRepository>();
        services.AddScoped<IUnitOfWork, SpannerUnitOfWork>();

        // Servicios de Identidad y Utilidades
        services.AddHttpClient<IIdentityPlatformService, GoogleIdentityPlatformService>();
        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();

        return services;
    }
}
