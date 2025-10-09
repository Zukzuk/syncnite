using System;
using System.Collections.Generic;
using System.Net.Http;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Central place to set auth once and have it automatically applied to every HttpClient we use.
    /// </summary>
    internal static class AuthHeaders
    {
        private static string email = "";
        private static string password = "";

        // Keep weak refs so disposed clients don’t leak.
        private static readonly List<WeakReference<HttpClient>> clients =
            new List<WeakReference<HttpClient>>();

        public static void Set(string newEmail, string newPassword)
        {
            email = newEmail?.Trim() ?? "";
            password = newPassword ?? "";
            ReapplyAll();
        }

        public static void Apply(HttpClient http)
        {
            if (http == null)
                return;

            // Track this client
            lock (clients)
            {
                clients.Add(new WeakReference<HttpClient>(http));
            }

            // Stamp headers now
            Stamp(http);
        }

        private static void Stamp(HttpClient http)
        {
            try
            {
                if (http.DefaultRequestHeaders.Contains("X-Auth-Email"))
                    http.DefaultRequestHeaders.Remove("X-Auth-Email");
                if (http.DefaultRequestHeaders.Contains("X-Auth-Password"))
                    http.DefaultRequestHeaders.Remove("X-Auth-Password");

                if (!string.IsNullOrWhiteSpace(email))
                    http.DefaultRequestHeaders.Add("X-Auth-Email", email.ToLowerInvariant());
                if (!string.IsNullOrWhiteSpace(password))
                    http.DefaultRequestHeaders.Add("X-Auth-Password", password);
            }
            catch
            { /* non-fatal */
            }
        }

        private static void ReapplyAll()
        {
            lock (clients)
            {
                for (int i = clients.Count - 1; i >= 0; i--)
                {
                    if (!clients[i].TryGetTarget(out var http) || http == null)
                    {
                        clients.RemoveAt(i);
                        continue;
                    }
                    Stamp(http);
                }
            }
        }

        public static bool MissingCredentials =>
            string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password);
    }
}
