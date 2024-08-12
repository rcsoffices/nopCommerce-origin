using Nop.Plugin.Misc.WebApi.Frontend.Services.Model;
using Nop.Services.Catalog;
using Nop.Services.Localization;

namespace Nop.Plugin.Misc.WebApi.Frontend.Services;

public class ProductMappingService : IProductMappingService
{
    private readonly IProductService _productService;
    private readonly IProductAttributeService _productAttributeService;
    protected readonly ILocalizationService _localizationService;

    public ProductMappingService(IProductService productService, IProductAttributeService productAttributeService, ILocalizationService localizationService)
    {
        _productService = productService;
        _productAttributeService = productAttributeService;
        _localizationService = localizationService;
    }


    public async Task<Product> GetProductByIdAsync(int productId)
    {
        var product = await _productService.GetProductByIdAsync(productId);
        return new Product
        {
            ProductId = product.Id,
            Name = product.Name,
            FullDescription = product.FullDescription,
            ShortDescription = product.ShortDescription,
            Price = product.Price
        };
    }

    public async Task<IList<ProductAttribute>> PrepareProductAttributeModelsAsync(int productId)
    {
        var productAttributeMapping = await _productAttributeService.GetProductAttributeMappingsByProductIdAsync(productId);
        var result = new List<ProductAttribute>();
        foreach (var attribute in productAttributeMapping)
        {
            var productAttribute = await _productAttributeService.GetProductAttributeByIdAsync(attribute.ProductAttributeId);

            var attributeModel = new ProductAttribute()
            {
                Id = attribute.Id,
                ProductId = productId,
                ProductAttributeId = attribute.ProductAttributeId,
                Name = await _localizationService.GetLocalizedAsync(productAttribute, x => x.Name),
                Description = await _localizationService.GetLocalizedAsync(productAttribute, x => x.Description),
                TextPrompt = await _localizationService.GetLocalizedAsync(attribute, x => x.TextPrompt),
                IsRequired = attribute.IsRequired,
                DefaultValue = await _localizationService.GetLocalizedAsync(attribute, x => x.DefaultValue),
            };

            if (attribute.ShouldHaveValues())
            {
                var attributeValues = await _productAttributeService.GetProductAttributeValuesAsync(attribute.Id);
                foreach (var attributeValue in attributeValues)
                {
                    var valueModel = new ProductAttributeValue()
                    {
                        Id = attributeValue.Id,
                        Name = await _localizationService.GetLocalizedAsync(attributeValue, x => x.Name),
                        IsPreSelected = attributeValue.IsPreSelected,
                        Quantity = attributeValue.Quantity,
                    };
                    attributeModel.Values.Add(valueModel);
                }
            }
            result.Add(attributeModel);
        }
        return result;
    }
}
