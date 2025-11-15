using System;

namespace SyncniteBridge.Models
{
    /// <summary>
    /// Generic id + name row for tags, sources, platforms, genres, etc.
    /// </summary>
    internal sealed class ServerNamedRow
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
    }
}
