using Nop.Plugin.Misc.DiagnosticCapillaire.Domain;

namespace Nop.Plugin.Misc.DiagnosticCapillaire.Services;

public interface IDiagFormVersionService
{
    Task<IList<DiagFormVersion>> GetAllVersionsAsync();
    Task<DiagFormVersion?> GetByIdAsync(string id);
    Task<DiagFormVersion?> GetActiveVersionAsync();
    Task InsertAsync(DiagFormVersion version);
    Task UpdateAsync(DiagFormVersion version);
    Task DeleteAsync(string id);
    Task SetActiveAsync(string id);
}
