using System.Net.Mail;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Nop.Core.Infrastructure;
using Nop.Plugin.Misc.WebApi.Frontend.Services;
using Nop.Plugin.Misc.WebApi.Frontend.Services.Model;

namespace Nop.Plugin.Misc.WebApi.Frontend.Controllers;

[ApiController]
[AllowAnonymous]
public class DiagnosticCapillaireController : Controller
{
    private readonly IEmailService _emailService;
    private readonly INopFileProvider _nopFileProvider;

    public DiagnosticCapillaireController(IEmailService emailService, INopFileProvider nopFileProvider)
    {
        _emailService = emailService;
        _nopFileProvider = nopFileProvider;
    }

    [HttpGet]
    [Route("api/diagnosticcapillaire/questions")]
    public async Task<Response<IList<Question>>> GetQuestions()
    {
        var diagData = GetDiagData();
        return new Response<IList<Question>>() { Data = diagData.questions };
    }

    [HttpGet]
    [Route("api/diagnosticcapillaire/response")]
    public async Task<Response<string>> GetResponse(string questionResp, string email)
    {
        if (questionResp.IsNullOrEmpty() || questionResp.Count() != 9)
            NotFound("Check your answer");
        var diagData = GetDiagData().responses.ToDictionary(r => string.Join(string.Empty, r.combinaisons.Select(c => c.response)), q => q.response.value);
        
        if(diagData.TryGetValue(questionResp, out var response))
            NotFound("No result");

        if(!email.IsNullOrEmpty() && MailAddress.TryCreate(email, out var mailAddress))
            await _emailService.InsertEmail(email);


        return new Response<string>() { Data = response };
    }

    private Root GetDiagData()
    {
        var jsonfilePath = _nopFileProvider.MapPath("~/App_Data/Assets/diag-data.json");
        return JsonSerializer.Deserialize<Root>(_nopFileProvider.ReadAllText(jsonfilePath, Encoding.UTF8));
    }

    public class Combinaison
    {
        public string question { get; set; }
        public string response { get; set; }
    }

    public class Question
    {
        public string id { get; set; }
        public string question { get; set; }
        public List<Response> responses { get; set; }
    }

    public class Response
    {
        public string id { get; set; }
        public string value { get; set; }
        public List<Combinaison> combinaisons { get; set; }
        public CombinaisonResponse response { get; set; }
    }

    public class CombinaisonResponse
    {
        public string value { get; set; }
    }

    public class Root
    {
        public List<Question> questions { get; set; }
        public List<Response> responses { get; set; }
    }


}


