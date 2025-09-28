using System;
using System.IO;
using System.Windows.Controls;
using Playnite.SDK;
using Playnite.SDK.Plugins;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;
using SyncniteBridge.LiveSync;

namespace SyncniteBridge
{
    public class SyncniteBridge : GenericPlugin
    {
        public override Guid Id { get; } = Guid.Parse(AppConstants.GUID);

        private readonly ILogger logger = LogManager.GetLogger();
        private readonly RemoteLogClient rlog;
        private PushInstalledService pusher;
        private BridgeConfig config;
        private readonly string configPath;

        private LiveDeltaSyncService liveSync;
        private HealthcheckService health;

        public SyncniteBridge(IPlayniteAPI api)
            : base(api)
        {
            configPath = Path.Combine(GetPluginUserDataPath(), AppConstants.ConfigFileName);
            config = BridgeConfig.Load(configPath);

            var logUrl = Combine(config.ApiBase, AppConstants.Path_Syncnite_Log);
            rlog = new RemoteLogClient(logUrl);
            var playniteVer = PlayniteApi?.ApplicationInfo?.ApplicationVersion?.ToString();
            var appVer = BridgeVersion.Current;
            rlog.Enqueue(
                RemoteLog.Build(
                    "info",
                    "startup",
                    "SyncniteBridge loaded",
                    data: new
                    {
                        plugin = "SyncniteBridge",
                        version = appVer,
                        playnite = playniteVer,
                    }
                )
            );

            // Health first (source of truth)
            var pingUrl = Combine(config.ApiBase, AppConstants.Path_Syncnite_Ping);
            health = new HealthcheckService(api, pingUrl, rlog);
            health.Start();

            // Pusher + LiveSync (gated by health)
            pusher = new PushInstalledService(
                api,
                Combine(config.ApiBase, AppConstants.Path_Syncnite_Push),
                rlog
            );

            var syncUrl = Combine(config.ApiBase, AppConstants.Path_Syncnite_Sync);
            var indexUrl = Combine(config.ApiBase, AppConstants.Path_Syncnite_Index);

            liveSync = new LiveDeltaSyncService(api, syncUrl, GetDefaultPlayniteDataRoot(), rlog);
            liveSync.UpdateEndpoints(syncUrl, indexUrl);

            // Gate both services on health
            pusher.SetHealthProvider(() => health.IsHealthy);
            liveSync.SetHealthProvider(() => health.IsHealthy);

            liveSync.Start();

            // When we flip to healthy (or first time becomes healthy), push & sync once
            health.StatusChanged += ok =>
            {
                if (ok)
                {
                    try
                    {
                        rlog.Enqueue(
                            RemoteLog.Build(
                                "info",
                                "startup",
                                "Health became healthy → triggering push+sync"
                            )
                        );
                        pusher.PushNow();
                        liveSync.Trigger();
                    }
                    catch { }
                }
                else
                {
                    rlog.Enqueue(
                        RemoteLog.Build(
                            "warn",
                            "startup",
                            "Health became unhealthy → suspend push/sync"
                        )
                    );
                }
            };

            Properties = new GenericPluginProperties { HasSettings = true };
        }

        private static string Combine(string baseUrl, string path)
        {
            baseUrl = (baseUrl ?? string.Empty).TrimEnd('/');
            path = (path ?? string.Empty).TrimStart('/');
            return baseUrl + "/" + path;
        }

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

        public override System.Collections.Generic.IEnumerable<MainMenuItem> GetMainMenuItems(
            GetMainMenuItemsArgs args
        )
        {
            return new[]
            {
                new MainMenuItem
                {
                    Description = "SyncniteBridge",
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
                                    {
                                        nb += "/";
                                    }
                                    config.ApiBase = nb;
                                    BridgeConfig.Save(configPath, config);

                                    var syncUrl = Combine(
                                        config.ApiBase,
                                        AppConstants.Path_Syncnite_Sync
                                    );
                                    var indexUrl = Combine(
                                        config.ApiBase,
                                        AppConstants.Path_Syncnite_Index
                                    );
                                    var pushUrl = Combine(
                                        config.ApiBase,
                                        AppConstants.Path_Syncnite_Push
                                    );
                                    var pingUrl = Combine(
                                        config.ApiBase,
                                        AppConstants.Path_Syncnite_Ping
                                    );
                                    var logUrl = Combine(
                                        config.ApiBase,
                                        AppConstants.Path_Syncnite_Log
                                    );

                                    pusher?.UpdateEndpoint(pushUrl);
                                    liveSync?.UpdateEndpoints(syncUrl, indexUrl);
                                    health?.UpdateEndpoint(pingUrl);
                                    rlog?.UpdateEndpoint(logUrl);

                                    logger.Info(
                                        $"SyncniteBridge: ApiBase updated -> {config.ApiBase}"
                                    );
                                    rlog.Enqueue(
                                        RemoteLog.Build(
                                            "info",
                                            "config",
                                            "ApiBase updated",
                                            data: new { apiBase = config.ApiBase }
                                        )
                                    );

                                    // If healthy after update, kick once
                                    if (health.IsHealthy)
                                    {
                                        pusher?.PushNow();
                                        liveSync?.Trigger();
                                    }
                                },
                                onPushInstalled: () =>
                                {
                                    try
                                    {
                                        pusher?.PushNow();
                                        rlog.Enqueue(
                                            RemoteLog.Build("info", "push", "Manual push requested")
                                        );
                                    }
                                    catch { }
                                },
                                onSyncLibrary: () =>
                                {
                                    try
                                    {
                                        liveSync?.Trigger();
                                        rlog.Enqueue(
                                            RemoteLog.Build("info", "sync", "Manual sync requested")
                                        );
                                    }
                                    catch { }
                                }
                            );
                        }
                        catch (Exception ex)
                        {
                            logger.Error(ex, "SyncniteBridge: failed to open settings window");
                            rlog.Enqueue(
                                RemoteLog.Build(
                                    "error",
                                    "ui",
                                    "Failed to open settings window",
                                    err: ex.Message
                                )
                            );
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
                liveSync?.Dispose();
            }
            catch { }
            try
            {
                health?.Dispose();
            }
            catch { }
            try
            {
                rlog?.Enqueue(RemoteLog.Build("info", "shutdown", "SyncniteBridge disposing"));
                rlog?.Dispose();
            }
            catch { }
        }
    }
}
