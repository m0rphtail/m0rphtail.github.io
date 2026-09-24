+++
title = "PaperCut's Pre-Auth RCE: What the IOCs and the Payload Tell Us"
date = "2026-08-28"
+++

On August 27, PaperCut issued an advisory warning of in-the-wild exploitation against PaperCut NG and MF servers. Security researchers at Huntress reproduced the full attack chain against a stock PaperCut NG 25.0.11.75758 instance and published an analysis of the exploit payload. The chain links two vulnerabilities: CVE-2026-81578 (an authorization bypass in the web management interface) and CVE-2026-82078 (unsafe dynamic class loading in database connection routines). Chained together, they yield unauthenticated remote code execution.

## Vulnerability mechanics

The authorization flaw stems from page dispatch handling. An incoming HTTP request can specify one target page to be rendered for the response while targeting an action owned by a different underlying component. PaperCut's authorization logic verified permissions against the rendered page rather than the executed component. An unauthenticated remote caller could modify system settings, access restricted endpoints, and reach internal database utilities.

## Observed payload behavior

Huntress identified active exploitation in customer environments, including one session lasting less than two minutes. The attacker injected a compiled Java `.class` file as hex data within the server log, writing it to `lib/Udydn.class` relative to the application directory, alongside a duplicate copy at `lib/Moo97.class`.

Decompiling the dropped file with Fernflower showed cross-platform system enumeration logic for both Linux and Windows. It captured directory listings and basic host information, wrote output to `Udydn.out` under `/data/content/`, and deleted the staging files upon completion. Recorded log entries included base64-encoded strings decoding to `whoami & ver`.

```text
server.log artifacts:
  d2hvYW1pICYgdmVy  ->  whoami & ver
  hex-encoded .class -> lib/Udydn.class, lib/Moo97.class
  output: Udydn.out, Udydn.cmd (deleted after execution)
```

## Detection indicators

The original vendor advisory and forensic findings highlight several log strings and file paths:

```text
ERROR No suitable driver found for jdbc:no:x
ERROR DatabaseUtils - Database error looking up cardID: VALUES CAST
base64: d2hvYW1pICYgdmVy
files: lib/Udydn.class, lib/Moo97.class, Udydn.out, Udydn.cmd
```

```bash
# search PaperCut server logs for attack artifacts
grep -r "jdbc:no:x" /path/to/server/logs/
grep -r "d2hvYW1pICYgdmVy" /path/to/server/logs/
find / -name "Udydn.class" -o -name "Moo97.class" 2>/dev/null
```

A missing or unexpectedly cleared `server.log` should also be investigated as potential evidence of post-exploitation log wiping.

## Mitigation and response

1. Apply vendor updates immediately for v24, v25, and v26 installations, including subsequent maintenance releases.
2. Restrict external network access to the PaperCut web management interface, keeping management consoles off the public internet.
3. Hunt for the recorded log strings, dropped class files, and transient `.cmd` or `.out` artifacts.
4. Review process creation logs for unexpected child processes spawned by the PaperCut Java service.
