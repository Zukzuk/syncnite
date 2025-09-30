using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace SyncniteBridge.Helpers
{
    internal sealed class HttpClientEx
    {
        private sealed class SyncResp
        {
            public bool ok { get; set; }
        }

        public sealed class RemoteJsonFile
        {
            public long size { get; set; }
            public long mtimeMs { get; set; }
        }

        public sealed class RemoteInstalled
        {
            public int count { get; set; }
            public string hash { get; set; }
        }

        public sealed class RemoteManifest
        {
            // e.g. { "games.Game.json": { size, mtimeMs }, ... }
            public Dictionary<string, RemoteJsonFile> json { get; set; } =
                new Dictionary<string, RemoteJsonFile>(StringComparer.OrdinalIgnoreCase);

            // top-level folder names under /data/libraryfiles
            public List<string> mediaFolders { get; set; } = new List<string>();

            public RemoteInstalled installed { get; set; } = new RemoteInstalled();
        }

        public sealed class RemoteManifestWrapper
        {
            public bool ok { get; set; }
            public string generatedAt { get; set; }
            public RemoteManifest manifest { get; set; }
        }

        private readonly HttpClient http;

        public HttpClientEx()
        {
            http = new HttpClient { Timeout = TimeSpan.FromMinutes(5) };
        }

        public async Task<bool> PingAsync(string url)
        {
            try
            {
                var resp = await http.GetAsync(url).ConfigureAwait(false);
                return resp.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        public async Task<RemoteManifestWrapper> GetRemoteManifestAsync(string manifestUrl)
        {
            try
            {
                var resp = await http.GetAsync(manifestUrl).ConfigureAwait(false);
                if (resp.StatusCode == HttpStatusCode.NotFound)
                {
                    return new RemoteManifestWrapper
                    {
                        ok = true,
                        generatedAt = DateTime.UtcNow.ToString("o"),
                        manifest = new RemoteManifest(),
                    };
                }
                if (!resp.IsSuccessStatusCode)
                    return new RemoteManifestWrapper
                    {
                        ok = true,
                        generatedAt = DateTime.UtcNow.ToString("o"),
                        manifest = new RemoteManifest(),
                    };

                var body = await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
                var parsed = Playnite.SDK.Data.Serialization.FromJson<RemoteManifestWrapper>(body);
                return parsed
                    ?? new RemoteManifestWrapper
                    {
                        ok = true,
                        generatedAt = DateTime.UtcNow.ToString("o"),
                        manifest = new RemoteManifest(),
                    };
            }
            catch
            {
                // treat as empty
                return new RemoteManifestWrapper
                {
                    ok = true,
                    generatedAt = DateTime.UtcNow.ToString("o"),
                    manifest = new RemoteManifest(),
                };
            }
        }

        // Upload ZIP from disk
        public async Task<bool> SyncZipAsync(string syncUrl, string zipPath)
        {
            using (var content = new MultipartFormDataContent())
            using (var fileContent = new StreamContent(File.OpenRead(zipPath)))
            {
                fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
                content.Add(fileContent, "file", Path.GetFileName(zipPath));

                var resp = await http.PostAsync(syncUrl, content).ConfigureAwait(false);
                var body = await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
                if (!resp.IsSuccessStatusCode)
                    return false;

                try
                {
                    var obj = Playnite.SDK.Data.Serialization.FromJson<SyncResp>(body);
                    return obj != null && obj.ok;
                }
                catch
                {
                    return true;
                } // accept 200 without JSON body
            }
        }
    }
}
