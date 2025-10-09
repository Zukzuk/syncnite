// Src/Helpers/BridgeLogger.cs
using System;
using System.Collections.Concurrent;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Playnite.SDK;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Logging levels for the bridge logger.
    /// </summary>
    internal enum BridgeLevel
    {
        Error = 0,
        Warn = 1,
        Info = 2,
        Debug = 3,
        Trace = 4,
    }

    internal sealed class BridgeLogger : IDisposable
    {
        private const int MaxBatch = 32;
        private const int SendTimeoutMs = 10_000;
        private const int MaxDrainMs = 1500;
        private const int BaseBackoffMs = 500;

        private readonly ILogger plog = LogManager.GetLogger();
        private readonly HttpClient http = new HttpClient
        {
            Timeout = TimeSpan.FromMilliseconds(SendTimeoutMs),
        };
        private readonly BlockingCollection<string> q = new BlockingCollection<string>(
            new ConcurrentQueue<string>()
        );
        private readonly CancellationTokenSource cts = new CancellationTokenSource();
        private readonly Task worker;

        private string endpoint;
        private readonly string ver;
        private BridgeLevel threshold;

        public BridgeLogger(string apiBase, string version, string level = "info")
        {
            endpoint = Combine(apiBase, "sync/log"); // same endpoint name as before
            ver = version ?? "dev";
            threshold = Parse(level);
            worker = Task.Run(() => PumpAsync(cts.Token));
            AuthHeaders.Apply(http);
        }

        public void UpdateApiBase(string apiBase) => endpoint = Combine(apiBase, "sync/log");

        public void UpdateLevel(string level) => threshold = Parse(level);

        public void Error(string kind, string msg, object data = null, string err = null) =>
            Emit(BridgeLevel.Error, kind, msg, data, err);

        public void Warn(string kind, string msg, object data = null) =>
            Emit(BridgeLevel.Warn, kind, msg, data);

        public void Info(string kind, string msg, object data = null) =>
            Emit(BridgeLevel.Info, kind, msg, data);

        public void Debug(string kind, string msg, object data = null)
        {
            if (threshold >= BridgeLevel.Debug)
                Emit(BridgeLevel.Debug, kind, msg, data);
        }

        public void Trace(string kind, string msg, object data = null)
        {
            if (threshold >= BridgeLevel.Trace)
                Emit(BridgeLevel.Trace, kind, msg, data);
        }

        private void Emit(
            BridgeLevel lvl,
            string kind,
            string msg,
            object data = null,
            string err = null
        )
        {
            if (lvl > threshold)
                return;
            var levelStr = lvl.ToString().ToUpperInvariant();
            var line = $"[ext][v{ver}][{levelStr}] {kind}: {msg}";

            // 1) Local Playnite log (compact, consistent)
            if (lvl == BridgeLevel.Error)
                plog.Error(line);
            else if (lvl == BridgeLevel.Warn)
                plog.Warn(line);
            else
                plog.Info(line);

            // 2) Remote payload (preformatted + structured)
            var json = Playnite.SDK.Data.Serialization.ToJson(
                new
                {
                    ts = DateTime.UtcNow.ToString("o"),
                    level = levelStr.ToLowerInvariant(),
                    kind = kind ?? "event",
                    msg = msg,
                    data = data,
                    err = err,
                    ctx = new { bridgeVersion = ver },
                    line = line,
                }
            );

            try
            {
                if (!q.IsAddingCompleted)
                    q.Add(json);
            }
            catch
            { /* swallow */
            }
        }

        private async Task PumpAsync(CancellationToken ct)
        {
            var batch = new System.Collections.Generic.List<string>(MaxBatch);
            var failures = 0;

            while (!ct.IsCancellationRequested)
            {
                try
                {
                    if (!q.TryTake(out var first, 100, ct))
                        continue;
                    batch.Clear();
                    batch.Add(first);
                    while (batch.Count < MaxBatch && q.TryTake(out var next))
                        batch.Add(next);

                    var payload = "[" + string.Join(",", batch) + "]";
                    using var content = new StringContent(
                        payload,
                        Encoding.UTF8,
                        "application/json"
                    );
                    using var req = new HttpRequestMessage(HttpMethod.Post, endpoint)
                    {
                        Content = content,
                    };
                    var resp = await http.SendAsync(req, ct).ConfigureAwait(false);
                    resp.EnsureSuccessStatusCode();
                    failures = 0;
                }
                catch (OperationCanceledException) { }
                catch
                {
                    failures++;
                    var backoff = Math.Min(BaseBackoffMs * (1 << Math.Min(failures, 5)), 8000);
                    try
                    {
                        await Task.Delay(backoff, ct).ConfigureAwait(false);
                    }
                    catch { }
                }
            }
        }

        public void Dispose()
        {
            try
            {
                q.CompleteAdding();
            }
            catch { }
            try
            {
                var sw = System.Diagnostics.Stopwatch.StartNew();
                while (sw.ElapsedMilliseconds < MaxDrainMs && q.Count > 0)
                    Thread.Sleep(50);
            }
            catch { }
            try
            {
                cts.Cancel();
            }
            catch { }
            try
            {
                worker.Wait(500);
            }
            catch { }
            try
            {
                http.Dispose();
            }
            catch { }
            try
            {
                cts.Dispose();
            }
            catch { }
        }

        private static BridgeLevel Parse(string s)
        {
            switch ((s ?? "info").Trim().ToLowerInvariant())
            {
                case "error":
                    return BridgeLevel.Error;
                case "warn":
                    return BridgeLevel.Warn;
                case "info":
                    return BridgeLevel.Info;
                case "debug":
                    return BridgeLevel.Debug;
                case "trace":
                    return BridgeLevel.Trace;
                default:
                    return BridgeLevel.Info;
            }
        }

        private static string Combine(string baseUrl, string path)
        {
            baseUrl = (baseUrl ?? string.Empty).TrimEnd('/');
            path = (path ?? string.Empty).TrimStart('/');
            return baseUrl + "/" + path;
        }
    }
}
