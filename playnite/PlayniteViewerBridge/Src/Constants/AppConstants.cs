using System;

namespace PlayniteViewerBridge.Constants
{
    internal static class AppConstants
    {
        // Config defaults
        public const string GUID = "a85f0db8-39f4-40ea-9e03-bc5be2298c89";
        public const string DefaultApiBase = "http://localhost:3003/api/";

        // Endpoints (match server)
        public const string Path_PlayniteLive_Push = "playnite/live/push";
        public const string Path_PlayniteLive_Ping = "playnite/live/ping";
        public const string Path_PlayniteLive_Log = "playnite/live/log";
        public const string Path_PlayniteLive_Sync = "playnite/live/sync";
        public const string Path_PlayniteLive_Index = "playnite/live/index";

        // Folders / zip mapping
        public const string LibraryDirName = "library";
        public const string LibraryFilesDirName = "library/files";
        public const string ZipDirName = "library";
        public const string ZipFilesDirName = "libraryfiles";

        // Timing
        public const int DebounceMs_LiveSync = 1200;
        public const int DebounceMs_Pusher = 1200;
        public const int HealthcheckIntervalMs = 60_000; // once a minute
        public const int PushTimeoutMs = 20_000;

        // Notifications
        public const string Notif_Health = "viewerbridge_health";
        public const string Notif_LiveSync_Error = "viewerbridge_livesync_error";

        // Temp
        public const string TempDirName = "viewerbridge_work";

        // Config filename
        public const string ConfigFileName = "viewerbridge.json";
    }
}
