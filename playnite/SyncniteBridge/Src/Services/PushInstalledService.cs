using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Timers;
using Playnite.SDK;
using Playnite.SDK.Models;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Handles pushing the "installed" list to the server.
    /// Triggered via ChangeDetection instead of directly wiring Playnite events here.
    /// </summary>
    internal sealed class PushInstalledService : IDisposable
    {
        private readonly IPlayniteAPI api;
        private string endpoint;
        private readonly System.Timers.Timer debounce;
        private readonly ILogger log = LogManager.GetLogger();
        private CancellationTokenSource? pushCts;
        private readonly BridgeLogger? blog;
        private readonly HttpClient http = new HttpClient();
        private Func<bool> isHealthy = () => true;

        /// <summary>
        /// Initializes a new instance of the <see cref="PushInstalledService"/> class.
        /// </summary>
        public PushInstalledService(IPlayniteAPI api, string endpoint, BridgeLogger? blog = null)
        {
            this.api = api;
            this.endpoint = (endpoint ?? "").TrimEnd('/');
            this.blog = blog;

            AuthHeaders.Apply(http);

            debounce = new System.Timers.Timer(AppConstants.Debounce_Ms) { AutoReset = false };
            debounce.Elapsed += (s, e) => _ = PushInstalledAsync();
        }

        /// <summary>
        /// Called by ChangeDetection whenever the installed list changes.
        /// </summary>
        public void OnInstalledChanged(IReadOnlyList<Game> _)
        {
            // We don't need the concrete list here – we always push the full installed set.
            Trigger();
        }

        /// <summary>
        /// Sets the health check provider.
        /// </summary>
        public void SetHealthProvider(Func<bool> provider) => isHealthy = provider ?? (() => true);

        /// <summary>
        /// Update the push endpoint URL.
        /// </summary>
        public void UpdateEndpoint(string endpoint)
        {
            this.endpoint = (endpoint ?? "").TrimEnd('/');
            blog?.Debug("push", "Endpoint updated", new { endpoint = this.endpoint });
        }

        /// <summary>
        /// Trigger a debounced push.
        /// </summary>
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

        /// <summary>
        /// Immediately push the installed list.
        /// </summary>
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

        /// <summary>
        /// Build the JSON payload for the installed list.
        /// </summary>
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

        /// <summary>
        /// Push the installed list to the remote endpoint.
        /// </summary>
        private async Task PushInstalledAsync()
        {
            if (!isHealthy())
            {
                blog?.Debug("push", "Abort push: became unhealthy");
                return;
            }

            CancellationTokenSource? cts = null;
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

                blog?.Info("push", "Pushing installed list");
                blog?.Debug("push", "Payload size", new { bytes = payload.Length, endpoint });

                var resp = await http.PostAsync(endpoint, content, ct).ConfigureAwait(false);
                if (!resp.IsSuccessStatusCode)
                {
                    var msg = $"Installed sync failed: {resp.StatusCode}";
                    log.Warn($"[SyncniteBridge] {msg}");
                    blog?.Warn("push", msg, new { status = resp.StatusCode });
                    api.Notifications.Add(
                        AppConstants.Notif_Sync_Error,
                        msg,
                        NotificationType.Error
                    );
                    return;
                }

                blog?.Info("push", "Installed list synced");
            }
            catch (TaskCanceledException)
            {
                blog?.Debug("push", "Installed push cancelled (replaced by newer run)");
            }
            catch (Exception ex)
            {
                var msg = $"Installed sync failed: {ex.Message}";
                log.Error(ex, "[SyncniteBridge] " + msg);
                blog?.Error("push", "Installed sync failed", err: ex.Message);
                api.Notifications.Add(AppConstants.Notif_Sync_Error, msg, NotificationType.Error);
            }
        }

        public void Dispose()
        {
            try
            {
                debounce?.Dispose();
            }
            catch { }
            try
            {
                pushCts?.Cancel();
                pushCts?.Dispose();
            }
            catch { }
        }
    }
}
