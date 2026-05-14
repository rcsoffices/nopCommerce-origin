using Nop.Services.Common;
using Nop.Services.Plugins;
using Nop.Web.Framework.Mvc.Routing;

namespace Nop.Plugin.Misc.DiagnosticCapillaire;

public class DiagnosticCapillairePlugin : BasePlugin, IMiscPlugin
{
    private readonly INopUrlHelper _nopUrlHelper;

    public DiagnosticCapillairePlugin(INopUrlHelper nopUrlHelper)
    {
        _nopUrlHelper = nopUrlHelper;
    }

    public override string GetConfigurationPageUrl()
    {
        return _nopUrlHelper.RouteUrl(DiagnosticCapillaireDefaults.ConfigurationRouteName);
    }

    public override async Task InstallAsync()
    {
        await base.InstallAsync();
    }

    public override async Task UninstallAsync()
    {
        await base.UninstallAsync();
    }
}
