+++
title = "PaperCut Zero-Day: What the IOCs Tell Us Before the Details Do"
date = "2026-09-16"
+++

# PaperCut Zero-Day: What the IOCs Tell Us Before the Details Do

PaperCut warned customers in late August 2026 that attackers are actively exploiting a vulnerability in all versions of PaperCut NG and PaperCut MF print management software. The company shipped an emergency patch for v25 and v26, confirmed customer incidents, and shared indicators of compromise. The technical details of the flaw are still under investigation. The IOCs are already worth a careful read, because they tell you what the attackers touched and what they left behind.

## The Indicators

Three signals stand out in PaperCut's advisory:

Suspicious post-exploitation activity from `pc-app.exe`. The PaperCut Application Server process is the one being abused, which is expected for a server-side flaw, but the phrasing matters. The attackers are not just triggering the bug, they are doing things after it, and those actions are what detection should watch.

Missing, truncated, or deleted `server.log` files. Attackers who delete logs are telling you they know what the logs record. That is a tradecraft signal, and it is also a forensic problem: the evidence of the initial access may be gone, so the investigation has to lean on what the logs did not get a chance to record.

Specific error entries in `server.log`:

```text
ERROR No suitable driver found for jdbc:no:x
ERROR DatabaseUtils - Database error looking up cardID: VALUES CAST
```

The `jdbc:no:x` string is the interesting one. A JDBC URL scheme of `no` is not a standard driver. It looks like an attempt to reach a non-standard or attacker-controlled JDBC endpoint, and the `cardID` lookup error suggests the database layer was being probed or abused. For anyone running PaperCut, those exact strings in the log are a tripwire.

## The Context That Matters

This is not the first time PaperCut has been a target. In 2023, CVE-2023-27350, a critical flaw in PaperCut MF and NG with a CVSS score of 9.8, was exploited by Russian threat actors and by a financially motivated group called Lace Tempest to deliver Cl0p and LockBit ransomware. Print management servers are a favorite target class: they sit on internal networks, they are often internet-exposed for remote printing, and they run with elevated service accounts.

The 2023 playbook is the baseline for what comes next. If the current zero-day follows the pattern, expect the post-exploitation to move toward credential access, lateral movement, and ransomware deployment. The emergency patch is the priority, but the detection work should start now, not after the first ransom note.

## What I Would Do

If you run PaperCut, the order of operations is:

1. Patch. The emergency patch for v25 and v26 is the only real fix. There is no workaround that makes an unpatched server safe.
2. Restrict access now. PaperCut's own advice is blunt: use firewall rules, network access controls, or equivalent measures so the server's web interfaces cannot be reached from untrusted internet addresses. Take this action even if you have not observed suspicious activity.
3. Hunt the IOCs. Search for the `jdbc:no:x` and `cardID` error strings in `server.log`, check for missing or truncated log files, and review `pc-app.exe` behavior for post-exploitation activity.
4. Assume the logs lie. If the log files are gone, the attackers cleaned up, and the investigation needs endpoint telemetry, process creation, network connections, and file system artifacts rather than the application logs.

The uncomfortable part of a zero-day with no public technical details is that the IOCs are all you have. The good part is that these particular IOCs are specific enough to hunt. The `jdbc:no:x` string is not something a normal print server generates. If you see it, you are not looking at a false positive.