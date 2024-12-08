using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Nop.Core.Infrastructure;
using Nop.Plugin.Misc.WebApi.Frontend.Services;

namespace Nop.Plugin.Misc.WebApi.Frontend.Infrastructure;

public class NopStartup : INopStartup
{
    public int Order => 0;
    private readonly string devPolicy = "devPolicy";
    public void Configure(IApplicationBuilder application)
    {
        application.UseCors(devPolicy);
        application.UseSwagger();
        application.UseSwaggerUI();
    }

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IProductMappingService,  ProductMappingService>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddControllers();
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen();
        services.AddCors(options =>
        {
            options.AddPolicy(name: devPolicy,
                              builder =>
                              {
                                  builder.WithOrigins("http://127.0.0.1:3000");
                              });
        });
    }
}