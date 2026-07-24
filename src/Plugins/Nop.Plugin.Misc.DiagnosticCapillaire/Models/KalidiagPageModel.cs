using Nop.Web.Framework.Models;

namespace Nop.Plugin.Misc.DiagnosticCapillaire.Models;

public record KalidiagPageModel : BaseNopModel
{
    public IList<DiagnosticQuestionModel> Questions { get; set; } = [];
    public Dictionary<string, string> Answers { get; set; } = [];
    public string Email { get; set; } = string.Empty;
    public string ResultHtml { get; set; } = string.Empty;
    public Dictionary<string, List<string>> Errors { get; set; } = [];
}

public record KalidiagSubmitModel : BaseNopModel
{
    public Dictionary<string, string> Answers { get; set; } = [];
    public string Email { get; set; } = string.Empty;
}

public record KalidiagSubmissionState
{
    public Dictionary<string, string> Answers { get; set; } = [];
    public string Email { get; set; } = string.Empty;
    public string ResultHtml { get; set; } = string.Empty;
    public Dictionary<string, List<string>> Errors { get; set; } = [];
}