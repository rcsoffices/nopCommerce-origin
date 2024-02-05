using System;
using DocumentFormat.OpenXml.EMMA;
using Microsoft.AspNetCore.Mvc;
using Nop.Plugin.Product.Stepper.Models;
using Nop.Web.Framework.Components;

namespace Nop.Plugin.Product.Stepper.Components
{
    [ViewComponent(Name = "ProductStepperForm")]
    public class ProductStepperFormViewComponent : NopViewComponent
    {
        public ProductStepperFormViewComponent()
        {

        }

        public IViewComponentResult Invoke(int productId)
        {
            var model = new PublicInfoModel();
            return View("~/Plugins/Product.Stepper/Views/PublicInfo.cshtml", model);
        }
    }
}
