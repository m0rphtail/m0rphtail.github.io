+++
title = "HOOKEDGE: APT28's Backdoor Is a Batch Script and a Free Webhook"
date = "2026-08-28"
+++

# HOOKEDGE: APT28's Backdoor Is a Batch Script and a Free Webhook

Recorded Future's Insikt Group published analysis on August 28 of a campaign hitting government and diplomatic targets in Romania, Spain, and Türkiye from late September 2025 through early April 2026. The backdoor, HOOKEDGE, attributed with moderate confidence to APT28 (BlueDelta in Insikt's naming), is a Windows batch script. The C2 is webhook[.]site, the free service developers use to test webhooks. That combination, a state actor with a batch file and a free tier, is either the funniest or the most sobering thing I've read this month, and I haven't decided which.

## The delivery

Macro-enabled Word document with diplomatic lures, early ones impersonating Spanish government material, switching approach a month in. "Enable Content" and the macro writes six files to `%userprofile%`, runs an installer chain that creates a scheduled task firing every 30 minutes, then deletes the installer, the launcher, and the task definition XML. The lure document also embeds a hidden image referencing a webhook[.]site URL, so the operators get pinged the moment the document opens, before any payload runs. Knowing who opened the lure, and when, from the same free service that carries the C2, is tidy in a way I begrudgingly respect.

## The backdoor

The core loop, reconstructed from the report:

```batch
:: HOOKEDGE polling loop (conceptual)
:loop
  curl-like fetch → staging webhook  →  %TEMP%\task.cmd
  cmd /c %TEMP%\task.cmd
  task output → wrap in HTML → POST back to webhook URL
  del %TEMP%\* /q
  timeout /t 1800
  goto :loop
```

The fetch and exfil run through Microsoft Edge in headless mode or a hidden window, which means the network traffic is legitimate Edge traffic to a legitimate service from a host where Edge is installed. The task identifier shows up in window titles, and anything matching it gets terminated after transmission, cleaning up as it goes.

Second-stage variants hit high-value targets with beacons as fast as five minutes. And here's the operational constraint that shapes the whole design: webhook[.]site's free tier caps 100 requests per unique endpoint. A 30-minute beacon burns through an endpoint's quota in two to three days. The two-stage architecture exists because of a free-tier rate limit. Initial-access endpoints stay slow to stretch quota; high-priority victims graduate to dedicated endpoints for fast tasking. Recorded Future's phrase for it: separating initial-access infrastructure from active collection infrastructure. I'd phrase it as: even the APTs do capacity planning around someone else's free tier.

The attribution rests on code and tradecraft overlap with HEADLACE, APT28's modular backdoor used against diplomats since April 2023: same architecture, same webhook[.]site abuse. Insikt calls HOOKEDGE its direct evolutionary successor, refined from September 2025 to April 2026, likely to shake sandboxes and adapt to the shrinking free quotas.

## What I'd actually hunt

```text
- headless Edge (msedge --headless) spawned by cmd / schtasks ancestry
- scheduled tasks at :00/:30 boundaries executing .cmd/.batch
- webhook[.]site / requestbin-class egress from endpoints
  (allowlist the ones your devs actually use; everything else alerts)
- Word docs whose embedded media reference external URLs
- installers that delete themselves plus their own task XML
  (self-deletion is old tradecraft, still worth a rule)
```

The batch script IS the lesson. Every capability HOOKEDGE achieves, persistence, command execution, exfiltration, sits on tools signed by Microsoft and a service with a free tier. There is nothing here for an EDR to flag on statics. The window-title matching, the headless Edge, the 30-minute schtasks, the webhook domain, each is individually boring. The boring parts in combination are the intrusion.

I run into the instinct constantly, in myself too, that APT tradecraft means custom implants, zero-days, infrastructure with personality. Some of the time it means a batch file, a macro, and a developer tool used exactly as designed, by someone who read your incident response playbook and built the thing it would miss. The next time someone tells you defenders lose because attackers have better tools, point them at HOOKEDGE. The attackers won because they needed less.