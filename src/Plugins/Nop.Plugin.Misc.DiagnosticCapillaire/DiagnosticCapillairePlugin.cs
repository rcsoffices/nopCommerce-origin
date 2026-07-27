using Nop.Core.Domain.Cms;
using Nop.Plugin.Misc.DiagnosticCapillaire.Components;
using Nop.Services.Cms;
using Nop.Services.Common;
using Nop.Services.Configuration;
using Nop.Services.Plugins;
using Nop.Web.Framework.Infrastructure;
using Nop.Web.Framework.Mvc.Routing;

namespace Nop.Plugin.Misc.DiagnosticCapillaire;

public class DiagnosticCapillairePlugin : BasePlugin, IMiscPlugin, IWidgetPlugin
{
    private readonly INopUrlHelper _nopUrlHelper;
    private readonly ISettingService _settingService;

    public DiagnosticCapillairePlugin(
        INopUrlHelper nopUrlHelper,
        ISettingService settingService)
    {
        _nopUrlHelper = nopUrlHelper;
        _settingService = settingService;
    }

    public override string GetConfigurationPageUrl()
    {
        return _nopUrlHelper.RouteUrl(DiagnosticCapillaireDefaults.ConfigurationRouteName);
    }

    public Task<IList<string>> GetWidgetZonesAsync()
    {
        return Task.FromResult<IList<string>>(new List<string> { PublicWidgetZones.BodyEndHtmlTagBefore });
    }

    public Type GetWidgetViewComponent(string widgetZone)
    {
        ArgumentNullException.ThrowIfNull(widgetZone);

        return typeof(DiagnosticCapillaireWidgetViewComponent);
    }

    public bool HideInWidgetList => true;

    public override async Task InstallAsync()
    {
        var widgetSettings = await _settingService.LoadSettingAsync<WidgetSettings>();
        if (!widgetSettings.ActiveWidgetSystemNames.Contains(PluginDescriptor.SystemName))
        {
            widgetSettings.ActiveWidgetSystemNames.Add(PluginDescriptor.SystemName);
            await _settingService.SaveSettingAsync(widgetSettings);
        }

        await base.InstallAsync();
    }

    public override async Task UninstallAsync()
    {
        var widgetSettings = await _settingService.LoadSettingAsync<WidgetSettings>();
        if (widgetSettings.ActiveWidgetSystemNames.Contains(PluginDescriptor.SystemName))
        {
            widgetSettings.ActiveWidgetSystemNames.Remove(PluginDescriptor.SystemName);
            await _settingService.SaveSettingAsync(widgetSettings);
        }

        await base.UninstallAsync();
    }
}
