using System;
using System.IO;
using System.Linq;
using System.Text;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Utility to estimate the total number of bytes that will be written to a ZIP,
    /// so that ZipBuilder can report progress as a percentage.
    /// </summary>
    internal static class ZipSizeEstimator
    {
        /// <summary>
        /// Estimate size in bytes of a UTF-8 string (e.g., manifest or snapshot JSON).
        /// </summary>
        public static long ForText(string? text)
        {
            return string.IsNullOrEmpty(text) ? 0 : Encoding.UTF8.GetByteCount(text);
        }

        /// <summary>
        /// Sum file sizes under a directory recursively.
        /// Returns 0 if directory is null or missing.
        /// </summary>
        public static long ForFilesUnder(string? rootDir)
        {
            if (string.IsNullOrEmpty(rootDir) || !Directory.Exists(rootDir))
                return 0;

            long total = 0;
            foreach (
                var path in Directory.EnumerateFiles(rootDir, "*", SearchOption.AllDirectories)
            )
            {
                try
                {
                    var fi = new FileInfo(path);
                    total += fi.Length;
                }
                catch
                {
                    // Ignore access errors or deleted files
                }
            }
            return total;
        }

        /// <summary>
        /// Add up several independent byte counts (ignoring negatives).
        /// </summary>
        public static long ForMany(params long[] sizes)
        {
            return sizes?.Sum(x => Math.Max(0, x)) ?? 0;
        }
    }
}
