using System;
using System.IO;
using System.IO.Compression;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Helper for building ZIP archives, either to a file or to a stream.
    /// </summary>
    internal sealed class ZipBuilder : IDisposable
    {
        private readonly Stream stream;
        private readonly ZipArchive zip;
        private readonly bool ownsStream;
        private readonly BridgeLogger log;

        public ZipBuilder(string zipPath, BridgeLogger blog = null)
        {
            log = blog;
            Directory.CreateDirectory(Path.GetDirectoryName(zipPath) ?? ".");
            var fs = new FileStream(zipPath, FileMode.Create, FileAccess.ReadWrite, FileShare.None);
            stream = fs;
            ownsStream = true;
            zip = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: false);
            log?.Info("zip", "ZIP archive created", new { zipPath });
        }

        public ZipBuilder(Stream output, BridgeLogger blog = null)
        {
            log = blog;
            stream = output;
            ownsStream = false;
            zip = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true);
            log?.Info("zip", "ZIP archive started (stream-based)");
        }

        public void AddFile(
            string absoluteSource,
            string relPathInZip,
            CompressionLevel level = CompressionLevel.Optimal
        )
        {
            var entryPath = relPathInZip.Replace('\\', '/');
            log?.Debug("zip", "Adding file", new { source = absoluteSource, entryPath });
            var entry = zip.CreateEntry(entryPath, level);
            using (var zs = entry.Open())
            using (
                var src = new FileStream(
                    absoluteSource,
                    FileMode.Open,
                    FileAccess.Read,
                    FileShare.ReadWrite | FileShare.Delete
                )
            )
            {
                src.CopyTo(zs);
            }
        }

        public void AddText(string relPathInZip, string text)
        {
            var entryPath = relPathInZip.Replace('\\', '/');
            log?.Debug("zip", "Adding text entry", new { entryPath, bytes = text?.Length ?? 0 });
            var entry = zip.CreateEntry(entryPath, CompressionLevel.Optimal);
            using var zs = entry.Open();
            using var sw = new StreamWriter(zs);
            sw.Write(text ?? string.Empty);
        }

        public void Dispose()
        {
            try
            {
                zip?.Dispose();
                log?.Info("zip", "ZIP archive finalized");
            }
            catch (Exception ex)
            {
                log?.Warn("zip", "Error finalizing ZIP", new { err = ex.Message });
            }

            if (ownsStream)
            {
                try
                {
                    stream?.Dispose();
                }
                catch (Exception ex)
                {
                    log?.Warn("zip", "Error disposing file stream", new { err = ex.Message });
                }
            }
        }
    }
}
