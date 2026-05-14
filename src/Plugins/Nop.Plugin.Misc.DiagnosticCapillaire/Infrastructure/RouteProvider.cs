using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Nop.Web.Framework;
using Nop.Web.Framework.Mvc.Routing;

namespace Nop.Plugin.Misc.DiagnosticCapillaire.Infrastructure;

public class RouteProvider : IRouteProvider
{
    public int Priority => 0;

    public void RegisterRoutes(IEndpointRouteBuilder endpointRouteBuilder)
    {
        endpointRouteBuilder.MapControllerRoute(
            name: DiagnosticCapillaireDefaults.ConfigurationRouteName,
            pattern: "Admin/DiagnosticCapillaire/List",
            defaults: new { controller = "DiagnosticCapillaireAdmin", action = "List", area = AreaNames.ADMIN });

        endpointRouteBuilder.MapControllerRoute(
            name: DiagnosticCapillaireDefaults.KalidiagRouteName,
            pattern: "kalidiag",
            defaults: new { controller = "DiagnosticCapillairePublic", action = "Index" });
    }
}
