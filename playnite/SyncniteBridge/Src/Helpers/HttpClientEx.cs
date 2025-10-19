using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using SyncniteBridge.Helpers;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Extended HTTP client for Syncnite operations.
    /// </summary>
    internal sealed class HttpClientEx
    {
        /// <summary>
        /// Response from sync upload.
        /// </summary>
        private sealed class SyncResp
        {
            public bool ok { get; set; }
        }

        /// <summary>
        /// Remote JSON file info.
        /// </summary>
        public sealed class RemoteJsonFile
        {
            public long size { get; set; }
            public long mtimeMs { get; set; }
        }

        /// <summary>
        /// Remote installed info.
        /// </summary>
        public sealed class RemoteInstalled
        {
            public int count { get; set; }
            public string hash { get; set; } = string.Empty;
        }

        /// <summary>
        /// Remote manifest structure.
        /// </summary>
        public sealed class RemoteManifest
        {
            public Dictionary<string, RemoteJsonFile> json { get; set; } =
                new(StringComparer.OrdinalIgnoreCase);
            public RemoteInstalled installed { get; set; } = new();
        }

        /// <summary>
        /// Remote manifest wrapper structure.
        /// </summary>
        public sealed class RemoteManifestWrapper
        {
            public bool ok { get; set; }
            public string generatedAt { get; set; } = string.Empty;
            public RemoteManifest manifest { get; set; } = new();
        }

        private readonly HttpClient http;
        private readonly BridgeLogger? blog;

        /// <summary>
        /// Create a new HttpClientEx.
        /// </summary>
        public HttpClientEx(BridgeLogger? blog, TimeSpan? timeout = null)
        {
            this.blog = blog;
            http = new HttpClient { Timeout = timeout ?? TimeSpan.FromMinutes(5) };
            AuthHeaders.Apply(http);
        }

        /// <summary>
        /// Ping the given URL; returns true on 200 OK.
        /// </summary>
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

        /// <summary>
        /// Upload ZIP from disk to sync endpoint (sparse progress).
        /// </summary>
        public async Task<bool> SyncZipAsync(string syncUrl, string zipPath)
        {
            var fi = new FileInfo(zipPath);
            var total = fi.Exists ? fi.Length : -1;

            blog?.Info("sync", "upload start");
            blog?.Debug(
                "sync",
                "upload info",
                new { size = total, name = Path.GetFileName(zipPath) }
            );

            using (var content = new MultipartFormDataContent())
            using (var fs = File.OpenRead(zipPath))
            {
                var upBuckets = new PercentBuckets(step: 10);
                var fileContent = new ProgressableStreamContent(
                    fs,
                    total,
                    (sent, len) =>
                    {
                        if (len > 0)
                        {
                            var pct = (int)Math.Max(0, Math.Min(100, (sent * 100L) / len));
                            if (upBuckets.ShouldEmit(pct, out var b))
                            {
                                blog?.Info("progress", "uploading");
                                blog?.Debug(
                                    "progress",
                                    "uploading",
                                    new { phase = "upload", percent = b }
                                );
                            }
                        }
                    }
                );

                content.Add(fileContent, "file", Path.GetFileName(zipPath));

                try
                {
                    var resp = await http.PostAsync(syncUrl, content).ConfigureAwait(false);
                    var body = await resp.Content.ReadAsStringAsync().ConfigureAwait(false);

                    if (!resp.IsSuccessStatusCode)
                    {
                        blog?.Warn(
                            "http",
                            "upload non-OK",
                            new { status = (int)resp.StatusCode, reason = resp.ReasonPhrase }
                        );
                        return false;
                    }

                    blog?.Debug(
                        "progress",
                        "upload complete",
                        new { phase = "upload", percent = 100 }
                    );
                    blog?.Info("sync", "upload done");

                    try
                    {
                        var obj = Playnite.SDK.Data.Serialization.FromJson<SyncResp>(body);
                        return obj != null && obj.ok;
                    }
                    catch
                    {
                        return true; // accept 200 without JSON body
                    }
                }
                catch (Exception ex)
                {
                    blog?.Warn("http", "upload failed", new { err = ex.Message });
                    return false;
                }
            }
        }
    }
}
