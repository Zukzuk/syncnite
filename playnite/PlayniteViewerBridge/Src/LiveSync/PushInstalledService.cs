using System;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Timers;
using Playnite.SDK;
using PlayniteViewerBridge.Constants;
using PlayniteViewerBridge.Helpers;

namespace PlayniteViewerBridge.LiveSync
{
    internal sealed class PushInstalledService : IDisposable
    {
        private readonly IPlayniteAPI api;
        private string endpoint;
        private readonly System.Timers.Timer debounce;
        private readonly ILogger log = LogManager.GetLogger();
        private CancellationTokenSource pushCts;
        private readonly RemoteLogClient rlog;
        private readonly HttpClient http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };

        private Func<bool> isHealthy = () => true; // injected

        public PushInstalledService(IPlayniteAPI api, string endpoint, RemoteLogClient rlog = null)
        {
            this.api = api;
            this.endpoint = (endpoint ?? "").TrimEnd('/');
            this.rlog = rlog;

            debounce = new System.Timers.Timer(AppConstants.DebounceMs_Pusher)
            {
                AutoReset = false,
            };
            debounce.Elapsed += (s, e) => _ = PushInstalledAsync();

            api.Database.Games.ItemCollectionChanged += (s, e) => Trigger();
            api.Database.Games.ItemUpdated += (s, e) => Trigger();
        }

        public void SetHealthProvider(Func<bool> provider) => isHealthy = provider ?? (() => true);

        public void UpdateEndpoint(string endpoint)
        {
            this.endpoint = (endpoint ?? "").TrimEnd('/');
            rlog?.Enqueue(
                RemoteLog.Build(
                    "debug",
                    "push",
                    "Endpoint updated",
                    data: new { endpoint = this.endpoint }
                )
            );
        }

        public void Trigger()
        {
            if (!isHealthy())
            {
                rlog?.Enqueue(RemoteLog.Build("debug", "push", "Skipped trigger: unhealthy"));
                return;
            }
            try
            {
                debounce.Stop();
            }
            catch { }
            try
            {
                debounce.Start();
            }
            catch { }
        }

        public void PushNow()
        {
            if (!isHealthy())
            {
                rlog?.Enqueue(RemoteLog.Build("debug", "push", "Skipped manual push: unhealthy"));
                return;
            }
            try
            {
                debounce.Stop();
            }
            catch { }
            _ = PushInstalledAsync();
        }

        private string BuildPayload()
        {
            var obj = new
            {
                installed = api
                    .Database.Games.Where(g => g.IsInstalled)
                    .Select(g => g.Id.ToString())
                    .ToArray(),
            };
            return Playnite.SDK.Data.Serialization.ToJson(obj);
        }

        private async Task PushInstalledAsync()
        {
            if (!isHealthy())
            {
                rlog?.Enqueue(RemoteLog.Build("debug", "push", "Abort push: became unhealthy"));
                return;
            }

            CancellationTokenSource cts = null;
            try
            {
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
                var content = new StringContent(payload, Encoding.UTF8, "application/json");

                rlog?.Enqueue(RemoteLog.Build("info", "push", "Pushing installed list"));
                using var req = new HttpRequestMessage(HttpMethod.Post, endpoint)
                {
                    Content = content,
                };

                var sendTask = http.SendAsync(req, ct);
                var timeoutTask = Task.Delay(AppConstants.PushTimeoutMs, ct);
                var completed = await Task.WhenAny(sendTask, timeoutTask).ConfigureAwait(false);
                if (completed != sendTask)
                {
                    try
                    {
                        cts.Cancel();
                    }
                    catch { }
                    log.Warn("ViewerBridge push timed out.");
                    rlog?.Enqueue(
                        RemoteLog.Build(
                            "warn",
                            "push",
                            "Push timed out",
                            data: new { timeoutMs = AppConstants.PushTimeoutMs }
                        )
                    );
                    return;
                }

                var resp = await sendTask.ConfigureAwait(false);
                resp.EnsureSuccessStatusCode();

                int count = api.Database.Games.Count(g => g.IsInstalled);
                log.Info($"ViewerBridge pushed installed list ({count}) → {endpoint}");
                rlog?.Enqueue(RemoteLog.Build("info", "push", "Push OK", data: new { count }));
            }
            catch (OperationCanceledException) { }
            catch (HttpRequestException hex)
            {
                log.Error(hex, "ViewerBridge push error (HttpRequestException)");
                rlog?.Enqueue(
                    RemoteLog.Build("warn", "push", "Push HttpRequestException", err: hex.Message)
                );
            }
            catch (Exception ex)
            {
                log.Error(ex, "ViewerBridge push error");
                rlog?.Enqueue(RemoteLog.Build("error", "push", "Push error", err: ex.Message));
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
            try
            {
                http.Dispose();
            }
            catch { }
        }
    }
}
