using System;
using System.IO;
using System.Windows.Controls;
using Playnite.SDK;
using Playnite.SDK.Plugins;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;
using SyncniteBridge.Services;
using SyncniteBridge.UI;

namespace SyncniteBridge
{
    /// <summary>
    /// Main plugin class for the Syncnite Bridge extension.
    /// </summary>
    public class SyncniteBridge : GenericPlugin
    {
        public override Guid Id { get; } = Guid.Parse(AppConstants.GUID);

        private static bool s_initialized = false;
        private static readonly object s_initLock = new();
        private readonly ILogger logger = LogManager.GetLogger();
        private readonly string configPath = string.Empty;
        private BridgeConfig config = null!;
        private BridgeLogger blog = null!;
        private HealthcheckService health = null!;
        private PushInstalledService pushInstalled = null!;
        private PushDeltaService pushSync = null!;
        private PullDeltaService pullSync = null!;
        private ChangeDetectionService dbEvents = null!;

        private readonly bool isActiveInstance = false;

        /// <summary>
        /// Create a new SyncniteBridge plugin instance.
        /// </summary>
        public SyncniteBridge(IPlayniteAPI api)
            : base(api)
        {
            // ---- Singleton guard ----
            lock (s_initLock)
            {
                if (s_initialized)
                {
                    // Secondary instance: do not initialize anything heavy
                    logger.Warn(
                        "[ext][singleton][WARN] Second SyncniteBridge instance detected, skipping initialization."
                    );
                    Properties = new GenericPluginProperties { HasSettings = false };
                    return;
                }

                s_initialized = true;
                isActiveInstance = true;
            }

            // ---- Real initialization (first/active instance only) ----

            configPath = Path.Combine(GetPluginUserDataPath(), AppConstants.ConfigFileName);
            config = BridgeConfig.Load(configPath) ?? new BridgeConfig();
            AuthHeaders.Set(config.AuthEmail, config.GetAuthPassword());
            blog = new BridgeLogger(config.ApiBase, BridgeVersion.Current, config.LogLevel);

            var playniteVer = PlayniteApi?.ApplicationInfo?.ApplicationVersion?.ToString();
            blog.Info("startup", "SyncniteBridge loaded");
            blog.Debug(
                "startup",
                "Versions",
                new
                {
                    plugin = AppConstants.AppName,
                    version = BridgeVersion.Current,
                    playnite = playniteVer,
                }
            );

            // Health service (source of truth for connectivity)
            var pingUrl = Combine(config.ApiBase, AppConstants.Path_Sync_Ping);
            var verifyAdminUrl = Combine(config.ApiBase, AppConstants.Path_Accounts_VerifyAdmin);
            health = new HealthcheckService(api, pingUrl, verifyAdminUrl, blog);
            health.Start();

            // Push installed (independent path)
            pushInstalled = new PushInstalledService(
                api,
                Combine(config.ApiBase, AppConstants.Path_Sync_Installed),
                blog
            );
            pushInstalled.SetHealthProvider(() => health.IsHealthy);

            // Delta sync (push/pull)
            var syncUrl = Combine(config.ApiBase, AppConstants.Path_Sync_Crud);

            // Admin-only CRUD push
            pushSync = new PushDeltaService(api, syncUrl, GetDefaultPlayniteDataRoot(), blog);
            // Only considered "healthy" if server is reachable *and* this account is admin
            pushSync.SetHealthProvider(() => health.IsHealthy && health.IsAdmin);

            // Pull sync for user + admin
            pullSync = new PullDeltaService(api, syncUrl, GetDefaultPlayniteDataRoot(), blog);
            pullSync.SetHealthProvider(() => health.IsHealthy);

            // Central DB change router -> fan out to installed + delta push
            dbEvents = new ChangeDetectionService(api, blog);
            dbEvents.GamesInstalledChanged += (s, e) => pushInstalled.OnInstalledChanged(e.Games);
            dbEvents.GamesMetadataChanged += (s, e) => pushSync.OnMetadataChanged(e.Games);
            dbEvents.GamesMediaChanged += (s, e) => pushSync.OnMediaChanged(e.Games);

            // When health flips to healthy, kick once
            health.StatusChanged += ok =>
            {
                if (!ok)
                {
                    blog.Warn("startup", "Health became unhealthy → suspend sync");
                    return;
                }

                if (health.IsAdmin)
                {
                    // Admin mode → push + admin delta
                    blog.Info("startup", "healthy in ADMIN mode → triggering push+sync");
                    pushInstalled.Trigger();
                    pushSync.Trigger();
                }
                else
                {
                    // User mode → pull changes from server into Playnite
                    blog.Info("startup", "healthy in USER mode → triggering pull sync");
                    pushInstalled.Trigger();
                    _ = pullSync.pullOnceAsync(); // fire-and-forget, handles its own logging
                }
            };

            pushSync.Start();

            Properties = new GenericPluginProperties { HasSettings = true };
        }

        /// <summary>
        /// Combine base URL and path.
        /// </summary>
        private static string Combine(string baseUrl, string path)
        {
            baseUrl = (baseUrl ?? string.Empty).TrimEnd('/');
            path = (path ?? string.Empty).TrimStart('/');
            return baseUrl + "/" + path;
        }

        /// <summary>
        /// Get the default Playnite data root path.
        /// </summary>
        private static string GetDefaultPlayniteDataRoot()
        {
            try
            {
                var roaming = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
                var candidate = Path.Combine(roaming, "Playnite");
                if (Directory.Exists(candidate))
                    return candidate;
            }
            catch { }
            return string.Empty;
        }

        /// <summary>
        /// Get main menu items for the plugin.
        /// </summary>
        public override System.Collections.Generic.IEnumerable<MainMenuItem> GetMainMenuItems(
            GetMainMenuItemsArgs args
        )
        {
            // Secondary instance: no menu
            if (!isActiveInstance)
            {
                return Array.Empty<MainMenuItem>();
            }

            return new[]
            {
                new MainMenuItem
                {
                    Description = AppConstants.AppName + " Settings",
                    Action = args =>
                    {
                        try
                        {
                            SettingsWindowFactory.BuildAndShow(
                                PlayniteApi,
                                initialApiBase: config.ApiBase,
                                getHealthText: () => health?.StatusText ?? "unknown",
                                getIsAdmin: () => health?.IsAdmin == true,
                                subscribeHealth: cb =>
                                {
                                    if (health != null)
                                        health.StatusChanged += cb;
                                },
                                unsubscribeHealth: cb =>
                                {
                                    if (health != null)
                                        health.StatusChanged -= cb;
                                },
                                onSaveApiBase: newBase =>
                                {
                                    var nb = string.IsNullOrWhiteSpace(newBase)
                                        ? config.ApiBase
                                        : newBase.Trim();
                                    if (!string.IsNullOrEmpty(nb) && !nb.EndsWith("/"))
                                        nb += "/";

                                    config.ApiBase = nb;
                                    BridgeConfig.Save(configPath, config);

                                    var syncUrl = Combine(
                                        config.ApiBase,
                                        AppConstants.Path_Sync_Crud
                                    );
                                    var pushUrl = Combine(
                                        config.ApiBase,
                                        AppConstants.Path_Sync_Installed
                                    );
                                    var pingUrl = Combine(
                                        config.ApiBase,
                                        AppConstants.Path_Sync_Ping
                                    );
                                    var verifyAdminUrl = Combine(
                                        config.ApiBase,
                                        AppConstants.Path_Accounts_VerifyAdmin
                                    );

                                    pushInstalled.UpdateEndpoint(pushUrl);
                                    pushSync.UpdateEndpoints(syncUrl);
                                    pullSync.UpdateEndpoint(syncUrl);
                                    health.UpdateEndpoints(pingUrl, verifyAdminUrl);
                                    blog.UpdateApiBase(config.ApiBase);

                                    blog.Info("config", "ApiBase updated");
                                    blog.Debug(
                                        "config",
                                        "New ApiBase",
                                        new { apiBase = config.ApiBase }
                                    );

                                    if (health.IsHealthy)
                                    {
                                        pushInstalled.PushNow();
                                        pushSync.Trigger();
                                    }
                                },
                                onPushInstalled: () =>
                                {
                                    pushInstalled.PushNow();
                                    blog.Info("push", "Manual push requested");
                                },
                                onSyncLibrary: () =>
                                {
                                    pushSync.HardSync();
                                    blog.Info("sync", "Manual sync requested");
                                },
                                initialEmail: config.AuthEmail,
                                initialPassword: config.GetAuthPassword(),
                                onSaveCredentials: (email, password) =>
                                {
                                    config.AuthEmail = email ?? "";
                                    config.SetAuthPassword(password ?? "");
                                    BridgeConfig.Save(configPath, config);
                                    AuthHeaders.Set(config.AuthEmail, config.GetAuthPassword());

                                    // Optional UX: if creds just became valid and server is healthy, kick once.
                                    if (health.IsHealthy == true)
                                    {
                                        pushInstalled.PushNow();
                                        if (health.IsAdmin)
                                            pushSync.Trigger();
                                        else
                                            _ = pullSync.pullOnceAsync(); // fire-and-forget
                                    }
                                }
                            );
                        }
                        catch (Exception ex)
                        {
                            blog?.Error("ui", "Failed to open settings window", err: ex.Message);
                        }
                    },
                },
            };
        }

        /// <summary>
        /// Dispose resources on plugin unload.
        /// </summary>
        public override void Dispose()
        {
            base.Dispose();

            // Only active instance owns resources
            if (!isActiveInstance)
                return;

            try
            {
                pushInstalled?.Dispose();
            }
            catch { }
            try
            {
                pushSync?.Dispose();
            }
            catch { }
            try
            {
                health?.Dispose();
            }
            catch { }
            try
            {
                dbEvents?.Dispose();
            }
            catch { }
            try
            {
                blog?.Info("shutdown", "SyncniteBridge disposing");
                blog?.Dispose();
            }
            catch { }
        }
    }
}
