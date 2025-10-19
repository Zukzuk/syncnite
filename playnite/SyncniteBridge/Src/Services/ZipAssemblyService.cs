using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Assembles the sync ZIP according to a plan.
    /// </summary>
    internal sealed class ZipAssemblyService
    {
        private readonly string dataRoot;
        private readonly string tempDir;
        private readonly BridgeLogger? blog;
        private readonly SdkSnapshotService sdkExporter;

        /// <summary>
        /// Initializes a new instance of the <see cref="ZipAssemblyService"/> class.
        /// </summary>
        public ZipAssemblyService(
            string dataRoot,
            string tempDir,
            SdkSnapshotService sdkExporter,
            BridgeLogger? blog = null
        )
        {
            this.dataRoot = dataRoot ?? "";
            this.tempDir = tempDir ?? ".";
            this.sdkExporter = sdkExporter;
            this.blog = blog;
        }

        /// <summary>
        /// Assemble the ZIP according to the given plan.
        /// </summary>
        public string Assemble(DeltaSyncPlanService.Plan plan, long expectedTotalBytes)
        {
            Directory.CreateDirectory(tempDir);
            CleanupTempOld(60);
            foreach (var f in Directory.EnumerateFiles(tempDir, "*.zip"))
            {
                try
                {
                    File.Delete(f);
                }
                catch { }
            }

            var zipPath = Path.Combine(
                tempDir,
                $"{AppConstants.ZipNamePrefix}{DateTime.UtcNow.ToString(AppConstants.ZipTimestampFormat)}{AppConstants.ZipExtension}"
            );

            blog?.Info("sync", "Assembling ZIP");
            blog?.Debug(
                "sync",
                "ZIP details",
                new { mediaFolders = plan.MediaFolders.Count, temp = zipPath }
            );

            var zipBuckets = new PercentBuckets(step: 10);
            blog?.Info("sync", "zipping start");

            using (
                var zb = new ZipBuilder(
                    zipPath,
                    blog,
                    expectedTotalBytes,
                    pct =>
                    {
                        if (zipBuckets.ShouldEmit(pct, out var b))
                        {
                            blog?.Info("progress", "zipping");
                            blog?.Debug("progress", "zipping", new { phase = "zip", percent = b });
                        }
                    }
                )
            )
            {
                // /export/manifest.json
                zb.AddText(AppConstants.ManifestFileName, plan.ManifestJson);

                if (plan.DbChanged)
                {
                    sdkExporter.Export(zb);
                }

                foreach (var folder in plan.MediaFolders)
                {
                    blog?.Debug("sync", $"Include media folder: {folder}");
                    AddMediaFolderRecursively(zb, folder);
                }
            }

            blog?.Info("sync", "zipping done");
            return zipPath;
        }

        /// <summary>
        /// Clean up old temp ZIP files.
        /// </summary>
        private void CleanupTempOld(int maxAgeMinutes)
        {
            try
            {
                foreach (var f in Directory.EnumerateFiles(tempDir, "*.zip"))
                {
                    try
                    {
                        var fi = new FileInfo(f);
                        if (fi.CreationTimeUtc < DateTime.UtcNow.AddMinutes(-maxAgeMinutes))
                            File.Delete(f);
                    }
                    catch { }
                }
            }
            catch { }
        }

        /// <summary>
        /// Add a media folder and its contents recursively into the ZIP.
        /// </summary>
        private void AddMediaFolderRecursively(ZipBuilder zb, string topLevelFolder)
        {
            var mediaRoot = Path.Combine(dataRoot, AppConstants.LibraryFilesDirName);
            var folderAbs = Path.Combine(mediaRoot, topLevelFolder);
            if (!Directory.Exists(folderAbs))
                return;

            foreach (
                var path in Directory
                    .EnumerateFiles(folderAbs, "*", SearchOption.AllDirectories)
                    .OrderBy(p => p, StringComparer.OrdinalIgnoreCase)
            )
            {
                var rel = PathHelpers.GetRelativePath(folderAbs, path);
                var relInZip = Path.Combine(AppConstants.ZipFilesDirName, topLevelFolder, rel)
                    .Replace('\\', '/');
                try
                {
                    zb.AddFile(path, relInZip, CompressionLevel.Optimal);
                }
                catch (Exception ex)
                {
                    blog?.Warn("zip", "skip file", new { path, err = ex.Message });
                }
            }
        }
    }
}
