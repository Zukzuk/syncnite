using System.IO;
using System.IO.Compression;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Helper for building ZIP archives, either to a file or a stream.
    /// </summary>
    internal sealed class ZipBuilder : System.IDisposable
    {
        private readonly Stream stream;
        private readonly ZipArchive zip;
        private readonly bool ownsStream;

        public ZipBuilder(string zipPath)
        {
            Directory.CreateDirectory(Path.GetDirectoryName(zipPath) ?? ".");
            var fs = new FileStream(zipPath, FileMode.Create, FileAccess.ReadWrite, FileShare.None);
            stream = fs;
            ownsStream = true;
            zip = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: false);
        }

        public ZipBuilder(Stream output)
        {
            stream = output;
            ownsStream = false;
            zip = new ZipArchive(stream, ZipArchiveMode.Create, leaveOpen: true);
        }

        public void AddFile(
            string absoluteSource,
            string relPathInZip,
            CompressionLevel level = CompressionLevel.Optimal
        )
        {
            var entry = zip.CreateEntry(relPathInZip.Replace('\\', '/'), level);
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
            var entry = zip.CreateEntry(relPathInZip.Replace('\\', '/'), CompressionLevel.Optimal);
            using (var zs = entry.Open())
            using (var sw = new StreamWriter(zs))
            {
                sw.Write(text ?? "");
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
                    stream?.Dispose();
                }
                catch { }
            }
        }
    }
}
