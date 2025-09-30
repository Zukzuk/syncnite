using System;

namespace SyncniteBridge.Constants
{
    internal static class AppConstants
    {
        // Config defaults
        public const string GUID = "a85f0db8-39f4-40ea-9e03-bc5be2298c89";
        public const string DefaultApiBase = "http://localhost:3003/api/";

        // Endpoints (match server)
        public const string Path_Syncnite_Manifest = "sync/manifest"; // manifest
        public const string Path_Syncnite_Push = "sync/push"; // installed games
        public const string Path_Syncnite_Sync = "sync/up"; // sync zip upload
        public const string Path_Syncnite_Ping = "sync/ping"; // healthcheck
        public const string Path_Syncnite_Log = "sync/log"; // log to server

        // Folders / zip mapping
        public const string LibraryDirName = "library";
        public const string LibraryFilesDirName = "library/files";
        public const string ZipDirName = "library";
        public const string ZipFilesDirName = "libraryfiles";

        // Timing
        public const int DebounceMs_Sync = 1200;
        public const int DebounceMs_Pusher = 1200;
        public const int HealthcheckIntervalMs = 60_000;
        public const int PushTimeoutMs = 20_000;

        // Notifications
        public const string Notif_Health = "SyncniteBridge_health";
        public const string Notif_Sync_Error = "SyncniteBridge_sync_error";

        // Temp
        public const string TempDirName = "SyncniteBridge_Temp";

        // Config filename
        public const string ConfigFileName = "SyncniteBridgeConfig.json";
    }
}
