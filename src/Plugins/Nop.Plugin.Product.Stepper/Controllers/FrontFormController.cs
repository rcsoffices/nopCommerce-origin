using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using DocumentFormat.OpenXml.EMMA;
using Microsoft.AspNetCore.Mvc;
using Nop.Web.Framework.Controllers;

namespace Nop.Plugin.Product.Stepper.Controllers
{
    [AutoValidateAntiforgeryToken]
    public class FrontFormController : BasePluginController
    {
        public async Task<IActionResult> GetProductForm(int productId)
        {
            return View("~/Plugins/Nop.Plugin.Product.Stepper/Views/PublicInfo.cshtml");
        }
    }

}
