using System;
using System.IO;
using System.Timers;
using Playnite.SDK;
using Playnite.SDK.Plugins;

namespace PlayniteViewerBridge
{
    public class PlayniteViewerBridge : GenericPlugin
    {
        // Must match extension.yaml Id
        public override Guid Id { get; } = Guid.Parse("a85f0db8-39f4-40ea-9e03-bc5be2298c89");

        private readonly ILogger logger = LogManager.GetLogger();
        private InstalledPusher pusher;
        private BridgeConfig config;
        private readonly string configPath;
        private readonly System.Timers.Timer startupKick; // delayed initial push (no OnApplicationStarted in SDK 6.x)

        public PlayniteViewerBridge(IPlayniteAPI api)
            : base(api)
        {
            // Load / create config
            configPath = Path.Combine(GetPluginUserDataPath(), "config.json");
            config = BridgeConfig.Load(configPath);

            // Start the installed pusher
            pusher = new InstalledPusher(api, config.Endpoint);

            // Kick an initial push a few seconds after startup
            startupKick = new System.Timers.Timer(3000) { AutoReset = false };
            startupKick.Elapsed += (s, e) =>
            {
                try
                {
                    pusher.Trigger();
                }
                catch { }
            };
            startupKick.Start();

            Properties = new GenericPluginProperties { HasSettings = false };
        }

        // No OnApplicationStarted override in Playnite 6.x
        public override System.Collections.Generic.IEnumerable<MainMenuItem> GetMainMenuItems(
            GetMainMenuItemsArgs args
        )
        {
            return new[]
            {
                new MainMenuItem
                {
                    Description = "ViewerBridge",
                    Action = _ =>
                    {
                        try
                        {
                            SettingsWindowFactory.BuildAndShow(
                                PlayniteApi,
                                initialEndpoint: config.Endpoint,
                                onSave: newEp =>
                                {
                                    config.Endpoint = newEp;
                                    BridgeConfig.Save(configPath, config);
                                    pusher?.UpdateEndpoint(newEp);
                                    logger.Info("ViewerBridge: endpoint updated to " + newEp);
                                },
                                onPush: () =>
                                {
                                    try
                                    {
                                        pusher?.PushNow();
                                    }
                                    catch { }
                                }
                            );
                        }
                        catch (Exception ex)
                        {
                            logger.Error(ex, "ViewerBridge: failed to open settings window");
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
                startupKick?.Dispose();
            }
            catch { }
            try
            {
                pusher?.Dispose();
            }
            catch { }
        }
    }
}
