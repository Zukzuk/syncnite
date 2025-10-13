using System;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Timers;
using Playnite.SDK;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Watches Playnite library for installed games changes, 
    /// and pushes the updated list to a remote endpoint.
    /// </summary>
    internal sealed class PushInstalledService : IDisposable
    {
        private readonly IPlayniteAPI api;
        private string endpoint;
        private readonly System.Timers.Timer debounce;
        private readonly ILogger log = LogManager.GetLogger();
        private CancellationTokenSource pushCts;
        private readonly BridgeLogger blog;
        private readonly HttpClient http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };

        private Func<bool> isHealthy = () => true; // injected

        public PushInstalledService(IPlayniteAPI api, string endpoint, BridgeLogger blog = null)
        {
            this.api = api;
            this.endpoint = (endpoint ?? "").TrimEnd('/');
            this.blog = blog;

            AuthHeaders.Apply(http);

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
            blog?.Debug("push", "Endpoint updated", new { endpoint = this.endpoint });
        }

        public void Trigger()
        {
            if (!isHealthy())
            {
                blog?.Debug("push", "Skipped trigger: unhealthy");
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
                blog?.Debug("push", "Skipped manual push: unhealthy");
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
                blog?.Debug("push", "Abort push: became unhealthy");
                return;
            }

            CancellationTokenSource cts = null;
            try
            {
                // cancel/replace any in-flight push
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

                // Milestone: starting push
                blog?.Info("push", "Pushing installed list");

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
                    blog?.Warn(
                        "push",
                        "Push timed out",
                        new { timeoutMs = AppConstants.PushTimeoutMs }
                    );
                    return;
                }

                var resp = await sendTask.ConfigureAwait(false);
                resp.EnsureSuccessStatusCode();

                int count = api.Database.Games.Count(g => g.IsInstalled);
                // Milestone: push ok
                blog?.Info("push", "Push OK", new { count });
            }
            catch (OperationCanceledException) { }
            catch (HttpRequestException hex)
            {
                blog?.Warn("push", "Push HttpRequestException", new { err = hex.Message });
            }
            catch (Exception ex)
            {
                blog?.Error("push", "Push error", err: ex.Message);
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
