using System;
using System.Threading;

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

        // Common app names/labels
        public const string AppName = "SyncniteBridge";

        // Server endpoints (CRUD)
        public const string Path_Ping = "ping";
        public const string Path_Log = "log";
        public const string Path_Sync_Crud = "sync";
        public const string Path_Sync_Installed = "sync/installed";
        public const string Path_Accounts_VerifyAdmin = "accounts/verify/admin";

        // Playnite data layout
        public const string LibraryDirName = "library";
        public const string LibraryFilesDirName = "library/files";

        // Timing
        public const int Debounce_Ms = 1200;
        public const int HealthcheckInterval_Ms = 5_000;
        public const int PushSyncInterval_Ms = 60_000;

        // Notifications
        public const string Notif_Health = "SyncniteBridge_health";
        public const string Notif_Sync_Error = "SyncniteBridge_sync_error";

        // Health / status text + messages
        public const string HealthStatusHealthy = "healthy";
        public const string HealthStatusUnreachable = "unreachable";
        public const string HealthStatusVersionMismatch = "version mismatch";
        public const string HealthMsgHealthy = AppName + ": server healthy";
        public const string HealthMsgUnreachable = AppName + ": server unreachable";
        public const string HealthMsgVersionMismatch =
            AppName + ": server/extension version mismatch";

        // Config file
        public const string ConfigFileName = "config.json";
        public const string SnapshotFileName = "snapshot.json";
        public const string StateFileName = "state.json";

        // Sync locks
        internal static class SyncLocks
        {
            public static readonly SemaphoreSlim GlobalSyncLock = new SemaphoreSlim(1, 1);
        }
    }
}
