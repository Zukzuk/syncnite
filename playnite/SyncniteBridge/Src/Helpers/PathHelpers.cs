using System;
using System.IO;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Path utilities shared by sync code.
    /// </summary>
    internal static class PathHelpers
    {
        /// <summary>
        /// Get the relative path from baseDir to fullPath.
        /// </summary>
        public static string GetRelativePath(string baseDir, string fullPath)
        {
            if (string.IsNullOrEmpty(baseDir))
                return fullPath;
            var baseUri = new Uri(AppendSep(baseDir));
            var pathUri = new Uri(fullPath);
            var rel = baseUri.MakeRelativeUri(pathUri).ToString();
            return Uri.UnescapeDataString(rel).Replace('/', Path.DirectorySeparatorChar);

            static string AppendSep(string p) =>
                p.EndsWith(Path.DirectorySeparatorChar.ToString())
                    ? p
                    : p + Path.DirectorySeparatorChar;
        }

        /// <summary>
        /// Extracts the top-level folder under dataRoot/LibraryFilesDirName from an absolute path.
        /// Returns null if the path is outside that tree.
        /// </summary>
        public static string? GetTopLevelMediaFolderFromPath(string dataRoot, string fullPath)
        {
            if (string.IsNullOrWhiteSpace(fullPath))
                return null;

            var mediaRoot = Path.Combine(dataRoot, Constants.AppConstants.LibraryFilesDirName);
            mediaRoot = mediaRoot.EndsWith(Path.DirectorySeparatorChar.ToString())
                ? mediaRoot
                : mediaRoot + Path.DirectorySeparatorChar;

            if (!fullPath.StartsWith(mediaRoot, StringComparison.OrdinalIgnoreCase))
                return null;

            var rel = fullPath.Substring(mediaRoot.Length).TrimStart(Path.DirectorySeparatorChar);
            var first = rel.Split(
                new[] { Path.DirectorySeparatorChar },
                2,
                StringSplitOptions.None
            )[0];
            return string.IsNullOrWhiteSpace(first) ? null : first;
        }
    }
}
