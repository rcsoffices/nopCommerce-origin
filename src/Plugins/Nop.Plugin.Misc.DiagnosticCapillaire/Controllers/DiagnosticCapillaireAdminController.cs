using Microsoft.AspNetCore.Mvc;
using Nop.Plugin.Misc.DiagnosticCapillaire.Domain;
using Nop.Plugin.Misc.DiagnosticCapillaire.Models;
using Nop.Plugin.Misc.DiagnosticCapillaire.Services;
using Nop.Web.Framework;
using Nop.Web.Framework.Controllers;
using Nop.Web.Framework.Mvc.Filters;

namespace Nop.Plugin.Misc.DiagnosticCapillaire.Controllers;

[Area(AreaNames.ADMIN)]
[AuthorizeAdmin]
[AutoValidateAntiforgeryToken]
public class DiagnosticCapillaireAdminController : BasePluginController
{
    private readonly IDiagFormVersionService _service;

    public DiagnosticCapillaireAdminController(IDiagFormVersionService service)
    {
        _service = service;
    }

    public async Task<IActionResult> List()
    {
        var versions = await _service.GetAllVersionsAsync();
        var model = new DiagFormVersionListModel
        {
            Versions = versions.Select(v => new DiagFormVersionModel
            {
                Id = v.Id,
                Name = v.Name,
                CreatedOn = v.CreatedOn,
                IsActive = v.IsActive,
                JsonContent = v.JsonContent
            }).ToList()
        };
        return View("~/Plugins/Misc.DiagnosticCapillaire/Views/Admin/DiagnosticCapillaire/List.cshtml", model);
    }

    [HttpGet]
    public IActionResult Create()
    {
        return View("~/Plugins/Misc.DiagnosticCapillaire/Views/Admin/DiagnosticCapillaire/Edit.cshtml", new DiagFormVersionModel());
    }

    [HttpPost]
    public async Task<IActionResult> Create(DiagFormVersionModel model)
    {
        if (!ModelState.IsValid)
            return View("~/Plugins/Misc.DiagnosticCapillaire/Views/Admin/DiagnosticCapillaire/Edit.cshtml", model);

        await _service.InsertAsync(new DiagFormVersion
        {
            Name = model.Name,
            JsonContent = model.JsonContent,
            IsActive = false
        });

        return RedirectToAction(nameof(List));
    }

    [HttpGet]
    public async Task<IActionResult> Edit(string id)
    {
        var entity = await _service.GetByIdAsync(id);
        if (entity == null)
            return NotFound();

        var model = new DiagFormVersionModel
        {
            Id = entity.Id,
            Name = entity.Name,
            JsonContent = entity.JsonContent,
            CreatedOn = entity.CreatedOn,
            IsActive = entity.IsActive
        };
        return View("~/Plugins/Misc.DiagnosticCapillaire/Views/Admin/DiagnosticCapillaire/Edit.cshtml", model);
    }

    [HttpPost]
    public async Task<IActionResult> Edit(DiagFormVersionModel model)
    {
        if (!ModelState.IsValid)
            return View("~/Plugins/Misc.DiagnosticCapillaire/Views/Admin/DiagnosticCapillaire/Edit.cshtml", model);

        var entity = await _service.GetByIdAsync(model.Id);
        if (entity == null)
            return NotFound();

        entity.Name = model.Name;
        entity.JsonContent = model.JsonContent;
        await _service.UpdateAsync(entity);

        return RedirectToAction(nameof(List));
    }

    [HttpPost]
    public async Task<IActionResult> SetActive(string id)
    {
        await _service.SetActiveAsync(id);
        return RedirectToAction(nameof(List));
    }

    [HttpPost]
    public async Task<IActionResult> Delete(string id)
    {
        await _service.DeleteAsync(id);
        return RedirectToAction(nameof(List));
    }
}
