using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using Playnite.SDK.Models;

namespace SyncniteBridge.Models
{
    /// <summary>
    /// Lightweight snapshot of a game row as sent by the Syncnite API.
    /// Shape intentionally mirrors Playnite.SDK.Models.Game where used.
    /// </summary>
    internal sealed class ServerGameRow
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = "";
        public string SortingName { get; set; } = "";

        public bool Hidden { get; set; }

        public Guid PluginId { get; set; }
        public string GameId { get; set; } = "";

        public Guid SourceId { get; set; }

        public List<Guid> TagIds { get; set; } = new List<Guid>();
        public List<Guid> PlatformIds { get; set; } = new List<Guid>();
        public List<Guid> GenreIds { get; set; } = new List<Guid>();
        public List<Guid> CategoryIds { get; set; } = new List<Guid>();
        public List<Guid> FeatureIds { get; set; } = new List<Guid>();
        public List<Guid> SeriesIds { get; set; } = new List<Guid>();

        public Guid CompletionStatusId { get; set; }

        public List<Guid> AgeRatingIds { get; set; } = new List<Guid>();
        public List<Guid> RegionIds { get; set; } = new List<Guid>();
        public List<Guid> DeveloperIds { get; set; } = new List<Guid>();
        public List<Guid> PublisherIds { get; set; } = new List<Guid>();

        public ReleaseDate? ReleaseDate { get; set; }

        public string Icon { get; set; } = "";
        public string CoverImage { get; set; } = "";
        public string BackgroundImage { get; set; } = "";

        public DateTime? Added { get; set; }
        public DateTime? Modified { get; set; }
        public DateTime? LastActivity { get; set; }

        public ulong Playtime { get; set; }
        public ulong PlayCount { get; set; }

        public int? UserScore { get; set; }
        public int? CommunityScore { get; set; }
        public int? CriticScore { get; set; }

        public string Description { get; set; } = "";
        public string Notes { get; set; } = "";

        public ObservableCollection<Link> Links { get; set; } = new ObservableCollection<Link>();

        public ObservableCollection<GameAction> GameActions { get; set; } =
            new ObservableCollection<GameAction>();

        public ObservableCollection<GameRom> Roms { get; set; } =
            new ObservableCollection<GameRom>();
    }
}
