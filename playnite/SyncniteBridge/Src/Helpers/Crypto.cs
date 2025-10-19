using System;
using System.Security.Cryptography;
using System.Text;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Helper for encrypting/decrypting text for the current Windows user.
    /// </summary>
    internal static class Crypto
    {
        /// <summary>
        /// Encrypts plain text; returns Base64.
        /// </summary>
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

        /// <summary>
        /// Decrypts Base64 text; returns plain.
        /// </summary>
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
