using System.Collections.Generic;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Nop.Plugin.Product.Stepper.Models
{
    public class ConfigurationModel
    {
        public int ProductId { get; set; }
        public SelectList Products { get; set; }
        public ProductInfo SelectedProduct { get;set;} = new ProductInfo();
        public string JsonContent { get;set; }
    }
}
