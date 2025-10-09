using System;
using System.Security.Cryptography;
using System.Text;

namespace SyncniteBridge.Helpers
{
    internal static class Crypto
    {
        // Encrypts text for the current Windows user; returns Base64.
        public static string Protect(string plain)
        {
            if (string.IsNullOrEmpty(plain))
                return "";
            var bytes = Encoding.UTF8.GetBytes(plain);
            var prot = ProtectedData.Protect(
                bytes,
                optionalEntropy: null,
                scope: DataProtectionScope.CurrentUser
            );
            return Convert.ToBase64String(prot);
        }

        // Decrypts Base64 produced by Protect; returns empty on failure.
        public static string Unprotect(string b64)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(b64))
                    return "";
                var prot = Convert.FromBase64String(b64);
                var bytes = ProtectedData.Unprotect(
                    prot,
                    optionalEntropy: null,
                    scope: DataProtectionScope.CurrentUser
                );
                return Encoding.UTF8.GetString(bytes);
            }
            catch
            {
                return "";
            }
        }
    }
}
