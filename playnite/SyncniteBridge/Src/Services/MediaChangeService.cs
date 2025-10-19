using System;
using System.Collections.Generic;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Thread-safe accumulator of dirty media folders.
    /// </summary>
    internal sealed class MediaChangeService
    {
        private readonly object gate = new object();
        private readonly HashSet<string> folders = new HashSet<string>(
            StringComparer.OrdinalIgnoreCase
        );

        /// <summary>
        /// Add a top-level media folder to the dirty set.
        /// </summary>
        public void Add(string topLevelFolder)
        {
            if (string.IsNullOrWhiteSpace(topLevelFolder))
                return;
            lock (gate)
                folders.Add(topLevelFolder);
        }

        /// <summary>
        /// Snapshot and clear the dirty set.
        /// </summary>
        public List<string> SnapshotAndClear()
        {
            lock (gate)
            {
                var list = new List<string>(folders);
                folders.Clear();
                return list;
            }
        }

        /// <summary>
        /// Snapshot the dirty set.
        /// </summary>
        public List<string> Snapshot()
        {
            lock (gate)
                return new List<string>(folders);
        }

        /// <summary>
        /// Get the count of dirty folders.
        /// </summary>
        public int Count
        {
            get
            {
                lock (gate)
                    return folders.Count;
            }
        }

        /// <summary>
        /// Clear the dirty set.
        /// </summary>
        public void Clear()
        {
            lock (gate)
                folders.Clear();
        }
    }
}
