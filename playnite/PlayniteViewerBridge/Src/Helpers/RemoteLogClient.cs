using System;
using System.Collections.Concurrent;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace PlayniteViewerBridge.Helpers
{
    internal sealed class RemoteLogClient : IDisposable
    {
        private const int MaxBatch = 32;
        private const int MaxDrainMs = 1500;
        private const int BaseBackoffMs = 500;

        private readonly HttpClient http;
        private string logEndpoint;
        private readonly BlockingCollection<string> queue = new BlockingCollection<string>(
            new ConcurrentQueue<string>()
        );
        private readonly CancellationTokenSource cts = new CancellationTokenSource();
        private readonly Task worker;

        public RemoteLogClient(string logEndpoint)
        {
            this.logEndpoint = (logEndpoint ?? "").TrimEnd('/');
            http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            worker = Task.Run(() => PumpAsync(cts.Token));
        }

        public void UpdateEndpoint(string endpoint) => logEndpoint = (endpoint ?? "").TrimEnd('/');

        public void Enqueue(object evt)
        {
            try
            {
                var json = Playnite.SDK.Data.Serialization.ToJson(evt);
                if (!queue.IsAddingCompleted)
                    queue.Add(json);
            }
            catch { }
        }

        private async Task PumpAsync(CancellationToken ct)
        {
            var batch = new System.Collections.Generic.List<string>(MaxBatch);
            var failures = 0;

            while (!ct.IsCancellationRequested)
            {
                try
                {
                    if (!queue.TryTake(out var first, 100, ct))
                        continue;

                    batch.Clear();
                    batch.Add(first);
                    while (batch.Count < MaxBatch && queue.TryTake(out var next))
                        batch.Add(next);

                    var payload = "[" + string.Join(",", batch) + "]";
                    using var content = new StringContent(
                        payload,
                        Encoding.UTF8,
                        "application/json"
                    );
                    using var req = new HttpRequestMessage(HttpMethod.Post, logEndpoint)
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
                queue.CompleteAdding();
            }
            catch { }
            try
            {
                var sw = System.Diagnostics.Stopwatch.StartNew();
                while (sw.ElapsedMilliseconds < MaxDrainMs && queue.Count > 0)
                {
                    Thread.Sleep(50);
                }
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
    }
}
