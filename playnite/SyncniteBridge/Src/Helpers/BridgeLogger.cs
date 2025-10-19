using System;
using System.Collections.Concurrent;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Playnite.SDK;
using SyncniteBridge.Constants;

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

    /// <summary>
    /// Logger that sends logs both to Playnite and to the Syncnite server.
    /// </summary>
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

        /// <summary>
        /// Create a new BridgeLogger.
        /// </summary>
        public BridgeLogger(string apiBase, string version, string level = "info")
        {
            endpoint = Combine(apiBase, AppConstants.Path_Syncnite_Log);
            ver = version ?? "dev";
            threshold = Parse(level);
            worker = Task.Run(() => PumpAsync(cts.Token));
            AuthHeaders.Apply(http);
        }

        /// <summary>
        /// Update the API base URL.
        /// </summary>
        public void UpdateApiBase(string apiBase) =>
            endpoint = Combine(apiBase, AppConstants.Path_Syncnite_Log);

        /// <summary>
        /// Update the logging level.
        /// </summary>
        public void UpdateLevel(string level) => threshold = Parse(level);

        /// <summary>
        /// Log an error message.
        /// </summary>
        public void Error(string kind, string msg, object? data = null, string? err = null) =>
            Emit(BridgeLevel.Error, kind, msg, data, err);

        /// <summary>
        /// Log a warning message.
        /// </summary>
        public void Warn(string kind, string msg, object? data = null) =>
            Emit(BridgeLevel.Warn, kind, msg, data);

        /// <summary>
        /// Log an informational message.
        /// </summary>
        public void Info(string kind, string msg, object? data = null) =>
            Emit(BridgeLevel.Info, kind, msg, data);

        /// <summary>
        /// Log a debug message.
        /// </summary>
        public void Debug(string kind, string msg, object? data = null)
        {
            if (threshold >= BridgeLevel.Debug)
                Emit(BridgeLevel.Debug, kind, msg, data);
        }

        /// <summary>
        /// Log a trace message.
        /// </summary>
        public void Trace(string kind, string msg, object? data = null)
        {
            if (threshold >= BridgeLevel.Trace)
                Emit(BridgeLevel.Trace, kind, msg, data);
        }

        /// <summary>
        /// Emit a log message.
        /// </summary>
        private void Emit(
            BridgeLevel lvl,
            string kind,
            string msg,
            object? data = null,
            string? err = null
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

        /// <summary>
        /// Asynchronous log pumping task.
        /// </summary>
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

        /// <summary>
        /// Parse a logging level string.
        /// </summary>
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

        /// <summary>
        /// Combine base URL and path.
        /// </summary>
        private static string Combine(string baseUrl, string path)
        {
            baseUrl = (baseUrl ?? string.Empty).TrimEnd('/');
            path = (path ?? string.Empty).TrimStart('/');
            return baseUrl + "/" + path;
        }
    }
}
