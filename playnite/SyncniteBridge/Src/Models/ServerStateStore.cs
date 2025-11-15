using System;
using System.Collections.Generic;
using System.IO;
using Playnite.SDK.Data;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Models
{
    /// <summary>
    /// Persists last known server state for delta pull:
    /// per-collection hash maps + media paths.
    /// </summary>
    internal sealed class ServerStateStore
    {
        private readonly string path;
        private readonly BridgeLogger? blog;

        /// <summary>
        /// State structure used by delta pull logic.
        /// </summary>
        internal sealed class State
        {
            /// <summary>
            /// Per-collection hash maps:
            ///   e.g. "games" -> { gameId -> hash }
            /// </summary>
            public Dictionary<string, Dictionary<Guid, string>> Hashes { get; set; } =
                new Dictionary<string, Dictionary<Guid, string>>(StringComparer.OrdinalIgnoreCase);

            /// <summary>
            /// Set of media paths currently known on the server.
            /// </summary>
            public HashSet<string> MediaPaths { get; set; } =
                new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Initialize store at given path.
        /// </summary>
        public ServerStateStore(string libraryRoot, BridgeLogger? blog = null)
        {
            if (string.IsNullOrWhiteSpace(libraryRoot))
            {
                libraryRoot = ".";
            }

            Directory.CreateDirectory(libraryRoot);
            path = Path.Combine(libraryRoot, AppConstants.StateFileName);
            this.blog = blog;

            blog?.Debug("pull-state", "ServerStateStore initialized", new { path });
        }

        /// <summary>
        /// Load last saved state from disk, or a fresh empty state.
        /// </summary>
        public State Load()
        {
            try
            {
                if (!File.Exists(path))
                {
                    blog?.Debug("pull-state", "No existing state on disk", new { path });
                    return new State();
                }

                var json = File.ReadAllText(path);
                var s = Serialization.FromJson<State>(json) ?? new State();

                // normalize nulls just in case
                s.Hashes ??= new Dictionary<string, Dictionary<Guid, string>>(
                    StringComparer.OrdinalIgnoreCase
                );
                s.MediaPaths ??= new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                blog?.Debug(
                    "pull-state",
                    "State loaded",
                    new
                    {
                        path,
                        collections = s.Hashes.Count,
                        mediaPaths = s.MediaPaths.Count,
                    }
                );

                return s;
            }
            catch (Exception ex)
            {
                blog?.Warn("pull-state", "Failed to load state", new { path, err = ex.Message });
                return new State();
            }
        }

        /// <summary>
        /// Save current state to disk.
        /// </summary>
        public void Save(State state)
        {
            try
            {
                state ??= new State();
                state.Hashes ??= new Dictionary<string, Dictionary<Guid, string>>(
                    StringComparer.OrdinalIgnoreCase
                );
                state.MediaPaths ??= new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                var json = Serialization.ToJson(state);
                File.WriteAllText(path, json);

                blog?.Debug(
                    "pull-state",
                    "State saved",
                    new
                    {
                        path,
                        collections = state.Hashes.Count,
                        mediaPaths = state.MediaPaths.Count,
                    }
                );
            }
            catch (Exception ex)
            {
                blog?.Warn("pull-state", "Failed to save state", new { path, err = ex.Message });
            }
        }

        /// <summary>
        /// Delete the stored state from disk (next pull will behave like a first run).
        /// </summary>
        public void Delete()
        {
            try
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                    blog?.Info("pull-state", "State deleted", new { path });
                }
                else
                {
                    blog?.Debug("pull-state", "No state file to delete", new { path });
                }
            }
            catch (Exception ex)
            {
                blog?.Warn("pull-state", "Failed to delete state", new { path, err = ex.Message });
            }
        }
    }
}
