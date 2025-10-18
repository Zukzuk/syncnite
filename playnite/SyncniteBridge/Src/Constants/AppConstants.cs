using System;

namespace SyncniteBridge.Constants
{
    /// <summary>
    /// Application-wide constants for the Syncnite Bridge extension.
    /// </summary>
    internal static class AppConstants
    {
        // Common app names/labels
        public const string AppName = "SyncniteBridge";
        public const string SettingsTitle = "Syncnite Bridge Settings";
        public const string MenuTitle = "Syncnite Bridge";

        // Extension GUID
        public const string GUID = "a85f0db8-39f4-40ea-9e03-bc5be2298c89";

        // Default API base
        public const string DefaultApiBase = "http://localhost:3003/api/";

        // Server endpoints
        public const string Path_Syncnite_Push = "sync/push"; // installed list
        public const string Path_Syncnite_Sync = "sync/up"; // library sync
        public const string Path_Syncnite_Log = "sync/log"; // remote log ingest
        public const string Path_Syncnite_Ping = "sync/ping"; // healthcheck

        // Playnite data layout (local)
        public const string LibraryDirName = "library";
        public const string LibraryFilesDirName = "library/files";

        // ZIP layout (server expects)
        public const string ZipDirName = "export";
        public const string ZipFilesDirName = "libraryfiles";

        // Timing
        public const int DebounceMs_Sync = 1200;
        public const int DebounceMs_Pusher = 1200;
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

        // Temp
        public const string TempDirName = "SyncniteBridge_Temp";

        // Config file
        public const string ConfigFileName = "SyncniteBridgeConfig.json";

        // ZIP naming
        public const string ZipNamePrefix = "PlayniteSync-";
        public const string ZipTimestampFormat = "yyyy-MM-dd-HH-mm-ss";
        public const string ZipExtension = ".zip";

        // Export/manifest structure
        public const string ExportDir = "export";
        public const string ManifestFileName = "manifest.json";
        public const string ManifestPathInZip = ExportDir + "/" + ManifestFileName;
        public const string MetaFileName = "meta.json";
        public const string MetaPathInZip = ExportDir + "/" + MetaFileName;
        public const string SnapshotFileName = "lastManifest.json";
    }
}
