namespace Nop.Plugin.Misc.WebApi.Frontend.Services.Model;

public class ProductAttribute
{
    public int Id { get; set; }
    public int ProductAttributeId { get; set; }
    public int ProductId { get; set; }


    public string Name { get; set; }

    public string Description { get; set; }

    public string TextPrompt { get; set; }

    public bool IsRequired { get; set; }
    public string DefaultValue { get; set; }

    public IList<ProductAttributeValue> Values { get; } = new List<ProductAttributeValue>();
}
