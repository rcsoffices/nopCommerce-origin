namespace Nop.Plugin.Misc.WebApi.Frontend.Services.Model;

public class Product
{
    public int ProductId { get; set; }

    public string Name { get; set; }

    /// <summary>
    /// Gets or sets the short description
    /// </summary>
    public string ShortDescription { get; set; }

    /// <summary>
    /// Gets or sets the full description
    /// </summary>
    public string FullDescription { get; set; }
    public decimal Price { get; set; }


}
