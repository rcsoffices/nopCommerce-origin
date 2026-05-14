using System.Text.Json;
using Nop.Core.Infrastructure;
using Nop.Plugin.Misc.DiagnosticCapillaire.Domain;

namespace Nop.Plugin.Misc.DiagnosticCapillaire.Services;

public class DiagFormVersionService : IDiagFormVersionService
{
    private readonly INopFileProvider _fileProvider;
    private static readonly SemaphoreSlim _lock = new(1, 1);
    private static readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };

    private const string DataDirectory = "~/App_Data/DiagnosticCapillaire";
    private const string DataFile = "~/App_Data/DiagnosticCapillaire/versions.json";

    public DiagFormVersionService(INopFileProvider fileProvider)
    {
        _fileProvider = fileProvider;
    }

    private async Task<List<DiagFormVersion>> ReadAllAsync()
    {
        var dir = _fileProvider.MapPath(DataDirectory);
        if (!_fileProvider.DirectoryExists(dir))
            _fileProvider.CreateDirectory(dir);

        var path = _fileProvider.MapPath(DataFile);
        if (!_fileProvider.FileExists(path))
            return [];

        var json = await File.ReadAllTextAsync(path);
        if (string.IsNullOrWhiteSpace(json))
            return [];

        return JsonSerializer.Deserialize<List<DiagFormVersion>>(json) ?? [];
    }

    private async Task WriteAllAsync(List<DiagFormVersion> versions)
    {
        var dir = _fileProvider.MapPath(DataDirectory);
        if (!_fileProvider.DirectoryExists(dir))
            _fileProvider.CreateDirectory(dir);

        var path = _fileProvider.MapPath(DataFile);
        var json = JsonSerializer.Serialize(versions, _jsonOptions);
        await File.WriteAllTextAsync(path, json);
    }

    public async Task<IList<DiagFormVersion>> GetAllVersionsAsync()
    {
        await _lock.WaitAsync();
        try
        {
            var all = await ReadAllAsync();
            return all.OrderByDescending(v => v.CreatedOn).ToList();
        }
        finally { _lock.Release(); }
    }

    public async Task<DiagFormVersion?> GetByIdAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            var all = await ReadAllAsync();
            return all.FirstOrDefault(v => v.Id == id);
        }
        finally { _lock.Release(); }
    }

    public async Task<DiagFormVersion?> GetActiveVersionAsync()
    {
        await _lock.WaitAsync();
        try
        {
            var all = await ReadAllAsync();
            return all.FirstOrDefault(v => v.IsActive);
        }
        finally { _lock.Release(); }
    }

    public async Task InsertAsync(DiagFormVersion version)
    {
        await _lock.WaitAsync();
        try
        {
            var all = await ReadAllAsync();
            version.Id = Guid.NewGuid().ToString();
            version.CreatedOn = DateTime.UtcNow;
            all.Add(version);
            await WriteAllAsync(all);
        }
        finally { _lock.Release(); }
    }

    public async Task UpdateAsync(DiagFormVersion version)
    {
        await _lock.WaitAsync();
        try
        {
            var all = await ReadAllAsync();
            var idx = all.FindIndex(v => v.Id == version.Id);
            if (idx >= 0)
                all[idx] = version;
            await WriteAllAsync(all);
        }
        finally { _lock.Release(); }
    }

    public async Task DeleteAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            var all = await ReadAllAsync();
            all.RemoveAll(v => v.Id == id);
            await WriteAllAsync(all);
        }
        finally { _lock.Release(); }
    }

    public async Task SetActiveAsync(string id)
    {
        await _lock.WaitAsync();
        try
        {
            var all = await ReadAllAsync();
            foreach (var v in all)
                v.IsActive = v.Id == id;
            await WriteAllAsync(all);
        }
        finally { _lock.Release(); }
    }
}
