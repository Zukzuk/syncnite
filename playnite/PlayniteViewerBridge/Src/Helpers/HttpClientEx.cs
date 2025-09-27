using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace PlayniteViewerBridge.Helpers
{
    internal sealed class HttpClientEx
    {
        private sealed class SyncResp
        {
            public bool ok { get; set; }
        }

        public sealed class RemoteIndexFile
        {
            public string rel { get; set; }
            public long size { get; set; }
            public long mtimeMs { get; set; }
        }

        public sealed class RemoteIndex
        {
            public bool ok { get; set; }
            public List<RemoteIndexFile> files { get; set; }
            public string generatedAt { get; set; }
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

        public async Task<RemoteIndex> GetRemoteIndexAsync(string indexUrl)
        {
            try
            {
                var resp = await http.GetAsync(indexUrl).ConfigureAwait(false);
                if (resp.StatusCode == HttpStatusCode.NotFound)
                {
                    return new RemoteIndex
                    {
                        ok = true,
                        files = new List<RemoteIndexFile>(),
                        generatedAt = DateTime.UtcNow.ToString("o"),
                    };
                }
                if (!resp.IsSuccessStatusCode)
                    return null;

                var body = await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
                var parsed = Playnite.SDK.Data.Serialization.FromJson<RemoteIndex>(body);
                return parsed
                    ?? new RemoteIndex
                    {
                        ok = true,
                        files = new List<RemoteIndexFile>(),
                        generatedAt = DateTime.UtcNow.ToString("o"),
                    };
            }
            catch
            {
                // treat as empty index so we can seed
                return new RemoteIndex
                {
                    ok = true,
                    files = new List<RemoteIndexFile>(),
                    generatedAt = DateTime.UtcNow.ToString("o"),
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
