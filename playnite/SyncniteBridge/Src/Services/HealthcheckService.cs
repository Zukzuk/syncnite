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
        private enum HealthState
        {
            Unreachable,
            VersionMismatch,
            Healthy,
        }

        public string StatusText
        {
            get
            {
                switch (lastState)
                {
                    case HealthState.Healthy:
                        return AppConstants.HealthStatusHealthy;

                    case HealthState.VersionMismatch:
                        // Always start with the base label so the UI can detect the state.
                        var baseLabel = AppConstants.HealthStatusVersionMismatch;

                        if (
                            string.IsNullOrEmpty(lastServerVersion)
                            || string.IsNullOrEmpty(lastExtVersion)
                        )
                        {
                            return baseLabel;
                        }

                        var cmp = CompareVersions(lastServerVersion, lastExtVersion);
                        if (cmp < 0)
                        {
                            // server older than extension
                            return $"{baseLabel} (server {lastServerVersion}, ext {lastExtVersion} – please update server)";
                        }
                        else if (cmp > 0)
                        {
                            // extension older than server
                            return $"{baseLabel} (server {lastServerVersion}, ext {lastExtVersion} – please install new extension)";
                        }

                        return baseLabel;

                    default:
                        return AppConstants.HealthStatusUnreachable;
                }
            }
        }

        // Only "fully healthy" (reachable + version match) counts as healthy for sync.
        public bool IsHealthy => lastState == HealthState.Healthy;
        public bool IsAdmin => lastIsAdmin;
        public event Action<bool> StatusChanged = delegate { };

        private readonly IPlayniteAPI api;
        private readonly ILogger log = LogManager.GetLogger();
        private readonly ExtensionHttpClient http;
        private readonly Timer timer;
        private string pingUrl;
        private string verifyAdminUrl;
        private HealthState lastState = HealthState.Unreachable;
        private bool lastIsAdmin;
        private string? lastServerVersion;
        private string? lastExtVersion;
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
            // 1) Reachability + server version from /ping
            var (reachable, serverVersionRaw) = await http.PingWithVersionAsync(pingUrl)
                .ConfigureAwait(false);

            var extVersionRaw = BridgeVersion.Current;
            var serverVersion = NormalizeVersion(serverVersionRaw);
            var extVersion = NormalizeVersion(extVersionRaw);

            bool versionsMatch = false;
            bool hasBothVersions =
                !string.IsNullOrEmpty(serverVersion) && !string.IsNullOrEmpty(extVersion);

            if (reachable && hasBothVersions)
            {
                versionsMatch = string.Equals(
                    serverVersion,
                    extVersion,
                    StringComparison.OrdinalIgnoreCase
                );
            }

            // 2) Admin check only if the server is reachable (even if version-mismatched)
            bool isAdminNow = false;
            if (reachable && !string.IsNullOrWhiteSpace(verifyAdminUrl))
            {
                var res = await http.IsAdminAsync(verifyAdminUrl).ConfigureAwait(false);
                isAdminNow = res == true;
            }

            // 3) Compute new health state
            HealthState newState;
            if (!reachable)
            {
                newState = HealthState.Unreachable;
            }
            else if (versionsMatch)
            {
                newState = HealthState.Healthy;
            }
            else
            {
                newState = HealthState.VersionMismatch;
            }

            var statusChanged = newState != lastState;
            var roleChanged = isAdminNow != lastIsAdmin;

            if (!statusChanged && !roleChanged)
            {
                return; // nothing changed; avoid noisy events
            }

            lastState = newState;
            lastIsAdmin = isAdminNow;
            lastServerVersion = serverVersion;
            lastExtVersion = extVersion;

            // 4) Notifications
            string msg;
            NotificationType type;

            switch (newState)
            {
                case HealthState.Healthy:
                    msg = AppConstants.HealthMsgHealthy;
                    type = NotificationType.Info;
                    break;

                case HealthState.VersionMismatch:
                    // Decide who is "old" if we can compare
                    if (hasBothVersions)
                    {
                        var cmp = CompareVersions(serverVersion, extVersion);
                        if (cmp < 0)
                        {
                            msg =
                                $"{AppConstants.AppName}: old server version ({serverVersion}) – extension is {extVersion}, please update the server.";
                        }
                        else if (cmp > 0)
                        {
                            msg =
                                $"{AppConstants.AppName}: old extension version ({extVersion}) – server is {serverVersion}, please update the extension.";
                        }
                        else
                        {
                            msg = AppConstants.HealthMsgVersionMismatch;
                        }
                    }
                    else
                    {
                        msg = AppConstants.HealthMsgVersionMismatch;
                    }

                    type = NotificationType.Error; // Playnite doesn't have a "warning" notification type
                    break;

                default:
                    msg = AppConstants.HealthMsgUnreachable;
                    type = NotificationType.Error;
                    break;
            }

            api.Notifications.Add(AppConstants.Notif_Health, msg, type);

            // 5) Logging
            if (newState == HealthState.Healthy)
            {
                var mode = isAdminNow ? "admin" : "user";
                blog?.Info(
                    "health",
                    "Server healthy",
                    new
                    {
                        mode,
                        serverVersion,
                        extensionVersion = extVersion,
                    }
                );
            }
            else if (newState == HealthState.VersionMismatch)
            {
                blog?.Warn(
                    "health",
                    "Version mismatch",
                    new { serverVersion = serverVersionRaw, extensionVersion = extVersionRaw }
                );
            }
            else
            {
                blog?.Warn("health", "Server unreachable", new { url = pingUrl });
            }

            // Only report "healthy" to listeners when we are fully healthy (reachable + version match).
            StatusChanged.Invoke(IsHealthy);
        }

        private static string NormalizeVersion(string? v)
        {
            if (string.IsNullOrWhiteSpace(v))
                return string.Empty;

            v = v.Trim();

            if (v.StartsWith("v", StringComparison.OrdinalIgnoreCase))
                v = v.Substring(1);

            return v;
        }

        private static int CompareVersions(string a, string b)
        {
            a = NormalizeVersion(a);
            b = NormalizeVersion(b);

            if (Version.TryParse(a, out var va) && Version.TryParse(b, out var vb))
            {
                return va.CompareTo(vb);
            }

            // Fallback: simple ordinal compare
            return string.CompareOrdinal(a, b);
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
