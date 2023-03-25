using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Nop.Web.Framework.Components;

namespace Nop.Plugin.Cart.Form.Component
{
    public class CartFormPublicViewComponent : NopViewComponent
    {
        public CartFormPublicViewComponent()
        {
        }

        public async Task<IViewComponentResult> InvokeAsync(string widgetZone, object additionalData)
        {
            return View("~/Plugins/Cart.Form/Views/PublicForm.cshtml");
        }
    }
}
