using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Computes what needs to be uploaded and prepares the manifest JSON.
    /// </summary>
    internal sealed class DeltaSyncPlanService
    {
        private readonly LocalStateScanService scanner;
        private readonly BridgeLogger? blog;
        private readonly string dataRoot;

        /// <summary>
        /// Upload plan structure.
        /// </summary>
        internal sealed class Plan
        {
            public bool DbChanged { get; set; }
            public List<string> MediaFolders { get; set; } = new List<string>();
            public string ManifestJson { get; set; } = "{}";
        }

        /// <summary>
        /// Create a new DeltaSyncPlanService.
        /// </summary>
        public DeltaSyncPlanService(
            LocalStateScanService scanner,
            string dataRoot,
            BridgeLogger? blog = null
        )
        {
            this.scanner = scanner;
            this.dataRoot = dataRoot ?? "";
            this.blog = blog;
        }

        /// <summary>
        /// Build a plan using current local state and the pending dirty sets.
        /// </summary>
        public Plan Build(bool dbDirty, List<string> dirtyMedia)
        {
            blog?.Info("sync", "Preparing upload plan");

            var local = scanner.BuildLocalManifestView();
            // Sort json keys for stability
            var jsonSorted = new System.Collections.Generic.SortedDictionary<
                string,
                (long size, long mtimeMs)
            >(local.Json, StringComparer.OrdinalIgnoreCase);

            var manifestObj = new
            {
                json = jsonSorted.ToDictionary(
                    kv => kv.Key,
                    kv => new { size = kv.Value.size, mtimeMs = kv.Value.mtimeMs },
                    StringComparer.OrdinalIgnoreCase
                ),
                installed = new { count = local.Installed.count, hash = local.Installed.hash },
            };
            var manifestJson = Playnite.SDK.Data.Serialization.ToJson(manifestObj);

            blog?.Debug(
                "sync",
                "Upload plan details",
                new { dbChanged = dbDirty, mediaFoldersChanged = dirtyMedia?.Count ?? 0 }
            );

            return new Plan
            {
                DbChanged = dbDirty,
                MediaFolders = dirtyMedia ?? new List<string>(),
                ManifestJson = manifestJson,
            };
        }

        /// <summary>
        /// Estimate the total size of the zip upload for the given plan.
        /// </summary>
        public long EstimateZipBytes(Plan plan)
        {
            long mediaBytes = 0;
            foreach (var folder in plan.MediaFolders)
            {
                var abs = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName, folder);
                try
                {
                    mediaBytes += ZipSizeEstimator.ForFilesUnder(abs);
                }
                catch { }
            }
            long dbBytes = ZipSizeEstimator.ForFilesUnder(
                Path.Combine(dataRoot, AppConstants.LibraryDirName)
            );
            return ZipSizeEstimator.ForText(plan.ManifestJson) + dbBytes + mediaBytes;
        }
    }
}
