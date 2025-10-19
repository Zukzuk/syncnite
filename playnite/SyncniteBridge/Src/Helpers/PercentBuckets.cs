using System;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Helper to track percentage progress in discrete buckets.
    /// </summary>
    internal sealed class PercentBuckets
    {
        private readonly int step;
        private int last = -1;

        /// <summary>
        /// Create a new PercentBuckets with the given step size.
        /// </summary>
        public PercentBuckets(int step = 10)
        {
            this.step = Math.Max(1, Math.Min(100, step));
        }

        /// <summary>
        /// Check if we should emit progress for the given percent.
        /// </summary>
        public bool ShouldEmit(int percent, out int bucketPercent)
        {
            var p = Math.Max(0, Math.Min(100, percent));
            var b = p == 100 ? 100 : (p / step) * step;
            bucketPercent = b;
            if (b != last)
            {
                last = b;
                return true;
            }
            return false;
        }
    }
}
