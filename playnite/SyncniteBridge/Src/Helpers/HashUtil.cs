using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace SyncniteBridge.Helpers
{
    /// <summary>
    /// Helper methods for computing hashes.
    /// </summary>
    internal static class HashUtil
    {
        /// <summary>
        /// Compute the SHA1 hash of the given input string.
        /// </summary>
        public static string Sha1(string input)
        {
            using (var sha = SHA1.Create())
            {
                var bytes = Encoding.UTF8.GetBytes(input ?? string.Empty);
                var hash = sha.ComputeHash(bytes);
                return string.Concat(hash.Select(b => b.ToString("x2")));
            }
        }
    }
}
