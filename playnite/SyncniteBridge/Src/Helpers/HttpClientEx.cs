using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Extended HTTP client for Syncnite operations.
    /// </summary>
    internal sealed class HttpClientEx
    {
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

        private static string Combine(string baseUrl, string path)
        {
            baseUrl = (baseUrl ?? string.Empty).TrimEnd('/');
            path = (path ?? string.Empty).TrimStart('/');
            return baseUrl + "/" + path;
        }

        /// <summary>
        /// POST /sync/snapshot with serialized snapshot JSON. Returns true on 2xx.
        /// </summary>
        public async Task<bool> UploadSnapshotAsync(string baseSyncUrl, object snapshot)
        {
            var url = Combine(baseSyncUrl, "snapshot");
            try
            {
                var json = Playnite.SDK.Data.Serialization.ToJson(snapshot);
                using var content = new StringContent(json, Encoding.UTF8, "application/json");

                var resp = await http.PostAsync(url, content).ConfigureAwait(false);
                if (!resp.IsSuccessStatusCode)
                {
                    blog?.Warn(
                        "http",
                        "snapshot upload failed (non-OK)",
                        new
                        {
                            url,
                            status = (int)resp.StatusCode,
                            reason = resp.ReasonPhrase,
                        }
                    );
                    return false;
                }

                blog?.Debug("http", "snapshot uploaded", new { url });
                return true;
            }
            catch (Exception ex)
            {
                blog?.Warn("http", "snapshot upload error", new { url, err = ex.Message });
                return false;
            }
        }

        /// <summary>
        /// POST /sync/delta with serialized inventory JSON. Returns T or null.
        /// </summary>
        public async Task<T?> PostJsonAsync<T>(string url, string json)
            where T : class
        {
            try
            {
                using var content = new StringContent(
                    json,
                    System.Text.Encoding.UTF8,
                    "application/json"
                );
                var resp = await http.PostAsync(url, content).ConfigureAwait(false);
                var body = await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
                if (!resp.IsSuccessStatusCode)
                {
                    blog?.Warn(
                        "http",
                        "post json non-OK",
                        new
                        {
                            url,
                            status = (int)resp.StatusCode,
                            reason = resp.ReasonPhrase,
                        }
                    );
                    return null;
                }
                return Playnite.SDK.Data.Serialization.FromJson<T>(body);
            }
            catch (Exception ex)
            {
                blog?.Warn("http", "post json failed", new { url, err = ex.Message });
                return null;
            }
        }

        /// <summary>
        /// Convenience: POST /{baseSyncUrl}/delta with inventory object.
        /// </summary>
        public Task<T?> GetDeltaAsync<T>(string baseSyncUrl, object inventory)
            where T : class
        {
            var url = Combine(baseSyncUrl, "delta");
            var json = Playnite.SDK.Data.Serialization.ToJson(inventory);
            return PostJsonAsync<T>(url, json);
        }

        /// <summary>
        /// PUT /{baseSyncUrl}/{collection}/{id} (entity JSON). Returns true on 2xx.
        /// </summary>
        public async Task<bool> UpsertEntityAsync(
            string baseSyncUrl,
            string collection,
            string id,
            string jsonBody
        )
        {
            var url = Combine(baseSyncUrl, $"{collection}/{id}");
            try
            {
                using var content = new StringContent(
                    jsonBody,
                    System.Text.Encoding.UTF8,
                    "application/json"
                );
                var resp = await http.PutAsync(url, content).ConfigureAwait(false);
                if (!resp.IsSuccessStatusCode)
                {
                    blog?.Warn(
                        "http",
                        "upsert non-OK",
                        new
                        {
                            url,
                            status = (int)resp.StatusCode,
                            reason = resp.ReasonPhrase,
                        }
                    );
                    return false;
                }
                return true;
            }
            catch (Exception ex)
            {
                blog?.Warn("http", "upsert failed", new { url, err = ex.Message });
                return false;
            }
        }

        /// <summary>
        /// DELETE /{baseSyncUrl}/{collection}/{id}. Returns true on 2xx.
        /// </summary>
        public async Task<bool> DeleteEntityAsync(string baseSyncUrl, string collection, string id)
        {
            var url = Combine(baseSyncUrl, $"{collection}/{id}");
            try
            {
                var resp = await http.DeleteAsync(url).ConfigureAwait(false);
                if (!resp.IsSuccessStatusCode)
                {
                    blog?.Warn(
                        "http",
                        "delete non-OK",
                        new
                        {
                            url,
                            status = (int)resp.StatusCode,
                            reason = resp.ReasonPhrase,
                        }
                    );
                    return false;
                }
                return true;
            }
            catch (Exception ex)
            {
                blog?.Warn("http", "delete failed", new { url, err = ex.Message });
                return false;
            }
        }

        /// <summary>
        /// PUT /{baseSyncUrl}/media/{relativePath} with raw bytes and x-hash header. Returns true on 2xx.
        /// </summary>
        public async Task<bool> UploadMediaAsync(
            string baseSyncUrl,
            string relativePath,
            string fullPath,
            string? precomputedHash = null
        )
        {
            if (!File.Exists(fullPath))
                return false;

            // Normalize path and encode each segment, but keep "/" as separator
            var normalized = relativePath.Replace('\\', '/').Trim('/');
            var segments = normalized.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries);
            var encodedSegments = Array.ConvertAll(segments, Uri.EscapeDataString);
            var encodedPath = string.Join("/", encodedSegments);

            var url = Combine(baseSyncUrl, $"media/{encodedPath}");

            try
            {
                byte[] bytes;
                using (var fs = File.OpenRead(fullPath))
                using (var ms = new MemoryStream())
                {
                    await fs.CopyToAsync(ms).ConfigureAwait(false);
                    bytes = ms.ToArray();
                }

                var hash = precomputedHash ?? HashUtil.Sha1(Convert.ToBase64String(bytes));
                using var content = new ByteArrayContent(bytes);
                content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");

                var req = new HttpRequestMessage(HttpMethod.Put, url) { Content = content };
                req.Headers.TryAddWithoutValidation("x-hash", hash);

                var resp = await http.SendAsync(req).ConfigureAwait(false);
                if (!resp.IsSuccessStatusCode)
                {
                    blog?.Warn(
                        "http",
                        "media non-OK",
                        new
                        {
                            url,
                            status = (int)resp.StatusCode,
                            reason = resp.ReasonPhrase,
                        }
                    );
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                blog?.Warn("http", "media upload failed", new { url, err = ex.Message });
                return false;
            }
        }
    }
}
