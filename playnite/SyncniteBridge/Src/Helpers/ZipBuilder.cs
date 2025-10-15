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
        private readonly Stream output;
        private readonly bool ownsStream;
        private readonly BridgeLogger? blog;

        private readonly long expectedTotalBytes;
        private long zippedBytes = 0;
        private readonly Action<int>? onPercent; // optional

        internal ZipBuilder(
            string zipPath,
            BridgeLogger? blog = null,
            long expectedTotalBytes = 0,
            Action<int>? onPercent = null
        )
        {
            Directory.CreateDirectory(Path.GetDirectoryName(zipPath)!);
            this.output = new FileStream(
                zipPath,
                FileMode.Create,
                FileAccess.Write,
                FileShare.Read
            );
            this.ownsStream = true;
            this.zip = new ZipArchive(this.output, ZipArchiveMode.Create, leaveOpen: false);
            this.blog = blog;
            this.expectedTotalBytes = Math.Max(0, expectedTotalBytes);
            this.onPercent = onPercent;

            blog?.Info("sync", "zipping start");
        }

        internal ZipBuilder(
            Stream output,
            BridgeLogger? blog = null,
            long expectedTotalBytes = 0,
            Action<int>? onPercent = null
        )
        {
            this.output = output ?? throw new ArgumentNullException(nameof(output));
            this.ownsStream = false;
            this.zip = new ZipArchive(this.output, ZipArchiveMode.Create, leaveOpen: true);
            this.blog = blog;
            this.expectedTotalBytes = Math.Max(0, expectedTotalBytes);
            this.onPercent = onPercent;

            blog?.Info("sync", "zipping start");
        }

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

        public void AddText(string relPathInZip, string text)
        {
            var entryPath = relPathInZip.Replace('\\', '/');
            var entry = zip.CreateEntry(entryPath, CompressionLevel.Optimal);
            using var zs = entry.Open();
            var bytes = Encoding.UTF8.GetBytes(text ?? string.Empty);
            using var ms = new MemoryStream(bytes);
            CopyWithProgress(ms, zs);
        }

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
            if (ownsStream)
            {
                try
                {
                    output?.Dispose();
                }
                catch { }
            }
            blog?.Info("sync", "zipping done");
            // Final 100% tick in case we ended early or totals matched exactly
            if (expectedTotalBytes > 0)
                onPercent?.Invoke(100);
        }
    }
}
