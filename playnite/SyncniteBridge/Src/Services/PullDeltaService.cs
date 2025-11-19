using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Playnite.SDK;
using Playnite.SDK.Models;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;
using SyncniteBridge.Models;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Service to pull delta updates from a Syncnite server.
    /// </summary>
    internal sealed class PullDeltaService
    {
        private readonly IPlayniteAPI api;
        private string syncUrl;
        private readonly string playniteRoot;
        private readonly BridgeLogger blog;
        private readonly ExtensionHttpClient http;
        private readonly ServerStateStore store;

        private Func<bool> isHealthy = () => true;

        /// <summary>
        /// Constructs a new instance of the PullDeltaService.
        /// </summary>
        public PullDeltaService(
            IPlayniteAPI api,
            string syncUrl,
            string playniteRoot,
            BridgeLogger blog
        )
        {
            this.api = api;
            this.syncUrl = syncUrl.TrimEnd('/');
            this.playniteRoot = playniteRoot;
            this.blog = blog;

            http = new ExtensionHttpClient(blog);
            store = new ServerStateStore(
                Path.Combine(playniteRoot, AppConstants.LibraryDirName),
                blog
            );
        }

        /// <summary>
        /// Update the pull endpoint URL.
        /// </summary>
        public void UpdateEndpoint(string endpoint)
        {
            syncUrl = (endpoint ?? string.Empty).TrimEnd('/');
            blog?.Debug("pull", "Pull endpoint updated", new { syncUrl });
        }

        /// <summary>
        /// Provide health status (true = healthy)
        /// </summary>
        public void SetHealthProvider(Func<bool> provider) => isHealthy = provider ?? (() => true);

        /// <summary>
        /// Perform a single pull sync operation.
        /// </summary>
        public async Task pullOnceAsync()
        {
            if (!isHealthy())
            {
                blog?.Debug("pull", "Skip pull: unhealthy");
                return;
            }

            await AppConstants.SyncLocks.GlobalSyncLock.WaitAsync().ConfigureAwait(false);
            try
            {
                blog.Info("pull", "Starting pull sync from server");

                var prev = store.Load();

                // 1) Fetch collections from server
                var games =
                    await http.GetCollectionAsync<ServerGameRow>(syncUrl, "games")
                        .ConfigureAwait(false) ?? Array.Empty<ServerGameRow>();

                var tags =
                    await http.GetCollectionAsync<ServerNamedRow>(syncUrl, "tags")
                        .ConfigureAwait(false) ?? Array.Empty<ServerNamedRow>();
                var sources =
                    await http.GetCollectionAsync<ServerNamedRow>(syncUrl, "sources")
                        .ConfigureAwait(false) ?? Array.Empty<ServerNamedRow>();
                var platforms =
                    await http.GetCollectionAsync<ServerNamedRow>(syncUrl, "platforms")
                        .ConfigureAwait(false) ?? Array.Empty<ServerNamedRow>();
                var genres =
                    await http.GetCollectionAsync<ServerNamedRow>(syncUrl, "genres")
                        .ConfigureAwait(false) ?? Array.Empty<ServerNamedRow>();
                var categories =
                    await http.GetCollectionAsync<ServerNamedRow>(syncUrl, "categories")
                        .ConfigureAwait(false) ?? Array.Empty<ServerNamedRow>();
                var features =
                    await http.GetCollectionAsync<ServerNamedRow>(syncUrl, "features")
                        .ConfigureAwait(false) ?? Array.Empty<ServerNamedRow>();

                // 2) Build new state hashes
                var next = new ServerStateStore.State();

                next.Hashes["games"] = BuildHashMap(games.Select(g => (g.Id, HashGame(g))));
                next.Hashes["tags"] = BuildHashMap(tags.Select(t => (t.Id, HashNamed(t.Name))));
                next.Hashes["sources"] = BuildHashMap(
                    sources.Select(t => (t.Id, HashNamed(t.Name)))
                );
                next.Hashes["platforms"] = BuildHashMap(
                    platforms.Select(t => (t.Id, HashNamed(t.Name)))
                );
                next.Hashes["genres"] = BuildHashMap(genres.Select(t => (t.Id, HashNamed(t.Name))));
                next.Hashes["categories"] = BuildHashMap(
                    categories.Select(t => (t.Id, HashNamed(t.Name)))
                );
                next.Hashes["features"] = BuildHashMap(
                    features.Select(t => (t.Id, HashNamed(t.Name)))
                );

                // Media list from games
                foreach (var g in games)
                {
                    if (!string.IsNullOrWhiteSpace(g.Icon))
                        next.MediaPaths.Add(g.Icon);
                    if (!string.IsNullOrWhiteSpace(g.CoverImage))
                        next.MediaPaths.Add(g.CoverImage);
                    if (!string.IsNullOrWhiteSpace(g.BackgroundImage))
                        next.MediaPaths.Add(g.BackgroundImage);
                }

                // 3) Compute & apply DB delta
                await ApplyDbDeltaAsync(
                        prev,
                        next,
                        games,
                        tags,
                        sources,
                        platforms,
                        genres,
                        categories,
                        features
                    )
                    .ConfigureAwait(false);

                // 4) Compute & apply media delta
                await ApplyMediaDeltaAsync(prev, next, games).ConfigureAwait(false);

                // 5) Save state
                store.Save(next);

                blog.Info(
                    "pull",
                    "Pull sync completed, "
                        + $"{games.Length} games, "
                        + $"{tags.Length} tags, "
                        + $"{sources.Length} sources, "
                        + $"{platforms.Length} platforms, "
                        + $"{genres.Length} genres, "
                        + $"{categories.Length} categories, "
                        + $"{features.Length} features"
                );
            }
            finally
            {
                AppConstants.SyncLocks.GlobalSyncLock.Release();
            }
        }

        /// <summary>
        /// Build a dictionary mapping IDs to their hash values.
        /// </summary>
        private static Dictionary<Guid, string> BuildHashMap(
            IEnumerable<(Guid id, string hash)> items
        )
        {
            var dict = new Dictionary<Guid, string>();
            foreach (var (id, hash) in items)
            {
                if (id != Guid.Empty && !string.IsNullOrEmpty(hash))
                    dict[id] = hash;
            }
            return dict;
        }

        /// <summary>
        /// Compute a hash string for a game row.
        /// </summary>
        private static string HashGame(ServerGameRow g)
        {
            // cheap + stable: hash name + modified + playtime etc.
            var sb = new StringBuilder();
            sb.Append(g.Name).Append("|");
            sb.Append(g.SortingName).Append("|");
            sb.Append(g.Hidden).Append("|");
            sb.Append(g.IsInstalled).Append("|");
            sb.Append(g.Modified?.Ticks ?? 0).Append("|");
            sb.Append(g.Playtime).Append("|");
            sb.Append(g.PlayCount).Append("|");
            sb.Append(g.Icon).Append("|");
            sb.Append(g.CoverImage).Append("|");
            sb.Append(g.BackgroundImage);

            using (var sha = SHA1.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(sb.ToString());
                var hash = sha.ComputeHash(bytes);
                return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            }
        }

        /// <summary>
        /// Compute a hash string for a named row.
        /// </summary>
        private static string HashNamed(string name)
        {
            using (var sha = SHA1.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(name ?? "");
                var hash = sha.ComputeHash(bytes);
                return BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            }
        }

        /// <summary>
        /// Apply database delta changes.
        /// </summary>
        private async Task ApplyDbDeltaAsync(
            ServerStateStore.State prev,
            ServerStateStore.State next,
            ServerGameRow[] games,
            ServerNamedRow[] tags,
            ServerNamedRow[] sources,
            ServerNamedRow[] platforms,
            ServerNamedRow[] genres,
            ServerNamedRow[] categories,
            ServerNamedRow[] features
        )
        {
            blog.Debug("pull", "Applying DB delta");

            // Helpers to compute ids to upsert/delete
            (HashSet<Guid> toUpsert, HashSet<Guid> toDelete) Compute(
                string collection,
                Dictionary<Guid, string> prevMap,
                Dictionary<Guid, string> nextMap
            )
            {
                var prevIds = prevMap.Keys.ToHashSet();
                var nextIds = nextMap.Keys.ToHashSet();

                var upsert = new HashSet<Guid>(nextIds);
                upsert.ExceptWith(
                    prevIds.Where(id =>
                        prevMap.TryGetValue(id, out var ph)
                        && nextMap.TryGetValue(id, out var nh)
                        && ph == nh
                    )
                );

                var del = new HashSet<Guid>(prevIds);
                del.ExceptWith(nextIds);

                blog.Debug(
                    "pull",
                    "Delta",
                    new
                    {
                        collection,
                        upsert = upsert.Count,
                        delete = del.Count,
                    }
                );
                return (upsert, del);
            }

            prev.Hashes.TryGetValue("games", out var prevGames);
            prevGames ??= new Dictionary<Guid, string>();
            next.Hashes.TryGetValue("games", out var nextGames);
            nextGames ??= new Dictionary<Guid, string>();

            var (gamesUpsert, gamesDelete) = Compute("games", prevGames, nextGames);
            await UpsertGamesAsync(games.Where(g => gamesUpsert.Contains(g.Id)))
                .ConfigureAwait(false);
            DeleteGames(gamesDelete);

            // Named collections
            await UpsertNamedAsync("tags", tags, prev, next).ConfigureAwait(false);
            await UpsertNamedAsync("sources", sources, prev, next).ConfigureAwait(false);
            await UpsertNamedAsync("platforms", platforms, prev, next).ConfigureAwait(false);
            await UpsertNamedAsync("genres", genres, prev, next).ConfigureAwait(false);
            await UpsertNamedAsync("categories", categories, prev, next).ConfigureAwait(false);
            await UpsertNamedAsync("features", features, prev, next).ConfigureAwait(false);
        }

        /// <summary>
        /// Delete games from the database by their IDs.
        /// </summary>
        private void DeleteGames(IEnumerable<Guid> ids)
        {
            foreach (var id in ids)
            {
                api.Database.Games.Remove(id);
            }
        }

        /// <summary>
        /// Upsert game rows into the database.
        /// </summary>
        private Task UpsertGamesAsync(IEnumerable<ServerGameRow> rows)
        {
            foreach (var g in rows)
            {
                var existing = api.Database.Games.Get(g.Id);
                if (existing == null)
                {
                    var newGame = new Game
                    {
                        Id = g.Id,
                        Name = g.Name,
                        SortingName = g.SortingName,
                        Hidden = g.Hidden,
                        IsInstalled = g.IsInstalled,
                        InstallDirectory = g.InstallDirectory,
                        InstallSize = g.InstallSize,
                        PluginId = g.PluginId,
                        GameId = g.GameId,
                        SourceId = g.SourceId,
                        TagIds = g.TagIds?.ToList(),
                        PlatformIds = g.PlatformIds?.ToList(),
                        GenreIds = g.GenreIds?.ToList(),
                        CategoryIds = g.CategoryIds?.ToList(),
                        FeatureIds = g.FeatureIds?.ToList(),
                        SeriesIds = g.SeriesIds?.ToList(),
                        CompletionStatusId = g.CompletionStatusId,
                        AgeRatingIds = g.AgeRatingIds?.ToList(),
                        RegionIds = g.RegionIds?.ToList(),
                        DeveloperIds = g.DeveloperIds?.ToList(),
                        PublisherIds = g.PublisherIds?.ToList(),
                        ReleaseDate = g.ReleaseDate,
                        Icon = g.Icon,
                        CoverImage = g.CoverImage,
                        BackgroundImage = g.BackgroundImage,
                        Added = g.Added,
                        Modified = g.Modified,
                        LastActivity = g.LastActivity,
                        Playtime = g.Playtime,
                        PlayCount = g.PlayCount,
                        UserScore = g.UserScore,
                        CommunityScore = g.CommunityScore,
                        CriticScore = g.CriticScore,
                        Description = g.Description,
                        Notes = g.Notes,
                        Links = g.Links,
                        GameActions = g.GameActions,
                        Roms = g.Roms,
                    };
                    api.Database.Games.Add(newGame);
                }
                else
                {
                    existing.Name = g.Name;
                    existing.SortingName = g.SortingName;
                    existing.Hidden = g.Hidden;
                    existing.IsInstalled = g.IsInstalled;
                    existing.InstallDirectory = g.InstallDirectory;
                    existing.InstallSize = g.InstallSize;
                    existing.PluginId = g.PluginId;
                    existing.GameId = g.GameId;
                    existing.SourceId = g.SourceId;
                    existing.TagIds = g.TagIds?.ToList();
                    existing.PlatformIds = g.PlatformIds?.ToList();
                    existing.GenreIds = g.GenreIds?.ToList();
                    existing.CategoryIds = g.CategoryIds?.ToList();
                    existing.FeatureIds = g.FeatureIds?.ToList();
                    existing.SeriesIds = g.SeriesIds?.ToList();
                    existing.CompletionStatusId = g.CompletionStatusId;
                    existing.AgeRatingIds = g.AgeRatingIds?.ToList();
                    existing.RegionIds = g.RegionIds?.ToList();
                    existing.DeveloperIds = g.DeveloperIds?.ToList();
                    existing.PublisherIds = g.PublisherIds?.ToList();
                    existing.ReleaseDate = g.ReleaseDate;
                    existing.Icon = g.Icon;
                    existing.CoverImage = g.CoverImage;
                    existing.BackgroundImage = g.BackgroundImage;
                    existing.Added = g.Added;
                    existing.Modified = g.Modified;
                    existing.LastActivity = g.LastActivity;
                    existing.Playtime = g.Playtime;
                    existing.PlayCount = g.PlayCount;
                    existing.UserScore = g.UserScore;
                    existing.CommunityScore = g.CommunityScore;
                    existing.CriticScore = g.CriticScore;
                    existing.Description = g.Description;
                    existing.Notes = g.Notes;
                    existing.Links = g.Links;
                    existing.GameActions = g.GameActions;
                    existing.Roms = g.Roms;
                }
            }

            return Task.CompletedTask;
        }

        /// <summary>
        /// Upsert named rows into the database.
        /// </summary>
        private Task UpsertNamedAsync(
            string collection,
            ServerNamedRow[] rows,
            ServerStateStore.State prev,
            ServerStateStore.State next
        )
        {
            prev.Hashes.TryGetValue(collection, out var prevMap);
            prevMap ??= new Dictionary<Guid, string>();
            next.Hashes.TryGetValue(collection, out var nextMap);
            nextMap ??= new Dictionary<Guid, string>();

            var (upsert, del) = ComputeNamedDelta(collection, prevMap, nextMap);
            var map = rows.ToDictionary(r => r.Id);

            static (HashSet<Guid> upsert, HashSet<Guid> del) ComputeNamedDelta(
                string collection,
                Dictionary<Guid, string> prevMap,
                Dictionary<Guid, string> nextMap
            )
            {
                var prevIds = prevMap.Keys.ToHashSet();
                var nextIds = nextMap.Keys.ToHashSet();

                var upsert = new HashSet<Guid>(nextIds);
                upsert.ExceptWith(
                    prevIds.Where(id =>
                        prevMap.TryGetValue(id, out var ph)
                        && nextMap.TryGetValue(id, out var nh)
                        && ph == nh
                    )
                );

                var del = new HashSet<Guid>(prevIds);
                del.ExceptWith(nextIds);

                return (upsert, del);
            }

            switch (collection)
            {
                case "tags":
                    foreach (var id in upsert)
                    {
                        if (!map.TryGetValue(id, out var r))
                            continue;

                        var existing = api.Database.Tags.Get(id);
                        if (existing == null)
                        {
                            var e = new Tag(r.Name) { Id = id };
                            api.Database.Tags.Add(e);
                        }
                        else
                        {
                            existing.Name = r.Name;
                            api.Database.Tags.Update(existing);
                        }
                    }

                    foreach (var id in del)
                    {
                        api.Database.Tags.Remove(id);
                    }
                    break;

                case "sources":
                    foreach (var id in upsert)
                    {
                        if (!map.TryGetValue(id, out var r))
                            continue;

                        var existing = api.Database.Sources.Get(id);
                        if (existing == null)
                        {
                            var e = new GameSource(r.Name) { Id = id };
                            api.Database.Sources.Add(e);
                        }
                        else
                        {
                            existing.Name = r.Name;
                            api.Database.Sources.Update(existing);
                        }
                    }

                    foreach (var id in del)
                    {
                        api.Database.Sources.Remove(id);
                    }
                    break;

                case "platforms":
                    foreach (var id in upsert)
                    {
                        if (!map.TryGetValue(id, out var r))
                            continue;

                        var existing = api.Database.Platforms.Get(id);
                        if (existing == null)
                        {
                            var e = new Platform(r.Name) { Id = id };
                            api.Database.Platforms.Add(e);
                        }
                        else
                        {
                            existing.Name = r.Name;
                            api.Database.Platforms.Update(existing);
                        }
                    }

                    foreach (var id in del)
                    {
                        api.Database.Platforms.Remove(id);
                    }
                    break;

                case "genres":
                    foreach (var id in upsert)
                    {
                        if (!map.TryGetValue(id, out var r))
                            continue;

                        var existing = api.Database.Genres.Get(id);
                        if (existing == null)
                        {
                            var e = new Genre(r.Name) { Id = id };
                            api.Database.Genres.Add(e);
                        }
                        else
                        {
                            existing.Name = r.Name;
                            api.Database.Genres.Update(existing);
                        }
                    }

                    foreach (var id in del)
                    {
                        api.Database.Genres.Remove(id);
                    }
                    break;

                case "categories":
                    foreach (var id in upsert)
                    {
                        if (!map.TryGetValue(id, out var r))
                            continue;

                        var existing = api.Database.Categories.Get(id);
                        if (existing == null)
                        {
                            var e = new Category(r.Name) { Id = id };
                            api.Database.Categories.Add(e);
                        }
                        else
                        {
                            existing.Name = r.Name;
                            api.Database.Categories.Update(existing);
                        }
                    }

                    foreach (var id in del)
                    {
                        api.Database.Categories.Remove(id);
                    }
                    break;

                case "features":
                    foreach (var id in upsert)
                    {
                        if (!map.TryGetValue(id, out var r))
                            continue;

                        var existing = api.Database.Features.Get(id);
                        if (existing == null)
                        {
                            var e = new GameFeature(r.Name) { Id = id };
                            api.Database.Features.Add(e);
                        }
                        else
                        {
                            existing.Name = r.Name;
                            api.Database.Features.Update(existing);
                        }
                    }

                    foreach (var id in del)
                    {
                        api.Database.Features.Remove(id);
                    }
                    break;
            }

            return Task.CompletedTask;
        }

        /// <summary>
        /// Apply media delta changes.
        /// </summary>
        private async Task ApplyMediaDeltaAsync(
            ServerStateStore.State prev,
            ServerStateStore.State next,
            ServerGameRow[] games
        )
        {
            blog.Debug(
                "pull",
                "Applying media delta",
                new { prev = prev.MediaPaths.Count, next = next.MediaPaths.Count }
            );

            var toDownload = new HashSet<string>(next.MediaPaths, StringComparer.OrdinalIgnoreCase);
            var toDelete = new HashSet<string>(
                prev.MediaPaths.Except(next.MediaPaths, StringComparer.OrdinalIgnoreCase),
                StringComparer.OrdinalIgnoreCase
            );

            var mediaRoot = Path.Combine(playniteRoot, AppConstants.LibraryFilesDirName);

            foreach (var rel in toDownload)
            {
                var abs = Path.Combine(mediaRoot, rel.Replace('/', Path.DirectorySeparatorChar));
                if (File.Exists(abs))
                    continue;

                var bytes = await http.DownloadMediaAsync(syncUrl, rel).ConfigureAwait(false);
                if (bytes == null || bytes.Length == 0)
                    continue;

                var dir = Path.GetDirectoryName(abs);
                if (!string.IsNullOrEmpty(dir))
                    Directory.CreateDirectory(dir);

                File.WriteAllBytes(abs, bytes);
                blog.Debug("pull", "Downloaded media", new { rel, bytes = bytes.Length });
            }

            foreach (var rel in toDelete)
            {
                var abs = Path.Combine(mediaRoot, rel.Replace('/', Path.DirectorySeparatorChar));
                try
                {
                    if (File.Exists(abs))
                    {
                        File.Delete(abs);
                        blog.Debug("pull", "Deleted stale media", new { rel });
                    }
                }
                catch { }
            }
        }
    }
}
