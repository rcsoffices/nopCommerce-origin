using System.Linq.Expressions;
using System.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nop.Core;
using Nop.Plugin.Misc.WebApi.Frontend.Services;
using Nop.Plugin.Misc.WebApi.Frontend.Services.Model;

namespace Nop.Plugin.Misc.WebApi.Frontend.Controllers;

[ApiController]
[AllowAnonymous]
public class ProductController: Controller
{
    private readonly IProductMappingService _productMappingService;
    public ProductController(IProductMappingService productMappingService)
    {
        _productMappingService = productMappingService;
    }

    [HttpGet]
    [Route("api/product/{productId}")]
    public async Task<Response<Product>> GetProductById(int productId)
    {
        var response = await _productMappingService.GetProductByIdAsync(productId);
        return new Response<Product>() { Data = response };
    }

    [HttpGet]
    [Route("api/product/{productId}/attribute")]
    public async Task<Response<IList<ProductAttribute>>> GetProductAttributeById(int productId)
    {
        var result = await _productMappingService.PrepareProductAttributeModelsAsync(productId);
        return new Response<IList<ProductAttribute>>() { Data = result};
    }

}


