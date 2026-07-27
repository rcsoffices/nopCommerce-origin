using Microsoft.AspNetCore.Mvc;
using Nop.Web.Framework.Components;

namespace Nop.Plugin.Misc.DiagnosticCapillaire.Components;

public class DiagnosticCapillaireWidgetViewComponent : NopViewComponent
{
    public Task<IViewComponentResult> InvokeAsync(string widgetZone, object additionalData)
    {
        return Task.FromResult<IViewComponentResult>(View("~/Plugins/Misc.DiagnosticCapillaire/Views/PublicInfo.cshtml"));
    }
}