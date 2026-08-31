+++
title = "PaperCut Zero-Day: Reading the IOCs While We Wait for the Details"
date = "2026-08-28"
+++

# PaperCut Zero-Day: Reading the IOCs While We Wait for the Details

PaperCut warned customers on August 28 that a vulnerability in all versions of PaperCut NG and MF is being actively exploited. Emergency patches shipped for v25 and v26, customer incidents are confirmed, and the technical details of the flaw itself are still under wraps. That's a strange situation to write in, but it's also a useful exercise, because the IOCs they did publish say a lot about what the attacker is doing and what they know about PaperCut's logging.

## What actually leaked

Three indicators, and each one is a sentence about the attacker:

**Suspicious post-exploitation from `pc-app.exe`.** The PaperCut Application Server process is abused server-side, as you'd expect for a print management product. The word "post-exploitation" in the advisory matters more than the process name. They're not just triggering the bug and leaving, they're doing hands-on work inside it.

**Missing, truncated, or deleted `server.log` files.** This is my favorite kind of IOC because it's attacker psychology in artifact form. They read the logs first, learned what the logs record, and removed them. That means the entry vector may be unrecoverable from the application layer, and the investigation has to live in EDR telemetry, process creation, and network flow instead.

**Two specific error strings:**

```text
ERROR No suitable driver found for jdbc:no:x
ERROR DatabaseUtils - Database error looking up cardID: VALUES CAST
```

I've read that `jdbc:no:x` line a dozen times. JDBC URLs look like `jdbc:<subprotocol>:...`, and `no` is not a driver any Java runtime ships with. The most plausible read: something fed an attacker-controlled or malformed JDBC URL into PaperCut's database layer, and the driver loader choked on it. The `cardID` line suggests the database query path, the one that resolves print-card balances, got input it wasn't built for. Whatever the flaw turns out to be, it touches the JDBC configuration or query path. If you run PaperCut and you find those strings, that's not noise. Nothing in normal operation generates a `jdbc:no:` URL.

## The 2023 echo

PaperCut has been here before. CVE-2023-27350, CVSS 9.8, unauthenticated RCE on NG and MF, was exploited in the wild within days of disclosure by Russian state actors and by Lace Tempest, who used it to drop Cl0p and LockBit. Print management servers are a target class for reasons that haven't changed: internet-exposed for remote printing by default in too many orgs, running as a service account with domain-level access, and treated as infrastructure nobody thinks about. The 2023 campaign turned print servers into ransomware distribution nodes. If this year's flaw follows the same curve, the current window between IOC publication and ransomware deployment is where everyone's luck gets decided.

## What I'd do, in order

```text
1. Patch now. The v25/v26 emergency patch is the only fix.
   Nothing else makes an unpatched server safe.
2. Cut exposure THIS HOUR, not after patching:
   firewall/network ACL the web interfaces to trusted IPs.
   PaperCut's own words: "Take this action now, even if you
   have not observed suspicious activity." Listen to them.
3. Hunt the two log strings across every PaperCut host.
   Both are exact-match greppable. Zero false-positive risk.
4. Treat absent/truncated server.log as a finding.
   Log deletion IS the indicator. Forensic problem, yes,
   but also the loudest possible alarm.
5. Sweep pc-app.exe child processes, network connections,
   and file writes in EDR for the post-exploitation window.
```

One more thing worth saying. Everyone compares zero-day announcements against the patch they wish existed. What PaperCut did here, shipping indicators before the writeup, is the correct order for active exploitation. Details feed the patch cycle; indicators feed tonight's hunt. Given that 2023's version went from disclosure to Cl0p in single-digit days, the indicators are the part that can't wait.