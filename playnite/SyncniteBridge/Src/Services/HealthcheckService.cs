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
        private readonly IPlayniteAPI api;
        private readonly ILogger log = LogManager.GetLogger();
        private readonly HttpClientEx http;
        private readonly Timer timer;
        private string pingUrl;
        private bool lastOk;
        public string StatusText =>
            lastOk ? AppConstants.HealthStatusHealthy : AppConstants.HealthStatusUnreachable;
        public bool IsHealthy => lastOk;

        private readonly BridgeLogger blog;

        public event Action<bool> StatusChanged; // new status (true=healthy)

        public HealthcheckService(IPlayniteAPI api, string pingUrl, BridgeLogger blog = null)
        {
            this.api = api;
            this.pingUrl = pingUrl;
            this.blog = blog;
            http = new HttpClientEx(blog);
            timer = new Timer(AppConstants.HealthcheckIntervalMs) { AutoReset = true };
            timer.Elapsed += async (s, e) => await TickAsync();
        }

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
                    new { pingUrl, intervalMs = AppConstants.HealthcheckIntervalMs }
                );
                await TickAsync().ConfigureAwait(false);
            });
        }

        public void UpdateEndpoint(string newPingUrl)
        {
            pingUrl = newPingUrl;
            blog?.Debug("health", "Ping endpoint updated", new { pingUrl });
            _ = TickAsync();
        }

        private async Task TickAsync()
        {
            var ok = await http.PingAsync(pingUrl).ConfigureAwait(false);
            if (ok != lastOk)
            {
                lastOk = ok;
                var msg = ok ? AppConstants.HealthMsgHealthy : AppConstants.HealthMsgUnreachable;
                var type = ok ? NotificationType.Info : NotificationType.Error;
                api.Notifications.Add(AppConstants.Notif_Health, msg, type);

                if (ok)
                {
                    blog?.Info("health", "server healthy");
                    blog?.Debug("health", "server reachable", new { pingUrl });
                }
                else
                {
                    blog?.Warn("health", "server unreachable", new { pingUrl });
                }

                try
                {
                    StatusChanged?.Invoke(ok);
                }
                catch { }
            }
        }

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
