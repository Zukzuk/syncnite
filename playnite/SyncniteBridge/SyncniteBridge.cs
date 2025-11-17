using System;
using System.IO;
using System.Threading;
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
        private readonly string configPath = string.Empty;
        private BridgeConfig config = null!;
        private BridgeLogger blog = null!;
        private HealthcheckService health = null!;
        private PushInstalledService pushInstalled = null!;
        private PushDeltaService pushSync = null!;
        private PullDeltaService pullSync = null!;
        private ChangeDetectionService dbEvents = null!;
        private readonly bool isActiveInstance = false;
        private readonly Timer? pullTimer = null;

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
                    blog.Warn(
                        "startup",
                        "Secondary SyncniteBridge instance loaded; no services started."
                    );
                    Properties = new GenericPluginProperties { HasSettings = false };
                    return;
                }

                s_initialized = true;
                isActiveInstance = true;
            }

            configPath = Path.Combine(GetPluginUserDataPath(), AppConstants.ConfigFileName);
            config = BridgeConfig.Load(configPath) ?? new BridgeConfig();
            AuthHeaders.Set(config.AuthEmail, config.GetAuthPassword(), config.ClientId);
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
            var pingUrl = Combine(config.ApiBase, AppConstants.Path_Ping);
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

            // Non-admin users Pull sync
            pullSync = new PullDeltaService(api, syncUrl, GetDefaultPlayniteDataRoot(), blog);
            // Only considered "healthy" if server is reachable AND this account is NOT admin
            pullSync.SetHealthProvider(() => health.IsHealthy && !health.IsAdmin);

            // periodic pull every 60_000 ms (1 minute), initially disabled
            pullTimer = new Timer(
                _ => pullSync.pullOnceAsync().ConfigureAwait(false),
                null,
                Timeout.Infinite,
                Timeout.Infinite
            );

            // Central DB change router -> fan out to installed + delta push
            dbEvents = new ChangeDetectionService(api, blog);
            dbEvents.GamesInstalledChanged += (s, e) => pushInstalled.OnInstalledChanged(e.Games);
            dbEvents.GamesMetadataChanged += (s, e) => pushSync.OnMetadataChanged(e.Games);
            dbEvents.GamesMediaChanged += (s, e) => pushSync.OnMediaChanged(e.Games);

            // When health flips to healthy, kick once
            health.StatusChanged += ok =>
            {
                if (health.IsAdmin && !config.IsAdminInstall)
                {
                    config.IsAdminInstall = true;
                    BridgeConfig.Save(configPath, config);
                    blog.Info("admin", "Marked this Playnite installation as the admin install.");
                }

                if (!ok)
                {
                    blog.Warn("startup", "Health became unhealthy → suspend sync");
                    try
                    {
                        pullTimer?.Change(Timeout.Infinite, Timeout.Infinite);
                    }
                    catch { }

                    return;
                }

                if (health.IsAdmin)
                {
                    // Admin mode → push only, no periodic pull
                    blog.Info("startup", "healthy in ADMIN mode → triggering push+sync");
                    pushInstalled.Trigger();
                    pushSync.Trigger();

                    try
                    {
                        // Ensure no pull polling while admin
                        pullTimer?.Change(Timeout.Infinite, Timeout.Infinite);
                    }
                    catch { }
                }
                else
                {
                    // User mode → pull changes from server into Playnite
                    blog.Info("startup", "healthy in USER mode → triggering pull sync");
                    pushInstalled.Trigger();
                    _ = pullSync.pullOnceAsync(); // fire-and-forget

                    try
                    {
                        pullTimer?.Change(
                            AppConstants.PushSyncInterval_Ms,
                            AppConstants.PushSyncInterval_Ms
                        );
                    }
                    catch { }
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
                                    var pingUrl = Combine(config.ApiBase, AppConstants.Path_Ping);
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
                                isAdminInstall: config.IsAdminInstall,
                                onSaveCredentials: (email, password) =>
                                {
                                    config.AuthEmail = email ?? "";
                                    config.SetAuthPassword(password ?? "");
                                    BridgeConfig.Save(configPath, config);
                                    AuthHeaders.Set(config.AuthEmail, config.GetAuthPassword(), config.ClientId);

                                    if (health.IsHealthy)
                                    {
                                        pushInstalled.PushNow();
                                        if (health.IsAdmin)
                                            pushSync.Trigger();
                                        else
                                            _ = pullSync.pullOnceAsync();
                                    }
                                },
                                onReleaseAdmin: () =>
                                {
                                    try
                                    {
                                        var http = new ExtensionHttpClient(
                                            blog,
                                            TimeSpan.FromSeconds(30)
                                        );
                                        var url = Combine(config.ApiBase, "accounts/admin/release");
                                        var ok = http.ReleaseAdminAsync(url)
                                            .GetAwaiter()
                                            .GetResult();

                                        if (!ok)
                                        {
                                            PlayniteApi.Dialogs.ShowErrorMessage(
                                                "Failed to release admin. Check the SyncniteBridge log for details.",
                                                AppConstants.AppName
                                            );
                                            return;
                                        }

                                        // Reset local admin state
                                        config.AuthEmail = "";
                                        config.SetAuthPassword("");
                                        config.IsAdminInstall = false;
                                        BridgeConfig.Save(configPath, config);
                                        AuthHeaders.Set(
                                            config.AuthEmail,
                                            config.GetAuthPassword(),
                                            config.ClientId
                                        );

                                        PlayniteApi.Dialogs.ShowMessage(
                                            "Admin account has been released on the server.\n\n"
                                                + "You can now register a new admin from another installation.",
                                            AppConstants.AppName
                                        );
                                    }
                                    catch (Exception ex)
                                    {
                                        blog?.Error(
                                            "admin",
                                            "Release admin failed",
                                            err: ex.Message
                                        );
                                        PlayniteApi.Dialogs.ShowErrorMessage(
                                            $"Error releasing admin: {ex.Message}",
                                            AppConstants.AppName
                                        );
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
                pullTimer?.Dispose();
            }
            catch { }
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
