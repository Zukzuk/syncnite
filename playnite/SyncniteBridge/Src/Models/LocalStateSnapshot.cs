using System;
using System.Collections.Generic;

namespace SyncniteBridge.Models
{
    /// <summary>
    /// Lightweight snapshot of local Playnite state.
    /// </summary>
    internal sealed class LocalStateSnapshot
    {
        public string UpdatedAt { get; set; } = "";
        public long DbTicks { get; set; } = 0;

        // top-level media folder name; Value: folder mtime ticks
        public Dictionary<string, long> MediaVersions { get; set; } =
            new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
    }
}
