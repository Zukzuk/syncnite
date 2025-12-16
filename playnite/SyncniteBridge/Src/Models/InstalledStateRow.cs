using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Playnite.SDK.Models;

namespace SyncniteBridge.Models
{
    /// <summary>
    /// Lightweight snapshot of a game's installed state.
    /// Used to track changes to installation status, directory, and size.
    /// </summary>
    internal sealed class InstalledStateRow
    {
        public Guid Id { get; set; }
        public bool IsInstalled { get; set; }
        public string InstallDirectory { get; set; } = "";
        public ulong? InstallSize { get; set; }
    }
}
