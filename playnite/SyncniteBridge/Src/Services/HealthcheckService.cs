using System;
using System.Threading.Tasks;
using System.Timers;
using Playnite.SDK;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Periodically pings a remote endpoint to check if the Syncnite server is reachable.
    /// Raises events and notifications on status changes.
    /// </summary>
    internal sealed class HealthcheckService : IDisposable
    {
        public string StatusText =>
            lastOk ? AppConstants.HealthStatusHealthy : AppConstants.HealthStatusUnreachable;
        public bool IsHealthy => lastOk;
        public bool IsAdmin => lastIsAdmin;
        public event Action<bool> StatusChanged = delegate { };

        private readonly IPlayniteAPI api;
        private readonly ILogger log = LogManager.GetLogger();
        private readonly ExtensionHttpClient http;
        private readonly Timer timer;
        private string pingUrl;
        private string verifyAdminUrl;
        private bool lastOk;
        private bool lastIsAdmin;
        private readonly BridgeLogger? blog;

        /// <summary>
        /// Creates a new HealthcheckService instance.
        /// </summary>
        public HealthcheckService(
            IPlayniteAPI api,
            string pingUrl,
            string verifyAdminUrl,
            BridgeLogger? blog = null
        )
        {
            this.api = api;
            this.pingUrl = pingUrl;
            this.verifyAdminUrl = verifyAdminUrl;
            this.blog = blog;
            http = new ExtensionHttpClient(blog);
            timer = new Timer(AppConstants.HealthcheckInterval_Ms) { AutoReset = true };
            timer.Elapsed += async (s, e) => await TickAsync();
        }

        /// <summary>
        /// Start periodic health checks.
        /// </summary>
        public void Start()
        {
            var rnd = new Random();
            var delay = rnd.Next(200, 1200);
            _ = Task.Run(async () =>
            {
                await Task.Delay(delay).ConfigureAwait(false);
                timer.Start();
                blog?.Info("health", "Healthcheck started");
                blog?.Debug(
                    "health",
                    "First check in ms",
                    new { pingUrl, intervalMs = AppConstants.HealthcheckInterval_Ms }
                );
                await TickAsync().ConfigureAwait(false);
            });
        }

        /// <summary>
        /// Update ping + verify/admin endpoints.
        /// </summary>
        public void UpdateEndpoints(string newPingUrl, string newVerifyAdminUrl)
        {
            pingUrl = newPingUrl;
            verifyAdminUrl = newVerifyAdminUrl;
            blog?.Debug("health", "Health endpoints updated", new { pingUrl, verifyAdminUrl });
            _ = TickAsync();
        }

        /// <summary>
        /// Perform a single health check tick.
        /// </summary>
        private async Task TickAsync()
        {
            // 1) Reachability (ping)
            var ok = await http.PingAsync(pingUrl).ConfigureAwait(false);
            bool isAdminNow = false;

            if (ok && !string.IsNullOrWhiteSpace(verifyAdminUrl))
            {
                // 2) Role check via /accounts/verify/admin
                var res = await http.IsAdminAsync(verifyAdminUrl).ConfigureAwait(false);
                isAdminNow = res == true;
            }

            var statusChanged = ok != lastOk;
            var roleChanged = isAdminNow != lastIsAdmin;

            if (!statusChanged && !roleChanged)
            {
                return; // nothing changed; avoid noisy events
            }

            lastOk = ok;
            lastIsAdmin = isAdminNow;

            var msg = ok ? AppConstants.HealthMsgHealthy : AppConstants.HealthMsgUnreachable;
            var type = ok ? NotificationType.Info : NotificationType.Error;
            api.Notifications.Add(AppConstants.Notif_Health, msg, type);

            if (ok)
            {
                var mode = isAdminNow ? "admin" : "user";
                blog?.Info("health", $"server healthy ({mode} mode)");
                blog?.Debug("health", "server reachable", new { pingUrl, isAdmin = isAdminNow });
            }
            else
            {
                blog?.Warn("health", "server unreachable");
            }

            // Consumers read IsHealthy + IsAdmin if they care
            StatusChanged(ok);
        }

        /// <summary>
        /// Dispose the service.
        /// </summary>
        public void Dispose()
        {
            try
            {
                timer?.Dispose();
            }
            catch { }
        }
    }
}
