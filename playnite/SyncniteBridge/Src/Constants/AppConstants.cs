using System;

namespace SyncniteBridge.Constants
{
    /// <summary>
    /// Application-wide constants for the Syncnite Bridge extension.
    /// </summary>
    internal static class AppConstants
    {
        // Extension GUID
        public const string GUID = "a85f0db8-39f4-40ea-9e03-bc5be2298c89";

        // Default API base
        public const string DefaultApiBase = "http://localhost:3003/api/";

        // Server endpoints (v2 CRUD)
        public const string Path_Syncnite_Sync = "sync";
        public const string Path_Syncnite_Push = "sync/installed";
        public const string Path_Syncnite_Ping = "sync/ping";
        public const string Path_Syncnite_Log = "log";

        // Common app names/labels
        public const string AppName = "SyncniteBridge";
        public const string SettingsTitle = "Syncnite Bridge Settings";
        public const string MenuTitle = "Syncnite Bridge";

        // Playnite data layout
        public const string LibraryDirName = "library";
        public const string LibraryFilesDirName = "library/files";

        // Timing
        public const int DebounceMs_Sync = 1200;
        public const int DebounceMs_PushInstalled = 1200;
        public const int HealthcheckIntervalMs = 60_000;
        public const int PushTimeoutMs = 20_000;

        // Notifications
        public const string Notif_Health = "SyncniteBridge_health";
        public const string Notif_Sync_Error = "SyncniteBridge_sync_error";

        // Health / status text + messages
        public const string HealthStatusHealthy = "healthy";
        public const string HealthStatusUnreachable = "unreachable";
        public const string HealthMsgHealthy = AppName + ": server healthy";
        public const string HealthMsgUnreachable = AppName + ": server unreachable";

        // Config file
        public const string ConfigFileName = "config.json";
        public const string SnapshotFileName = "snapshot.json";
    }
}
