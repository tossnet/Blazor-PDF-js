using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Blazor_PDF_js.Pages;

public partial class Home : IAsyncDisposable
{
    [Inject] private IJSRuntime JSRuntime { get; set; } = default!;
    [Inject] private HttpClient Http { get; set; } = default!;

    private IJSObjectReference? JsModule;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        base.OnAfterRenderAsync(firstRender);

        if (!firstRender)
        {
            return;
        }

        JsModule ??= await JSRuntime.InvokeAsync<IJSObjectReference>("import", "./Pages/Home.razor.js");
    }

    private async Task OnClickLoadPdf(string filename)
    {
        var pdfBytes = await Http.GetByteArrayAsync(filename);
        string base64 = Convert.ToBase64String(pdfBytes); 

        await JsModule.InvokeVoidAsync("displayPdfBase64", base64);
    }

    public async ValueTask DisposeAsync()
    {
        if (JsModule is not null)
        {
            await JsModule.DisposeAsync();
        }
    }
}
