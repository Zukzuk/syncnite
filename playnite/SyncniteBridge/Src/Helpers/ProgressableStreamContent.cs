using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// HttpContent that reports upload progress via a callback (sent,total).
    /// </summary>
    internal sealed class ProgressableStreamContent : HttpContent
    {
        private const int BufferSize = 64 * 1024;
        private readonly Stream src;
        private readonly long length;
        private readonly Action<long, long> onProgress; // (sent,total)

        public ProgressableStreamContent(Stream source, long length, Action<long, long> onProgress)
        {
            src = source ?? throw new ArgumentNullException(nameof(source));
            this.length = length >= 0 ? length : 0;
            this.onProgress = onProgress ?? ((_, __) => { });
            Headers.ContentLength = this.length;
            Headers.ContentType = new MediaTypeHeaderValue("application/zip");
        }

        protected override async Task SerializeToStreamAsync(
            Stream target,
            TransportContext context
        )
        {
            var buffer = new byte[BufferSize];
            long sent = 0;
            int read;
            var lastTick = Environment.TickCount;

            while ((read = await src.ReadAsync(buffer, 0, buffer.Length).ConfigureAwait(false)) > 0)
            {
                await target.WriteAsync(buffer, 0, read).ConfigureAwait(false);
                sent += read;

                // ~10 updates/sec (and always on completion)
                var now = Environment.TickCount;
                if (now - lastTick >= 100 || sent == length)
                {
                    onProgress(sent, length);
                    lastTick = now;
                }
            }
        }

        protected override bool TryComputeLength(out long length64)
        {
            length64 = length;
            return true;
        }
    }
}
