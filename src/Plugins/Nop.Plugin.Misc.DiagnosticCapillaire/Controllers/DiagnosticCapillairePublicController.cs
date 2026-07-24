using System.Net.Mail;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Nop.Core.Http.Extensions;
using Nop.Plugin.Misc.DiagnosticCapillaire.Models;
using Nop.Plugin.Misc.DiagnosticCapillaire.Services;
using Nop.Services.Customers;
using Nop.Web.Framework.Controllers;

namespace Nop.Plugin.Misc.DiagnosticCapillaire.Controllers;

public class DiagnosticCapillairePublicController : BasePluginController
{
    private readonly IDiagFormVersionService _diagFormVersionService;
    private readonly ICustomerService _customerService;

    public DiagnosticCapillairePublicController(
        IDiagFormVersionService diagFormVersionService,
        ICustomerService customerService)
    {
        _diagFormVersionService = diagFormVersionService;
        _customerService = customerService;
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        var diagData = await GetDiagDataAsync();
        var state = await HttpContext.Session.GetAsync<KalidiagSubmissionState>(
            DiagnosticCapillaireDefaults.KalidiagSubmissionSessionKey)
            ?? new KalidiagSubmissionState();

        await HttpContext.Session.RemoveAsync(DiagnosticCapillaireDefaults.KalidiagSubmissionSessionKey);

        var model = new KalidiagPageModel
        {
            Questions = diagData.questions,
            Answers = state.Answers,
            Email = state.Email,
            ResultHtml = state.ResultHtml,
            Errors = state.Errors
        };

        return View("~/Plugins/Misc.DiagnosticCapillaire/Views/DiagnosticCapillaire/Index.cshtml", model);
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public async Task<IActionResult> Index(KalidiagSubmitModel model)
    {
        var state = await BuildSubmissionStateAsync(model);

        if (state.Errors.Count == 0 && !string.IsNullOrWhiteSpace(state.Email))
        {
            var existing = await _customerService.GetCustomerByEmailAsync(state.Email);
            if (existing == null || existing.RegisteredInStoreId == 0)
                await _customerService.InsertCustomerAsync(
                    new Nop.Core.Domain.Customers.Customer { Email = state.Email });
        }

        await HttpContext.Session.SetAsync(DiagnosticCapillaireDefaults.KalidiagSubmissionSessionKey, state);
        return RedirectToAction(nameof(Index));
    }

    private async Task<KalidiagSubmissionState> BuildSubmissionStateAsync(KalidiagSubmitModel model)
    {
        var state = new KalidiagSubmissionState
        {
            Email = model.Email?.Trim() ?? string.Empty,
            Answers = model.Answers ?? []
        };

        var diagData = await GetDiagDataAsync();
        if (!diagData.questions.Any())
        {
            AddError(state.Errors, "form", "Le questionnaire est indisponible pour le moment.");
            return state;
        }

        if (!string.IsNullOrWhiteSpace(state.Email) && !MailAddress.TryCreate(state.Email, out _))
            AddError(state.Errors, "email", "Veuillez saisir une adresse email valide.");

        var combination = new List<string>();
        foreach (var question in diagData.questions)
        {
            if (!state.Answers.TryGetValue(question.id, out var answerId) || string.IsNullOrWhiteSpace(answerId))
            {
                AddError(state.Errors, $"question_{question.id}", "Ce champ est obligatoire.");
                continue;
            }

            combination.Add(answerId);
        }

        if (state.Errors.Count > 0)
            return state;

        var lookup = diagData.responses
            .ToDictionary(
                response => string.Join(string.Empty, response.combinaisons.Select(c => c.response)),
                response => response.response.value);

        var key = string.Join(string.Empty, combination);
        if (!lookup.TryGetValue(key, out var result) || string.IsNullOrWhiteSpace(result))
        {
            AddError(state.Errors, "form", "Aucun résultat n'a été trouvé pour cette combinaison.");
            return state;
        }

        state.ResultHtml = result;
        return state;
    }

    private async Task<DiagnosticRootModel> GetDiagDataAsync()
    {
        var activeVersion = await _diagFormVersionService.GetActiveVersionAsync();
        if (activeVersion == null)
            return new DiagnosticRootModel();

        return JsonSerializer.Deserialize<DiagnosticRootModel>(activeVersion.JsonContent)
            ?? new DiagnosticRootModel();
    }

    private static void AddError(IDictionary<string, List<string>> errors, string key, string message)
    {
        if (!errors.TryGetValue(key, out var fieldErrors))
        {
            fieldErrors = [];
            errors[key] = fieldErrors;
        }

        fieldErrors.Add(message);
    }
}
