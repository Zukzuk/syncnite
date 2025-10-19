using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Playnite.SDK.Models;
using SyncniteBridge.Constants;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Services
{
    /// <summary>
    /// Exports a curated Playnite SDK snapshot into a ZipBuilder under /library/*.json files.
    /// (Extracted from DeltaSyncService for clarity.)
    /// </summary>
    internal sealed class SdkSnapshotService
    {
        private readonly Playnite.SDK.IPlayniteAPI api;

        /// <summary>
        /// Initializes a new instance of the <see cref="SdkSnapshotService"/> class.
        /// </summary>
        public SdkSnapshotService(Playnite.SDK.IPlayniteAPI api)
        {
            this.api = api;
        }

        /// <summary>
        /// Export the SDK snapshot into the given ZipBuilder.
        /// </summary>
        public void Export(ZipBuilder zb)
        {
            // --- GAMES (explicit, richer projection)
            var games =
                api.Database.Games?.Select(g =>
                        (object)
                            new
                            {
                                g.Id,
                                g.Name,
                                g.SortingName,
                                g.Hidden,
                                g.IsInstalled,
                                g.InstallDirectory,
                                g.InstallSize,
                                g.PluginId,
                                g.GameId,
                                g.SourceId,
                                TagIds = (g.TagIds ?? new List<Guid>()).ToList(),
                                PlatformIds = (g.PlatformIds ?? new List<Guid>()).ToList(),
                                PrimaryPlatformId = (
                                    g.PlatformIds != null && g.PlatformIds.Count > 0
                                )
                                    ? (Guid?)g.PlatformIds[0]
                                    : null,
                                g.GenreIds,
                                g.CategoryIds,
                                g.FeatureIds,
                                SeriesIds = g.SeriesIds,
                                PrimarySeriesId = (g.SeriesIds != null && g.SeriesIds.Count > 0)
                                    ? (Guid?)g.SeriesIds[0]
                                    : null,
                                g.CompletionStatusId,
                                g.AgeRatingIds,
                                g.RegionIds,
                                g.DeveloperIds,
                                g.PublisherIds,
                                g.ReleaseDate,
                                ReleaseYear = (int?)g.ReleaseDate?.Year,
                                g.Icon,
                                g.CoverImage,
                                g.BackgroundImage,
                                g.Added,
                                g.Modified,
                                g.LastActivity,
                                g.Playtime,
                                g.PlayCount,
                                g.UserScore,
                                g.CommunityScore,
                                g.CriticScore,
                                g.Description,
                                g.Notes,
                                g.Links,
                                g.GameActions,
                                g.Roms,
                            }
                    )
                    .ToList() ?? new List<object>();

            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.GamesJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(games)
            );

            object MapNamed<T>(T x)
            {
                dynamic d = x;
                return new { Id = d.Id, Name = d.Name };
            }

            var tags =
                api.Database.Tags?.Select(MapNamed).Cast<object>().ToList() ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.TagsJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(tags)
            );

            var sources =
                api.Database.Sources?.Select(MapNamed).Cast<object>().ToList()
                ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.SourcesJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(sources)
            );

            var platforms =
                api.Database.Platforms?.Select(p =>
                        (object)
                            new
                            {
                                p.Id,
                                p.Name,
                                p.Icon,
                            }
                    )
                    .ToList() ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.PlatformsJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(platforms)
            );

            var genres =
                api.Database.Genres?.Select(MapNamed).Cast<object>().ToList() ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.GenresJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(genres)
            );

            var categories =
                api.Database.Categories?.Select(MapNamed).Cast<object>().ToList()
                ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.CategoriesJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(categories)
            );

            var features =
                api.Database.Features?.Select(MapNamed).Cast<object>().ToList()
                ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.FeaturesJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(features)
            );

            var series =
                api.Database.Series?.Select(MapNamed).Cast<object>().ToList() ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.SeriesJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(series)
            );

            var regions =
                api.Database.Regions?.Select(MapNamed).Cast<object>().ToList()
                ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.RegionsJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(regions)
            );

            var ageRatings =
                api.Database.AgeRatings?.Select(MapNamed).Cast<object>().ToList()
                ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.AgeRatingsJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(ageRatings)
            );

            var companies =
                api.Database.Companies?.Select(MapNamed).Cast<object>().ToList()
                ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.CompaniesJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(companies)
            );

            var completionStatuses =
                api.Database.CompletionStatuses?.Select(MapNamed).Cast<object>().ToList()
                ?? new List<object>();
            zb.AddText(
                Path.Combine(
                        AppConstants.LibraryDirName,
                        AppConstants.CompletionStatusesJsonFileName
                    )
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(completionStatuses)
            );

            var filterPresets =
                api.Database.FilterPresets?.Select(fp => (object)new { fp.Id, fp.Name }).ToList()
                ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.FilterPresetsJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(filterPresets)
            );

            var importExclusions =
                api.Database.ImportExclusions?.Select(MapNamed).Cast<object>().ToList()
                ?? new List<object>();
            zb.AddText(
                Path.Combine(AppConstants.LibraryDirName, AppConstants.ImportExclusionsJsonFileName)
                    .Replace('\\', '/'),
                Playnite.SDK.Data.Serialization.ToJson(importExclusions)
            );
        }
    }
}
