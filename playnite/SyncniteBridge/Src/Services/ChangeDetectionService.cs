using System;
using System.Collections.Generic;
using System.Linq;
using Playnite.SDK;
using Playnite.SDK.Events;
using Playnite.SDK.Models;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Central router for Playnite DB change events.
    /// Emits high-level events that other services can subscribe to:
    /// - GamesInstalledChanged: ONLY when IsInstalled changes or installed games are added/removed.
    /// - GamesMetadataChanged: any metadata change EXCEPT pure IsInstalled toggles.
    /// </summary>
    internal sealed class ChangeDetectionService : IDisposable
    {
        private readonly IPlayniteAPI api;
        private readonly BridgeLogger? blog;

        public event EventHandler<GamesInstalledChangedEventArgs>? GamesInstalledChanged;
        public event EventHandler<GamesMetadataChangedEventArgs>? GamesMetadataChanged;
        public event EventHandler<GamesMediaChangedEventArgs>? GamesMediaChanged;

        public ChangeDetectionService(IPlayniteAPI api, BridgeLogger? blog = null)
        {
            this.api = api;
            this.blog = blog;

            api.Database.Games.ItemCollectionChanged += OnGamesCollectionChanged;
            api.Database.Games.ItemUpdated += OnGamesUpdated;
        }

        private void OnGamesCollectionChanged(
            object? sender,
            ItemCollectionChangedEventArgs<Game> e
        )
        {
            var all = new List<Game>();

            if (e.AddedItems != null)
                all.AddRange(e.AddedItems);
            if (e.RemovedItems != null)
                all.AddRange(e.RemovedItems);

            if (all.Count == 0)
                return;

            // Any added/removed game is a metadata change.
            GamesMetadataChanged?.Invoke(this, new GamesMetadataChangedEventArgs(all));

            // Installed-list changes only care about games that are (or were) installed.
            var installedRelevant = all.Where(g => g != null && g.IsInstalled).ToList();

            if (installedRelevant.Count > 0)
            {
                blog?.Debug(
                    "db-events",
                    "Collection change affected installed list",
                    new { count = installedRelevant.Count }
                );

                GamesInstalledChanged?.Invoke(
                    this,
                    new GamesInstalledChangedEventArgs(installedRelevant)
                );
            }
        }

        private void OnGamesUpdated(object? sender, ItemUpdatedEventArgs<Game> e)
        {
            var installedChanged = new List<Game>();
            var metadataChanged = new List<Game>();
            var mediaChanged = new List<Game>();

            var updated = e.UpdatedItems;
            if (updated == null || updated.Count == 0)
                return;

            foreach (var item in updated)
            {
                var oldG = item.OldData;
                var newG = item.NewData;
                if (oldG == null || newG == null)
                    continue;

                // 1) Installed flag changes
                if (oldG.IsInstalled != newG.IsInstalled)
                {
                    installedChanged.Add(newG);
                }

                // 2) Media-path changes (Icon / Cover / Background)
                var iconChanged = !string.Equals(oldG.Icon, newG.Icon, StringComparison.Ordinal);
                var coverChanged = !string.Equals(
                    oldG.CoverImage,
                    newG.CoverImage,
                    StringComparison.Ordinal
                );
                var bgChanged = !string.Equals(
                    oldG.BackgroundImage,
                    newG.BackgroundImage,
                    StringComparison.Ordinal
                );

                if (iconChanged || coverChanged || bgChanged)
                {
                    mediaChanged.Add(newG);
                }

                // 3) Other metadata changes (including media paths as part of "metadata")
                if (HasMetadataChange(oldG, newG))
                {
                    metadataChanged.Add(newG);
                }
            }

            if (installedChanged.Count > 0)
            {
                blog?.Debug(
                    "db-events",
                    "Installed flag changed",
                    new { count = installedChanged.Count }
                );
                GamesInstalledChanged?.Invoke(
                    this,
                    new GamesInstalledChangedEventArgs(installedChanged)
                );
            }

            if (metadataChanged.Count > 0)
            {
                blog?.Debug("db-events", "Metadata changed", new { count = metadataChanged.Count });
                GamesMetadataChanged?.Invoke(
                    this,
                    new GamesMetadataChangedEventArgs(metadataChanged)
                );
            }

            if (mediaChanged.Count > 0)
            {
                blog?.Debug("db-events", "Media paths changed", new { count = mediaChanged.Count });
                GamesMediaChanged?.Invoke(this, new GamesMediaChangedEventArgs(mediaChanged));
            }
        }

        /// <summary>
        /// Returns true if any *non-installed* metadata changed.
        /// </summary>
        private static bool HasMetadataChange(Game oldG, Game newG)
        {
            // Basic presentation flags
            if (!string.Equals(oldG.Name, newG.Name, StringComparison.Ordinal))
                return true;
            if (!string.Equals(oldG.SortingName, newG.SortingName, StringComparison.Ordinal))
                return true;
            if (oldG.Hidden != newG.Hidden)
                return true;

            // Installation info (directory, size, plugin, external id) – but NOT IsInstalled
            if (
                !string.Equals(
                    oldG.InstallDirectory,
                    newG.InstallDirectory,
                    StringComparison.Ordinal
                )
            )
                return true;
            if (oldG.InstallSize != newG.InstallSize)
                return true;
            if (oldG.PluginId != newG.PluginId)
                return true;
            if (!string.Equals(oldG.GameId, newG.GameId, StringComparison.Ordinal))
                return true;

            // Source / relations / taxonomy
            if (oldG.SourceId != newG.SourceId)
                return true;

            if (!SeqEqual(oldG.TagIds, newG.TagIds))
                return true;
            if (!SeqEqual(oldG.PlatformIds, newG.PlatformIds))
                return true;
            if (!SeqEqual(oldG.GenreIds, newG.GenreIds))
                return true;
            if (!SeqEqual(oldG.CategoryIds, newG.CategoryIds))
                return true;
            if (!SeqEqual(oldG.FeatureIds, newG.FeatureIds))
                return true;
            if (!SeqEqual(oldG.SeriesIds, newG.SeriesIds))
                return true;
            if (oldG.CompletionStatusId != newG.CompletionStatusId)
                return true;
            if (!SeqEqual(oldG.AgeRatingIds, newG.AgeRatingIds))
                return true;
            if (!SeqEqual(oldG.RegionIds, newG.RegionIds))
                return true;
            if (!SeqEqual(oldG.DeveloperIds, newG.DeveloperIds))
                return true;
            if (!SeqEqual(oldG.PublisherIds, newG.PublisherIds))
                return true;

            // Dates / usage
            if (!NullableDateEqual(oldG.Added, newG.Added))
                return true;
            if (!NullableDateEqual(oldG.Modified, newG.Modified))
                return true;
            if (!NullableDateEqual(oldG.LastActivity, newG.LastActivity))
                return true;
            if (oldG.Playtime != newG.Playtime)
                return true;
            if (oldG.PlayCount != newG.PlayCount)
                return true;

            // Scores
            if (oldG.UserScore != newG.UserScore)
                return true;
            if (oldG.CommunityScore != newG.CommunityScore)
                return true;
            if (oldG.CriticScore != newG.CriticScore)
                return true;

            // Media paths
            if (!string.Equals(oldG.Icon, newG.Icon, StringComparison.Ordinal))
                return true;
            if (!string.Equals(oldG.CoverImage, newG.CoverImage, StringComparison.Ordinal))
                return true;
            if (
                !string.Equals(oldG.BackgroundImage, newG.BackgroundImage, StringComparison.Ordinal)
            )
                return true;

            // Longer text
            if (!string.Equals(oldG.Description, newG.Description, StringComparison.Ordinal))
                return true;
            if (!string.Equals(oldG.Notes, newG.Notes, StringComparison.Ordinal))
                return true;

            return false;
        }

        private static bool SeqEqual<T>(IEnumerable<T>? a, IEnumerable<T>? b)
        {
            if (ReferenceEquals(a, b))
                return true;
            if (a == null || b == null)
                return false;
            return a.SequenceEqual(b);
        }

        private static bool NullableDateEqual(DateTime? a, DateTime? b)
        {
            if (!a.HasValue && !b.HasValue)
                return true;
            if (a.HasValue != b.HasValue)
                return false;
            // Compare to the second – Playnite stores DateTime, precision differences aren't critical
            return a.Value.ToUniversalTime().ToString("O")
                == b.Value.ToUniversalTime().ToString("O");
        }

        public void Dispose()
        {
            try
            {
                api.Database.Games.ItemCollectionChanged -= OnGamesCollectionChanged;
            }
            catch { }

            try
            {
                api.Database.Games.ItemUpdated -= OnGamesUpdated;
            }
            catch { }
        }
    }

    internal sealed class GamesMediaChangedEventArgs : EventArgs
    {
        public IReadOnlyList<Game> Games { get; }

        public GamesMediaChangedEventArgs(IReadOnlyList<Game> games)
        {
            Games = games;
        }
    }

    internal sealed class GamesInstalledChangedEventArgs : EventArgs
    {
        public IReadOnlyList<Game> Games { get; }

        public GamesInstalledChangedEventArgs(IReadOnlyList<Game> games)
        {
            Games = games;
        }
    }

    internal sealed class GamesMetadataChangedEventArgs : EventArgs
    {
        public IReadOnlyList<Game> Games { get; }

        public GamesMetadataChangedEventArgs(IReadOnlyList<Game> games)
        {
            Games = games;
        }
    }
}
