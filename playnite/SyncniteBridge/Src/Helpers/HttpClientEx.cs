using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Helper class extending HttpClient for Syncnite-specific operations.
    /// </summary>
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
        private readonly BridgeLogger blog;

        public HttpClientEx(BridgeLogger blog, TimeSpan? timeout = null)
        {
            this.blog = blog;
            http = new HttpClient { Timeout = timeout ?? TimeSpan.FromMinutes(5) };
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

        /// <summary>Upload ZIP from disk to sync endpoint.</summary>
        public async Task<bool> SyncZipAsync(string syncUrl, string zipPath)
        {
            var fi = new FileInfo(zipPath);
            blog?.Debug(
                "http",
                "POST sync ZIP begin",
                new
                {
                    syncUrl,
                    size = fi.Exists ? fi.Length : -1,
                    name = Path.GetFileName(zipPath),
                }
            );

            using (var content = new MultipartFormDataContent())
            using (var fs = File.OpenRead(zipPath))
            using (var fileContent = new StreamContent(fs))
            {
                fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
                content.Add(fileContent, "file", Path.GetFileName(zipPath));

                HttpResponseMessage resp = null;
                string body = null;

                try
                {
                    resp = await http.PostAsync(syncUrl, content).ConfigureAwait(false);
                    body = await resp.Content.ReadAsStringAsync().ConfigureAwait(false);

                    if (!resp.IsSuccessStatusCode)
                    {
                        blog?.Warn(
                            "http",
                            "POST sync ZIP non-OK",
                            new { status = (int)resp.StatusCode, reason = resp.ReasonPhrase }
                        );
                        return false;
                    }

                    try
                    {
                        var obj = Playnite.SDK.Data.Serialization.FromJson<SyncResp>(body);
                        var ok = obj != null && obj.ok;
                        blog?.Debug("http", "POST sync ZIP OK", new { declaredOk = ok });
                        return ok;
                    }
                    catch
                    {
                        // Accept 200 without JSON body
                        blog?.Debug("http", "POST sync ZIP OK (no JSON body)");
                        return true;
                    }
                }
                catch (Exception ex)
                {
                    blog?.Warn("http", "POST sync ZIP failed", new { err = ex.Message });
                    return false;
                }
            }
        }
    }
}
