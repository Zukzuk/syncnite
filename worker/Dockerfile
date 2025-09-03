# ---- Build (framework-dependent DLL) ----
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY worker/PlayniteDump/ PlayniteDump/
RUN dotnet publish PlayniteDump/PlayniteDump.csproj -c Release -o /out --no-self-contained

# ---- Final: .NET runtime + Node + 7z ----
FROM mcr.microsoft.com/dotnet/runtime:8.0
RUN apt-get update && apt-get install -y --no-install-recommends nodejs p7zip-full \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /out/ /app/dumper/
COPY worker/tools/extract-and-dump.mjs /app/extract-and-dump.mjs
ENTRYPOINT ["node", "/app/extract-and-dump.mjs"]
