using System;
using System.Collections.Generic;
using System.Net.Http;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Central place to set auth once and have it automatically
    /// applied to every HttpClient we use.
    /// </summary>
    internal static class AuthHeaders
    {
        private static string email = "";
        private static string password = "";
        private static string clientId = "";

        // Keep weak refs so disposed clients don’t leak.
        private static readonly List<WeakReference<HttpClient>> clients =
            new List<WeakReference<HttpClient>>();

        /// <summary>
        /// Set the email and password to be used for authentication.
        /// </summary>
        public static void Set(string newEmail, string newPassword, string newClientId)
        {
            email = newEmail?.Trim() ?? "";
            password = newPassword ?? "";
            clientId = newClientId ?? "";
            ReapplyAll();
        }

        /// <summary>
        /// Apply auth headers to the given HttpClient.
        /// </summary>
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

        /// <summary>
        /// Apply current auth headers to the given HttpClient.
        /// </summary>
        private static void Stamp(HttpClient http)
        {
            try
            {
                if (http.DefaultRequestHeaders.Contains("X-Auth-Email"))
                    http.DefaultRequestHeaders.Remove("X-Auth-Email");
                if (http.DefaultRequestHeaders.Contains("X-Auth-Password"))
                    http.DefaultRequestHeaders.Remove("X-Auth-Password");
                if (http.DefaultRequestHeaders.Contains("X-Client-Id"))
                    http.DefaultRequestHeaders.Remove("X-Client-Id");

                if (!string.IsNullOrWhiteSpace(email))
                    http.DefaultRequestHeaders.Add("X-Auth-Email", email.ToLowerInvariant());
                if (!string.IsNullOrWhiteSpace(password))
                    http.DefaultRequestHeaders.Add("X-Auth-Password", password);
                if (!string.IsNullOrWhiteSpace(clientId))
                    http.DefaultRequestHeaders.Add("X-Client-Id", clientId);
            }
            catch { 
                // swallow: best effort
            }
        }

        /// <summary>
        /// Reapply auth headers to all tracked HttpClients.
        /// </summary>
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
    }
}
