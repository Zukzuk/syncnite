using System.Text.Encodings.Web;
using System.Text.Json;
using LiteDB;

namespace PlayniteImport
{
    public static class PlayniteImport
    {
        public static int Main(string[] args)
        {
            if (args.Length < 2)
            {
                Console.Error.WriteLine("Usage: PlayniteImport <root-folder> <output-folder>");
                return 1;
            }

            // Resolve absolute paths and log them up front
            var rootDir = Path.GetFullPath(args[0]);
            var outDir = Path.GetFullPath(args[1]);
            Directory.CreateDirectory(outDir);

            Console.WriteLine($"RootDir: {rootDir}");
            Console.WriteLine($"OutDir:  {outDir}");
            Console.WriteLine($"CWD:     {Directory.GetCurrentDirectory()}");

            var password = Environment.GetEnvironmentVariable("LITEDB_PASSWORD");

            List<string> dbFiles;
            try
            {
                dbFiles = Directory
                    .EnumerateFiles(rootDir, "*.db", SearchOption.AllDirectories)
                    .OrderBy(f => f, StringComparer.OrdinalIgnoreCase)
                    .ToList();
            }
            catch (Exception e)
            {
                Console.Error.WriteLine(
                    $"Failed to enumerate DB files under {rootDir}: {e.Message}"
                );
                return 2;
            }

            if (!dbFiles.Any())
            {
                Console.Error.WriteLine($"No *.db files found under {rootDir}");
                return 2;
            }

            Console.WriteLine($"Found {dbFiles.Count} .db files:");

            int dumped = 0,
                skipped = 0;
            long filesWritten = 0;

            string SanitizeRel(string rel)
            {
                var noExt = Path.ChangeExtension(rel, null) ?? rel;
                return noExt
                    .Replace(Path.DirectorySeparatorChar, '.')
                    .Replace(Path.AltDirectorySeparatorChar, '.');
            }

            void DumpDb(string dbPath, string rel, string? pwd)
            {
                var cs =
                    $"Filename={dbPath};ReadOnly=true"
                    + (string.IsNullOrEmpty(pwd) ? "" : $";Password={pwd}");
                using var db = new LiteDatabase(cs);

                foreach (var name in db.GetCollectionNames())
                {
                    var col = db.GetCollection(name);
                    var outFile = Path.Combine(outDir, $"{SanitizeRel(rel)}.{name}.json");

                    // Write and log exactly where we write
                    Directory.CreateDirectory(Path.GetDirectoryName(outFile)!);
                    using (var stream = System.IO.File.Create(outFile))
                    using (
                        var writer = new Utf8JsonWriter(
                            stream,
                            new JsonWriterOptions
                            {
                                Indented = true,
                                Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
                            }
                        )
                    )
                    {
                        writer.WriteStartArray();
                        foreach (var doc in col.FindAll())
                        {
                            using var jd = JsonDocument.Parse(doc.ToString());
                            jd.RootElement.WriteTo(writer);
                        }
                        writer.WriteEndArray();
                        writer.Flush();
                        stream.Flush(); // be explicit before logging
                    }
                    Console.WriteLine($"WRITE: {outFile}");
                }
            }

            foreach (var dbPath in dbFiles)
            {
                var rel = Path.GetRelativePath(rootDir, dbPath);
                try
                {
                    try
                    {
                        DumpDb(dbPath, rel, null);
                        dumped++;
                        Console.WriteLine($"OK (no password): {rel}");
                        continue;
                    }
                    catch (LiteException ex1)
                    {
                        var msg = ex1.Message?.ToLowerInvariant() ?? "";
                        var looksEncrypted = msg.Contains("password") || msg.Contains("encrypted");
                        if (!looksEncrypted || string.IsNullOrEmpty(password))
                        {
                            throw;
                        }
                    }

                    DumpDb(dbPath, rel, password);
                    dumped++;
                    Console.WriteLine($"OK (with password): {rel}");
                }
                catch (LiteException ex)
                {
                    skipped++;
                    Console.Error.WriteLine($"SKIP (LiteDB): {rel} :: {ex.Message}");
                }
                catch (Exception ex)
                {
                    skipped++;
                    Console.Error.WriteLine(
                        $"SKIP (other): {rel} :: {ex.GetType().Name}: {ex.Message}"
                    );
                }
            }

            Console.WriteLine($"Done. Dumped: {dumped}, Skipped: {skipped}");

            // Final verification of what actually exists on disk in outDir
            int actualJsonCount = 0;
            try
            {
                actualJsonCount = Directory
                    .EnumerateFiles(outDir, "*.json", SearchOption.AllDirectories)
                    .Count();
            }
            catch { }

            Console.WriteLine(
                $"OutDir verification: {actualJsonCount} *.json files under {outDir}"
            );
            if (dumped > 0 && actualJsonCount == 0)
            {
                Console.Error.WriteLine(
                    $"WARNING: dumper claims success but no JSON files exist under {outDir}. Check filesystem permissions, mounts, or path resolution."
                );
            }

            if (dumped == 0)
            {
                Console.Error.WriteLine(
                    "No valid LiteDB files were dumped. If your library is encrypted, set LITEDB_PASSWORD."
                );
                return 3;
            }

            return 0;
        }
    }
}
