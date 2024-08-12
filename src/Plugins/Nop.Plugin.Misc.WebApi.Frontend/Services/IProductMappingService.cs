using Nop.Plugin.Misc.WebApi.Frontend.Services.Model;

namespace Nop.Plugin.Misc.WebApi.Frontend.Services;

public interface IProductMappingService
{
    Task<IList<ProductAttribute>> PrepareProductAttributeModelsAsync(int productId);
    Task<Product> GetProductByIdAsync(int productId);
}
