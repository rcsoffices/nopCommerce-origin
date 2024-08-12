using System.Net;

namespace Nop.Plugin.Misc.WebApi.Frontend.Services.Model;

public class Response<T>
{
    public Response()
    {
    }
    public Response(T data)
    {
        Data = data;
    }

    public T Data { get; set; }
}
