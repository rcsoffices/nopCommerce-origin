using Nop.Web.Framework.Models;
using Nop.Web.Framework.Mvc.ModelBinding;

namespace Nop.Plugin.Misc.DiagnosticCapillaire.Models;

public record DiagFormVersionModel : BaseNopModel
{
    public string Id { get; set; } = string.Empty;

    [NopResourceDisplayName("Nom de la version")]
    public string Name { get; set; } = string.Empty;

    [NopResourceDisplayName("Contenu JSON")]
    public string JsonContent { get; set; } = string.Empty;

    public DateTime CreatedOn { get; set; }

    public bool IsActive { get; set; }
}

public record DiagFormVersionListModel : BaseNopModel
{
    public IList<DiagFormVersionModel> Versions { get; set; } = [];
}
