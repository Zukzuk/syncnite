using System;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Timers;
using Playnite.SDK;

namespace PlayniteViewerBridge
{
    /// <summary>Watches Playnite DB and pushes the installed GUID list to your API (net462 + SDK 6.x safe).</summary>
    internal sealed class InstalledPusher : IDisposable
    {
        private readonly IPlayniteAPI api;
        private string endpoint;
        private readonly System.Timers.Timer debounce;
        private readonly ILogger log = LogManager.GetLogger();
        private CancellationTokenSource pushCts;

        public InstalledPusher(IPlayniteAPI api, string endpoint)
        {
            this.api = api;
            this.endpoint = (endpoint ?? "").TrimEnd('/');

            // Debounce rapid changes
            debounce = new System.Timers.Timer(1500) { AutoReset = false };
            debounce.Elapsed += (s, e) => PushInstalledSafe();

            // Playnite 6.x: use ItemCollectionChanged + ItemUpdated
            api.Database.Games.ItemCollectionChanged += (s, e) => Trigger();
            api.Database.Games.ItemUpdated += (s, e) => Trigger();
        }

        public void UpdateEndpoint(string endpoint) =>
            this.endpoint = (endpoint ?? "").TrimEnd('/');

        public void Trigger()
        {
            try
            {
                debounce.Stop();
                debounce.Start();
            }
            catch { }
        }

        public void PushNow()
        {
            try
            {
                debounce.Stop();
            }
            catch { }
            PushInstalledSafe();
        }

        private string BuildPayload()
        {
            // Minimal JSON (no System.Text.Json on net462)
            var installed = api
                .Database.Games.Where(g => g.IsInstalled)
                .Select(g => g.Id.ToString())
                .ToArray();
            var sb = new StringBuilder();
            sb.Append("{\"installed\":[");
            for (int i = 0; i < installed.Length; i++)
            {
                if (i > 0)
                    sb.Append(',');
                sb.Append('\"').Append(installed[i]).Append('\"');
            }
            sb.Append("]}");
            return sb.ToString();
        }

        private async void PushInstalledSafe()
        {
            CancellationTokenSource cts = null;
            try
            {
                // cancel any in-flight push
                try
                {
                    pushCts?.Cancel();
                    pushCts?.Dispose();
                }
                catch { }
                pushCts = new CancellationTokenSource();
                cts = pushCts;
                var ct = cts.Token;

                var payload = BuildPayload();
                var url = endpoint;

                using (var wc = new WebClient())
                using (
                    ct.Register(() =>
                    {
                        try
                        {
                            wc.CancelAsync();
                        }
                        catch { }
                    })
                )
                {
                    wc.Headers[HttpRequestHeader.ContentType] = "application/json";

                    var uploadTask = wc.UploadStringTaskAsync(new Uri(url), "POST", payload);
                    var timeoutTask = Task.Delay(5000, ct); // 5s safety timeout

                    var completed = await Task.WhenAny(uploadTask, timeoutTask);
                    if (completed != uploadTask)
                    {
                        try
                        {
                            wc.CancelAsync();
                        }
                        catch { }
                        ct.ThrowIfCancellationRequested(); // exit silently on shutdown
                        log.Warn("ViewerBridge push timed out.");
                        return;
                    }

                    var _ = await uploadTask; // throws on WebException
                    int count = api.Database.Games.Count(g => g.IsInstalled);
                    log.Info("ViewerBridge pushed installed list (" + count + ") → " + url);
                }
            }
            catch (OperationCanceledException)
            {
                // expected during shutdown
            }
            catch (WebException wex)
            {
                log.Error(wex, "ViewerBridge push error (WebException)");
            }
            catch (Exception ex)
            {
                log.Error(ex, "ViewerBridge push error");
            }
        }

        public void Dispose()
        {
            try
            {
                debounce.Dispose();
            }
            catch { }
            try
            {
                pushCts?.Cancel();
                pushCts?.Dispose();
            }
            catch { }
            // Lambdas attached; safe on plugin unload in SDK 6.x
        }
    }
}
