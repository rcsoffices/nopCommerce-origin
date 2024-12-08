using Nop.Services.Customers;

namespace Nop.Plugin.Misc.WebApi.Frontend.Services;

public class EmailService : IEmailService
{
    private readonly ICustomerService _customerService;

    public EmailService(ICustomerService customerService)
    {
        _customerService = customerService;
    }
    public async Task InsertEmail(string email)
    {
        var existingEmail = await _customerService.GetCustomerByEmailAsync(email);
        if (existingEmail == null || existingEmail.RegisteredInStoreId == 0)
            await _customerService.InsertCustomerAsync(new Core.Domain.Customers.Customer() { Email = email });
    }
}
