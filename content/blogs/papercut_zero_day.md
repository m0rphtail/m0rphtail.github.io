+++
title = "PaperCut's Pre-Auth RCE: What the IOCs and the Payload Tell Us"
date = "2026-08-28"
+++

# PaperCut's Pre-Auth RCE: What the IOCs and the Payload Tell Us

PaperCut warned on August 27 that a pre-auth RCE was being exploited against NG and MF, with confirmed customer incidents. Huntress then did what every vendor should do: they reproduced the full chain against a stock PaperCut NG 25.0.11.75758 server, and they published the payload analysis. Two CVEs came out of it. CVE-2026-81578 is an improper access control flaw in the web management interface that lets an unauthenticated attacker modify system configuration. CVE-2026-82078 is an unsafe dynamic class-loading flaw in the database connection utilities that executes arbitrary Java bytecode. Chained, they are pre-auth RCE.

## The bug shape

The authorization flaw is subtle. A crafted request can refer to one page that is rendered for the response, and another page that owns the component or action being executed. PaperCut's authorization check trusts the rendered page and misses the permissions required by the component behind it. An unauthenticated request can change server configuration, reach sensitive endpoints, and execute arbitrary attacker-controlled code.

## What the attackers actually did

Huntress saw exploitation in two customer environments. The activity was limited, one incident lasted under two minutes. The payload was a Java .class file delivered as hex in the server log, dropped to `lib/Udydn.class` relative to the installation directory, with a second copy at `lib/Moo97.class`.

The .class file is OS-agnostic. Decompiled with Fernflower, it runs commands on Linux or Windows to profile the system and list the directory, writes output to `Udydn.out` in a `/data/content/` path, then deletes the output and itself. The observed commands were base64-encoded in the log, decoding to `whoami & ver`, the Windows recon one-liner.

```text
server.log artifacts:
  d2hvYW1pICYgdmVy  →  whoami & ver
  hex-encoded .class → lib/Udydn.class, lib/Moo97.class
  output: Udydn.out, Udydn.cmd (deleted after execution)
```

The self-deletion is the tell. This payload was built to leave nothing behind except the log it came in through, and the log is the artifact Huntress used to find it.

## Detection

The log strings from the original advisory still hold, plus the new ones:

```text
ERROR No suitable driver found for jdbc:no:x
ERROR DatabaseUtils - Database error looking up cardID: VALUES CAST
base64: d2hvYW1pICYgdmVy
files: lib/Udydn.class, lib/Moo97.class, Udydn.out, Udydn.cmd
```

```bash
# hunt across PaperCut hosts
grep -r "jdbc:no:x" /path/to/server/logs/
grep -r "d2hvYW1pICYgdmVy" /path/to/server/logs/
find / -name "Udydn.class" -o -name "Moo97.class" 2>/dev/null
# missing or truncated server.log is itself a finding
```

## What I'd do

```text
1. Patch now. Emergency patches for v24, v25, v26.
   Release 2 came out the next day, install that too.
2. Remove the application server from the public internet
   TODAY. PaperCut's own words: take this action now even
   if you have not observed suspicious activity.
3. Hunt the log strings and file names above.
4. Treat absent/truncated server.log as a finding.
5. Check for the .class files and any recent Java
   execution from the PaperCut service account.
```

The 2023 version of this story, CVE-2023-27350, went from disclosure to Cl0p and LockBit in single-digit days. The current window between IOC publication and ransomware deployment is where the outcome gets decided. The indicators are the part that cannot wait.

---

*I'm Kshitij, a detection engineer looking for SOC/IR/CTI roles. If this was useful, [connect on LinkedIn](https://linkedin.com/in/kshitijchitnis) or [browse my GitHub](https://github.com/m0rphtail/).*