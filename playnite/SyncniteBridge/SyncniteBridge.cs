using System;
using System.IO;
using System.Windows.Controls;
using Playnite.SDK;
using Playnite.SDK.Plugins;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;
using SyncniteBridge.Services;

namespace SyncniteBridge
{
    /// <summary>
    /// Main plugin class for the Syncnite Bridge extension.
    /// </summary>
    public class SyncniteBridge : GenericPlugin
    {
        public override Guid Id { get; } = Guid.Parse(AppConstants.GUID);

        private readonly ILogger logger = LogManager.GetLogger();
        private BridgeLogger? blog;
        private PushInstalledService pusher;
        private BridgeConfig config;
        private readonly string configPath;
        private DeltaSyncService deltaSync;
        private HealthcheckService health;

        /// <summary>
        /// Create a new SyncniteBridge plugin instance.
        /// </summary>
        public SyncniteBridge(IPlayniteAPI api)
            : base(api)
        {
            configPath = Path.Combine(GetPluginUserDataPath(), AppConstants.ConfigFileName);
            config = BridgeConfig.Load(configPath);
            AuthHeaders.Set(config.AuthEmail, config.GetAuthPassword());

            // Bridge logger replaces RemoteLogClient
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
            var pingUrl = Combine(config.ApiBase, AppConstants.Path_Syncnite_Ping);
            health = new HealthcheckService(api, pingUrl, blog);
            health.Start();

            // Push installed (independent path)
            pusher = new PushInstalledService(
                api,
                Combine(config.ApiBase, AppConstants.Path_Syncnite_Push),
                blog
            );
            pusher.SetHealthProvider(() => health.IsHealthy);

            // Delta sync (ZIP upload)
            var syncUrl = Combine(config.ApiBase, AppConstants.Path_Syncnite_Sync);
            deltaSync = new DeltaSyncService(api, syncUrl, GetDefaultPlayniteDataRoot(), blog);
            deltaSync.SetHealthProvider(() => health.IsHealthy);

            // When health flips to healthy, kick once
            health.StatusChanged += ok =>
            {
                if (ok)
                {
                    blog.Info("startup", "Health became healthy → triggering push+sync");
                    pusher.Trigger();
                    deltaSync.Trigger();
                }
                else
                {
                    blog.Warn("startup", "Health became unhealthy → suspend push+sync");
                }
            };

            deltaSync.Start();

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

        public override ISettings GetSettings(bool firstRunSettings) => null;

        public override UserControl GetSettingsView(bool firstRunSettings) => null;

        /// <summary>
        /// Get main menu items.
        /// </summary>
        public override System.Collections.Generic.IEnumerable<MainMenuItem> GetMainMenuItems(
            GetMainMenuItemsArgs args
        )
        {
            return new[]
            {
                new MainMenuItem
                {
                    Description = AppConstants.MenuTitle,
                    Action = _ =>
                    {
                        try
                        {
                            SettingsWindowFactory.BuildAndShow(
                                PlayniteApi,
                                initialApiBase: config.ApiBase,
                                getHealthText: () => health?.StatusText ?? "unknown",
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
                                        AppConstants.Path_Syncnite_Sync
                                    );
                                    var pushUrl = Combine(
                                        config.ApiBase,
                                        AppConstants.Path_Syncnite_Push
                                    );
                                    var pingUrl = Combine(
                                        config.ApiBase,
                                        AppConstants.Path_Syncnite_Ping
                                    );

                                    pusher?.UpdateEndpoint(pushUrl);
                                    deltaSync?.UpdateEndpoints(syncUrl);
                                    health?.UpdateEndpoint(pingUrl);
                                    blog?.UpdateApiBase(config.ApiBase);

                                    blog.Info("config", "ApiBase updated");
                                    blog.Debug(
                                        "config",
                                        "New ApiBase",
                                        new { apiBase = config.ApiBase }
                                    );

                                    if (health.IsHealthy)
                                    {
                                        pusher?.PushNow();
                                        deltaSync?.Trigger();
                                    }
                                },
                                onPushInstalled: () =>
                                {
                                    pusher?.PushNow();
                                    blog.Info("push", "Manual push requested");
                                },
                                onSyncLibrary: () =>
                                {
                                    deltaSync?.Trigger();
                                    blog.Info("sync", "Manual sync requested");
                                },
                                // NEW:
                                initialEmail: config.AuthEmail,
                                initialPassword: config.GetAuthPassword(),
                                onSaveCredentials: (email, password) =>
                                {
                                    config.AuthEmail = email ?? "";
                                    config.SetAuthPassword(password ?? "");
                                    BridgeConfig.Save(configPath, config);
                                    AuthHeaders.Set(config.AuthEmail, config.GetAuthPassword());

                                    // Optional UX: if creds just became valid and server is healthy, kick once.
                                    if (health?.IsHealthy == true)
                                    {
                                        pusher?.PushNow();
                                        deltaSync?.Trigger();
                                    }
                                }
                            );
                        }
                        catch (Exception ex)
                        {
                            blog.Error("ui", "Failed to open settings window", err: ex.Message);
                        }
                    },
                },
            };
        }

        public override void Dispose()
        {
            base.Dispose();
            try
            {
                pusher?.Dispose();
            }
            catch { }
            try
            {
                deltaSync?.Dispose();
            }
            catch { }
            try
            {
                health?.Dispose();
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
