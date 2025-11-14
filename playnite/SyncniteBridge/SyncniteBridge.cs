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

        private readonly ILogger logger = LogManager.GetLogger();
        private readonly string configPath;
        private BridgeConfig config;
        private BridgeLogger blog;
        private HealthcheckService health;
        private PushInstalledService pushInstalled;
        private DeltaCRUDService deltaSync;

        /// <summary>
        /// Create a new SyncniteBridge plugin instance.
        /// </summary>
        public SyncniteBridge(IPlayniteAPI api)
            : base(api)
        {
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
            var pingUrl = Combine(config.ApiBase, AppConstants.Path_Syncnite_Ping);
            health = new HealthcheckService(api, pingUrl, blog);
            health.Start();

            // Push installed (independent path)
            pushInstalled = new PushInstalledService(
                api,
                Combine(config.ApiBase, AppConstants.Path_Syncnite_Push),
                blog
            );
            pushInstalled.SetHealthProvider(() => health.IsHealthy);

            // Delta sync (CRUD)
            var syncUrl = Combine(config.ApiBase, AppConstants.Path_Syncnite_Sync);
            deltaSync = new DeltaCRUDService(api, syncUrl, GetDefaultPlayniteDataRoot(), blog);
            deltaSync.SetHealthProvider(() => health.IsHealthy);

            // When health flips to healthy, kick once
            health.StatusChanged += ok =>
            {
                if (ok)
                {
                    blog.Info("startup", "Health became healthy → triggering push+sync");
                    pushInstalled.Trigger();
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

#pragma warning disable CS8603
        public override ISettings GetSettings(bool firstRunSettings) => null;

        public override UserControl GetSettingsView(bool firstRunSettings) => null;
#pragma warning restore CS8603

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

                                    pushInstalled.UpdateEndpoint(pushUrl);
                                    deltaSync.UpdateEndpoints(syncUrl);
                                    health.UpdateEndpoint(pingUrl);
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
                                        deltaSync.Trigger();
                                    }
                                },
                                onPushInstalled: () =>
                                {
                                    pushInstalled.PushNow();
                                    blog.Info("push", "Manual push requested");
                                },
                                onSyncLibrary: () =>
                                {
                                    deltaSync.HardSync();
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
                                        deltaSync.Trigger();
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
                pushInstalled.Dispose();
            }
            catch { }
            try
            {
                deltaSync.Dispose();
            }
            catch { }
            try
            {
                health.Dispose();
            }
            catch { }
            try
            {
                blog.Info("shutdown", "SyncniteBridge disposing");
                blog.Dispose();
            }
            catch { }
        }
    }
}
