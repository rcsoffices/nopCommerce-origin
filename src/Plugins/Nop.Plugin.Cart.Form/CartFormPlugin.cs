using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Nop.Plugin.Cart.Form.Component;
using Nop.Services.Cms;
using Nop.Services.Plugins;

namespace Nop.Plugin.Cart.Form
{
    public class CartFormPlugin : BasePlugin, IWidgetPlugin
    {
        public CartFormPlugin()
        {
        }

        public bool HideInWidgetList => false;

        public Type GetWidgetViewComponent(string widgetZone)
        {
            return typeof(CartFormPublicViewComponent);
        }

        public Task<IList<string>> GetWidgetZonesAsync()
        {
            return Task.FromResult<IList<string>>(new List<string> { "home_page_before_categories" });
        }
    }
}