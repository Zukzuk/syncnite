using System;
using System.IO;
using System.IO.Compression;
using System.Text;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Helper class to build zip files with progress reporting.
    /// </summary>
    internal sealed class ZipBuilder : IDisposable
    {
        private readonly ZipArchive zip;
        private readonly FileStream output;
        private readonly BridgeLogger? blog;

        private readonly long expectedTotalBytes;
        private long zippedBytes = 0;
        private readonly Action<int>? onPercent;

        /// <summary>
        /// Create a new ZipBuilder.
        /// </summary>
        internal ZipBuilder(
            string zipPath,
            BridgeLogger? blog = null,
            long expectedTotalBytes = 0,
            Action<int>? onPercent = null
        )
        {
            Directory.CreateDirectory(Path.GetDirectoryName(zipPath)!);
            output = new FileStream(zipPath, FileMode.Create, FileAccess.Write, FileShare.Read);
            zip = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: false);
            this.blog = blog;
            this.expectedTotalBytes = Math.Max(0, expectedTotalBytes);
            this.onPercent = onPercent;
        }

        /// <summary>
        /// Add a file to the zip.
        /// </summary>
        public void AddFile(
            string absoluteSource,
            string relPathInZip,
            CompressionLevel level = CompressionLevel.Optimal
        )
        {
            var entryPath = relPathInZip.Replace('\\', '/');
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
                CopyWithProgress(src, zs);
            }
        }

        /// <summary>
        /// Add text content as a file to the zip.
        /// </summary>
        public void AddText(string relPathInZip, string text)
        {
            var entryPath = relPathInZip.Replace('\\', '/');
            var entry = zip.CreateEntry(entryPath, CompressionLevel.Optimal);
            using var zs = entry.Open();
            var bytes = Encoding.UTF8.GetBytes(text ?? string.Empty);
            using var ms = new MemoryStream(bytes);
            CopyWithProgress(ms, zs);
        }

        /// <summary>
        /// Copy data from src to dst with progress reporting.
        /// </summary>
        private void CopyWithProgress(Stream src, Stream dst)
        {
            var buf = new byte[64 * 1024];
            int read;
            var lastTick = Environment.TickCount;

            while ((read = src.Read(buf, 0, buf.Length)) > 0)
            {
                dst.Write(buf, 0, read);

                if (expectedTotalBytes > 0)
                {
                    zippedBytes += read;

                    var now = Environment.TickCount;
                    if (now - lastTick >= 100 || zippedBytes >= expectedTotalBytes)
                    {
                        var pct = (int)
                            Math.Max(0, Math.Min(100, (zippedBytes * 100L) / expectedTotalBytes));
                        onPercent?.Invoke(pct);
                        lastTick = now;
                    }
                }
            }
        }

        public void Dispose()
        {
            try
            {
                zip?.Dispose();
            }
            catch { }
            // output stream is already closed by zip.Dispose() (leaveOpen:false)
            blog?.Info("sync", "zipping done");
            if (expectedTotalBytes > 0)
                onPercent?.Invoke(100);
        }
    }
}
