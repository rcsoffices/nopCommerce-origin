using System.Net.Mail;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Nop.Plugin.Misc.DiagnosticCapillaire.Services;
using Nop.Services.Customers;

namespace Nop.Plugin.Misc.DiagnosticCapillaire.Controllers;

[ApiController]
[AllowAnonymous]
public class DiagnosticCapillaireApiController : Controller
{
    private readonly IDiagFormVersionService _diagFormVersionService;
    private readonly ICustomerService _customerService;

    public DiagnosticCapillaireApiController(
        IDiagFormVersionService diagFormVersionService,
        ICustomerService customerService)
    {
        _diagFormVersionService = diagFormVersionService;
        _customerService = customerService;
    }

    [HttpGet]
    [Route("api/diagnosticcapillaire/questions")]
    public async Task<ApiResponse<IList<Question>>> GetQuestions()
    {
        var diagData = await GetDiagDataAsync();
        return new ApiResponse<IList<Question>> { Data = diagData.questions };
    }

    [HttpGet]
    [Route("api/diagnosticcapillaire/response")]
    public async Task<ApiResponse<string>> GetResponse(string questionResp, string email)
    {
        if (questionResp.IsNullOrEmpty())
            return new ApiResponse<string> { Data = null };

        var diagData = await GetDiagDataAsync();
        var lookup = diagData.responses
            .ToDictionary(
                r => string.Join(string.Empty, r.combinaisons.Select(c => c.response)),
                r => r.response.value);

        lookup.TryGetValue(questionResp, out var response);

        if (!email.IsNullOrEmpty() && MailAddress.TryCreate(email, out _))
        {
            var existing = await _customerService.GetCustomerByEmailAsync(email);
            if (existing == null || existing.RegisteredInStoreId == 0)
                await _customerService.InsertCustomerAsync(
                    new Nop.Core.Domain.Customers.Customer { Email = email });
        }

        return new ApiResponse<string> { Data = response };
    }

    private async Task<DiagRoot> GetDiagDataAsync()
    {
        var activeVersion = await _diagFormVersionService.GetActiveVersionAsync();
        if (activeVersion == null)
            return new DiagRoot { questions = [], responses = [] };

        return JsonSerializer.Deserialize<DiagRoot>(activeVersion.JsonContent)
            ?? new DiagRoot { questions = [], responses = [] };
    }

    // ── DTOs (mirrors diag-data.json shape) ────────────────────────────────

    public class ApiResponse<T>
    {
        public T? Data { get; set; }
    }

    public class Combinaison
    {
        public string question { get; set; } = string.Empty;
        public string response { get; set; } = string.Empty;
    }

    public class QuestionResponse
    {
        public string id { get; set; } = string.Empty;
        public string value { get; set; } = string.Empty;
    }

    public class Question
    {
        public string id { get; set; } = string.Empty;
        public string question { get; set; } = string.Empty;
        public List<QuestionResponse> responses { get; set; } = [];
    }

    public class CombinaisonResponse
    {
        public string value { get; set; } = string.Empty;
    }

    public class DiagResponse
    {
        public string id { get; set; } = string.Empty;
        public string value { get; set; } = string.Empty;
        public List<Combinaison> combinaisons { get; set; } = [];
        public CombinaisonResponse response { get; set; } = new();
    }

    public class DiagRoot
    {
        public List<Question> questions { get; set; } = [];
        public List<DiagResponse> responses { get; set; } = [];
    }
}
