using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Nop.Web.Framework.Mvc.Filters;
using Nop.Web.Framework;
using Nop.Web.Framework.Controllers;
using Nop.Services.Security;
using Nop.Plugin.Product.Stepper.Models;
using Nop.Services.Catalog;
using Nop.Web.Areas.Admin.Factories;
using Nop.Web.Areas.Admin.Models.Catalog;
using Nop.Core;
using System.IO;
using System.Text.Json.Serialization;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Nop.Plugin.Product.Stepper.Controllers
{
    [AuthorizeAdmin]
    [Area(AreaNames.ADMIN)]
    [AutoValidateAntiforgeryToken]
    public class PluginProductStepperController : BasePluginController
    {
        private IPermissionService _permissionService;
        private readonly IProductService _productService;
        private readonly IProductModelFactory _productModelFactory;
        private readonly IWorkContext _workContext;
        private readonly string getFilePath = $@"{Directory.GetCurrentDirectory()}\ProductStepperForm";

        public PluginProductStepperController(IPermissionService permissionService, IProductService productService, IProductModelFactory productModelFactory, IWorkContext workContext)
        {
            _permissionService = permissionService;
            _productService = productService;
            _productModelFactory = productModelFactory;
            _workContext = workContext;
        }

        public async Task<IActionResult> Configure()
        {
            if (!await _permissionService.AuthorizeAsync(StandardPermissionProvider.ManageShippingSettings))
                return AccessDeniedView();

            //prepare model
            var productList = await _productModelFactory.PrepareProductListModelAsync(new ProductSearchModel());

            var model = new ConfigurationModel()
            {
                SelectedProduct = new ProductInfo() { ProductId = 0 },
                Products = new SelectList(productList.Data.Select(p => new { Id = p.Id, Name = p.Name }).ToList(), "Id", "Name"),
            };

            return View("~/Plugins/Nop.Plugin.Product.Stepper/Views/Configure.cshtml", model);
        }

        [HttpPost]
        public async Task<IActionResult> Configure(ConfigurationModel model)
        {
            if (!await _permissionService.AuthorizeAsync(StandardPermissionProvider.ManageWidgets))
                return AccessDeniedView();

            var product = await _productService.GetProductByIdAsync(model.ProductId );
            //var currentVendor = await _workContext.GetCurrentVendorAsync();
            //if (currentVendor != null && product.VendorId != currentVendor.Id)
            //    return Content("This is not your product");
            var productList = await _productModelFactory.PrepareProductListModelAsync(new ProductSearchModel());
            model.Products = new SelectList(productList.Data.Select(p => new { Id = p.Id, Name = p.Name }).ToList(), "Id", "Name");
            model.SelectedProduct = new ProductInfo() { ProductId = product.Id, ProductName = product.Name };
            var initJson = await LoadJsonFile(model.SelectedProduct);
            model.JsonContent = initJson;
            if (model.JsonContent == null)
            {
                var attributeList = await _productModelFactory.PrepareProductAttributeMappingListModelAsync(new ProductAttributeMappingSearchModel() { ProductId = product.Id }, product);
                model.SelectedProduct.ProductAttributs = attributeList.Data.Select(ap => new ProductAttribut()
                {
                    AttributeId = ap.ProductAttributeId,
                    AttributeName = ap.ProductAttribute,
                    Rules = new Dictionary<Rules, string>(),
                    Values = ap.AvailableProductAttributes.Select(ap => ap.Value).ToList(),
                }).ToList();
                model.JsonContent = await SaveJsonSettings(model.SelectedProduct);
                return View("~/Plugins/Nop.Plugin.Product.Stepper/Views/Configure.cshtml", model);
            }
            SaveFile(model.SelectedProduct, model.JsonContent);

            return View("~/Plugins/Nop.Plugin.Product.Stepper/Views/Configure.cshtml", model);
        }

        private Task<string> SaveJsonSettings(ProductInfo model)
        {
            if (!Directory.Exists(getFilePath))
                Directory.CreateDirectory(getFilePath);
            var settings = JsonSerializer.Serialize(model);
            SaveFile(model, settings);
            return Task.FromResult(settings);
        }

        private void SaveFile(ProductInfo model, string settings)
        {
            var fileFullpath = $@"{getFilePath}\{model.ProductName}.json";
            if (System.IO.File.Exists(fileFullpath))
                System.IO.File.Delete(fileFullpath);
            System.IO.File.WriteAllText(fileFullpath, settings);
        }

        private Task<string> LoadJsonFile(ProductInfo model)
        {
            if (!Directory.Exists(getFilePath))
                return Task.FromResult<string>(null);

            var files = Directory.GetFiles(getFilePath);
            if(files.Any(f => f.Contains(model.ProductName, StringComparison.InvariantCultureIgnoreCase)))
            {
                var fileFullpath = $@"{getFilePath}\{model.ProductName}.json";
                var productInfo = System.IO.File.ReadAllText(fileFullpath);
                return Task.FromResult(productInfo);
            }
            return Task.FromResult<string>(null);
        }
    }
}
