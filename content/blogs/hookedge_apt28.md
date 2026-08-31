+++
title = "HOOKEDGE: APT28's Webhook-Based Batch Backdoor"
date = "2026-09-22"
+++

# HOOKEDGE: APT28's Webhook-Based Batch Backdoor

Recorded Future's Insikt Group documented a campaign targeting government and diplomatic organizations in Romania, Spain, and Türkiye between late September 2025 and early April 2026. The payload is a previously undocumented backdoor called HOOKEDGE, and the most interesting thing about it is how little it is: a lightweight Windows batch script that uses webhook[.]site for everything.

## The Delivery

The primary delivery vehicle is a macro-enabled Microsoft Word document with diplomatic-themed lures. Early versions impersonated Spanish government material before switching to a different social engineering approach a month later. When the target clicks "Enable Content," the macro writes six files to `%userprofile%` and launches the HOOKEDGE installer chain.

The installer creates a scheduled task that runs every 30 minutes, executing the HOOKEDGE launcher with the backdoor as its argument. Then the installer deletes itself, along with the installer launcher and the task definition file, to reduce the forensic footprint. The lure document also embeds a hidden image referencing a webhook[.]site URL, which alerts the operators as soon as the document is opened.

## The Backdoor

HOOKEDGE is a batch script that enters a polling loop. It fetches arbitrary `.cmd` payloads from a staging webhook, executes them, and sends the output back to the webhook URL using an HTML file. The command retrieval and exfiltration happen by launching Microsoft Edge in headless mode or in a hidden window and making HTTP requests to the webhook. After transmission, all temporary files are deleted, and any process whose window title matches the HOOKEDGE tag is terminated.

The design is minimal and effective. Webhook[.]site is a legitimate service, so the C2 traffic blends in with normal web traffic. No dedicated infrastructure to set up, no domains to register, no IPs to block. The batch script itself is trivial to modify, which is why the implant underwent continuous refinement between September 2025 and April 2026, likely to evade automated sandbox environments and adapt to reduced free-tier API limits on webhook[.]site.

## The Attribution

Recorded Future attributes the activity with moderate confidence to APT28, also known as Fancy Bear and Forest Blizzard, tracked by Recorded Future as BlueDelta. The determination is based on significant code and tradecraft overlap with HEADLACE, a modular Windows backdoor APT28 has used against diplomats since April 2023. The similarities include core architecture and the abuse of webhook[.]site for C2, payload staging, and data exfiltration. Insikt describes HOOKEDGE as a direct evolutionary successor to HEADLACE.

## The Blue Team Read

The HOOKEDGE pattern is a reminder that advanced actors do not always need advanced malware. A batch script is the opposite of sophisticated, and that is the point. It is easy to modify, easy to deploy, and hard to detect when the C2 is a legitimate webhook service.

The detection signals are behavioral:

- Microsoft Edge launching in headless mode from a scheduled task context
- Scheduled tasks running every 30 minutes that execute batch scripts
- Webhook[.]site traffic from endpoints that have no business using it
- Word documents with hidden images referencing external URLs
- The self-deletion pattern: installers that remove themselves after creating persistence

The deeper lesson is about infrastructure abuse. Webhook services, CDNs, and other legitimate platforms are the new C2 hosting. Blocking known-bad IPs does nothing when the bad IP is a webhook[.]site endpoint. The detection has to focus on what the endpoint is doing, not where it is connecting.

For anyone defending diplomatic or government-adjacent networks, the campaign window is also a reminder that these actors iterate. HEADLACE became HOOKEDGE. The next version is probably already in development, and it will probably still be a batch script, because the batch script works.