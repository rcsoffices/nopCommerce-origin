using System.Collections.Generic;
using Nop.Core;
using Nop.Services.Cms;
using Nop.Services.Plugins;
using Nop.Web.Framework.Infrastructure;

namespace Nop.Plugin.Product.Stepper
{
    /// <summary>
    /// Rename this file and change to the correct type
    /// </summary>
    public class ProductStepperPlugin : BasePlugin
    {
        private readonly IWebHelper _webHelper;

        public ProductStepperPlugin(IWebHelper webHelper)
        {
            _webHelper = webHelper;
        }


        public override string GetConfigurationPageUrl()
        {
            return $"{_webHelper.GetStoreLocation()}Admin/PluginProductStepper/Configure";
        }
    }
}
