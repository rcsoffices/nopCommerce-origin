using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Nop.Plugin.Product.Stepper.Models
{
    public class ProductInfo
    {
        public int ProductId { get;set; }
        public string ProductName { get;set; }
        public List<ProductAttribut> ProductAttributs { get; set; }
    }

    public class ProductAttribut
    {
        public int ProductId { get;set;}
        public int AttributeId { get;set;}
        public string AttributeName { get;set;}

        public Dictionary<Rules, string> Rules { get;set;}
        public List<string> Values { get;set;}
    }

    public enum Rules
    {
        MaxChoice = 00
    }
}
