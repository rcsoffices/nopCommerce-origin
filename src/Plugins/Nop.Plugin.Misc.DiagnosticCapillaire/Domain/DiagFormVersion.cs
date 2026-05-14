namespace Nop.Plugin.Misc.DiagnosticCapillaire.Domain;

public class DiagFormVersion
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string JsonContent { get; set; } = string.Empty;
    public DateTime CreatedOn { get; set; }
    public bool IsActive { get; set; }
}
