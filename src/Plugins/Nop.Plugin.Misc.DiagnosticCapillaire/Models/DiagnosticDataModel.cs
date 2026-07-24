namespace Nop.Plugin.Misc.DiagnosticCapillaire.Models;

public record DiagnosticCombinationModel
{
    public string question { get; set; } = string.Empty;
    public string response { get; set; } = string.Empty;
}

public record DiagnosticQuestionResponseModel
{
    public string id { get; set; } = string.Empty;
    public string value { get; set; } = string.Empty;
}

public record DiagnosticQuestionModel
{
    public string id { get; set; } = string.Empty;
    public string question { get; set; } = string.Empty;
    public List<DiagnosticQuestionResponseModel> responses { get; set; } = [];
}

public record DiagnosticCombinationResponseModel
{
    public string value { get; set; } = string.Empty;
}

public record DiagnosticResponseMapModel
{
    public string id { get; set; } = string.Empty;
    public string value { get; set; } = string.Empty;
    public List<DiagnosticCombinationModel> combinaisons { get; set; } = [];
    public DiagnosticCombinationResponseModel response { get; set; } = new();
}

public record DiagnosticRootModel
{
    public List<DiagnosticQuestionModel> questions { get; set; } = [];
    public List<DiagnosticResponseMapModel> responses { get; set; } = [];
}