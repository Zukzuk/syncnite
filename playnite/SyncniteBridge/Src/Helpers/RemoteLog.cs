namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Helper for building structured log event objects for remote logging.
    /// </summary>
    internal static class RemoteLog
    {
        public static object Build(
            string level,
            string kind,
            string msg,
            object data = null,
            string err = null,
            object ctx = null
        )
        {
            return new
            {
                ts = System.DateTime.UtcNow.ToString("o"),
                level = (level ?? "info").ToLowerInvariant(),
                kind = kind ?? "event",
                msg,
                data,
                err,
                ctx,
            };
        }
    }
}
