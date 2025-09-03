using System.Text.Encodings.Web;
using System.Text.Json;
using LiteDB;

if (args.Length < 2)
{
    Console.Error.WriteLine("Usage: PlayniteDump <root-folder> <output-folder>");
    Environment.Exit(1);
}

var rootDir = args[0];
var outDir = args[1];

Directory.CreateDirectory(outDir);

var password = Environment.GetEnvironmentVariable("LITEDB_PASSWORD");

List<string> dbFiles;
try
{
    dbFiles = Directory.EnumerateFiles(rootDir, "*.db", SearchOption.AllDirectories)
                       .OrderBy(f => f, StringComparer.OrdinalIgnoreCase)
                       .ToList();
}
catch (Exception e)
{
    Console.Error.WriteLine($"Failed to enumerate DB files under {rootDir}: {e.Message}");
    Environment.Exit(2);
    return;
}

if (!dbFiles.Any())
{
    Console.Error.WriteLine($"No *.db files found under {rootDir}");
    Environment.Exit(2);
}

Console.WriteLine($"Found {dbFiles.Count} .db files:");
foreach (var f in dbFiles)
{
    Console.WriteLine($"  - {Path.GetRelativePath(rootDir, f)}");
}

int dumped = 0, skipped = 0;

string SanitizeRel(string rel)
{
    var noExt = Path.ChangeExtension(rel, null) ?? rel;
    return noExt.Replace(Path.DirectorySeparatorChar, '.')
                .Replace(Path.AltDirectorySeparatorChar, '.');
}

void DumpDb(string dbPath, string rel, string? pwd)
{
    var cs = $"Filename={dbPath};ReadOnly=true" + (string.IsNullOrEmpty(pwd) ? "" : $";Password={pwd}");
    using var db = new LiteDatabase(cs);

    foreach (var name in db.GetCollectionNames())
    {
        var col = db.GetCollection(name);
        var outFile = Path.Combine(outDir, $"{SanitizeRel(rel)}.{name}.json");
        var outParent = Path.GetDirectoryName(outFile);
        if (!string.IsNullOrEmpty(outParent))
        {
            Directory.CreateDirectory(outParent);
        }

        using var stream = File.Create(outFile);
        using var writer = new Utf8JsonWriter(stream, new JsonWriterOptions
        {
            Indented = true,
            Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        });

        writer.WriteStartArray();
        foreach (var doc in col.FindAll())
        {
            using var jd = JsonDocument.Parse(doc.ToString());
            jd.RootElement.WriteTo(writer);
        }
        writer.WriteEndArray();
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
        Console.Error.WriteLine($"SKIP (other): {rel} :: {ex.GetType().Name}: {ex.Message}");
    }
}

Console.WriteLine($"Done. Dumped: {dumped}, Skipped: {skipped}");
if (dumped == 0)
{
    Console.Error.WriteLine("No valid LiteDB files were dumped. If your library is encrypted, set LITEDB_PASSWORD.");
    Environment.Exit(3);
}
