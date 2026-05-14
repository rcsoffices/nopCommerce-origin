using Microsoft.AspNetCore.Mvc;
using Nop.Web.Framework.Controllers;

namespace Nop.Plugin.Misc.DiagnosticCapillaire.Controllers;

public class DiagnosticCapillairePublicController : BasePluginController
{
    [HttpGet]
    public IActionResult Index()
    {
        return View("~/Plugins/Misc.DiagnosticCapillaire/Views/DiagnosticCapillaire/Index.cshtml");
    }
}
