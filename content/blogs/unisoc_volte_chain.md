+++
title = "The Unisoc VoLTE Chain: A Video Call That Ends in Kernel Memory"
date = "2026-08-17"
+++

# The Unisoc VoLTE Chain: A Video Call That Ends in Kernel Memory

SSD Secure Disclosure published the second half of a two-stage attack on Unisoc phones in August, and the punchline is that the vendor never answered a single email. The first stage, disclosed in March, is remote code execution in the modem firmware from a malformed SIP video call. The second stage walks from that modem foothold into the Android kernel. No CVE, no bulletin, no response, no patch. On phones sold across more than 140 countries.

## The chain, end to end

The full run needs three things: the attacker controls a private 4G network, the victim answers an incoming VoLTE video call, and stage one is already in place. The researchers built their test environment with an open-source 4G core, a software-defined radio for the air interface, and programmable SIMs. Researcher 0x50594d did the work; I'm reconstructing from the advisory.

Stage two is classified CWE-1189, improper isolation of shared resources on a SoC. The affected modem firmware ships in at least three chips: the T606 in the Motorola E13, the T612 in the Realme C33, the T7250 in the Xiaomi Redmi A5. Confirmed working on an E13 with a February 2025 patch and a Redmi A5 with a January 2026 patch.

## The escalation itself

Once code runs on the modem, the privesc is almost anticlimactic, and that's the point. The modem has an ARM Memory Protection Unit, and the exploit just rewrites its configuration through coprocessor registers:

```text
# conceptually, from modem context:
#   1. gain modem code exec (stage one, malformed SIP video call)
#   2. reprogram the modem's MPU via coprocessor registers:
#        full-access mapping of the entire 32-bit PA space
#        X=1, W=1, R=1 for every region
#   3. the Android kernel's pages are now RWX from the modem
#   4. write payload into kernel memory, execute
#      confirmed via kernel log output showing the payload ran
```

The condition that makes this legal, so to speak, is architectural: the modem and application processors share physical memory in the Unisoc SoC, with no hardware boundary between modem-context writes and kernel pages. The MPU is the only fence, and a fence you can reconfigure from the inside isn't a boundary, it's a suggestion.

Researchers verified kernel execution by watching the kernel log print output from injected code. When the kernel politely logs your payload's stdout, you're done.

## Why this one sits differently

Mobile exploit chains usually race a security team. This one has no race to lose. The August 2026 Android Security Bulletin came out before the disclosure and doesn't cover it. No Unisoc bulletin covers it. SSD's statement, in both March and August: "We have tried to reach out to the vendor through multiple channels (email and LinkedIn) but have not been able to receive any response."

The installed base is the part I keep thinking about. The E13, C33, and A5 are budget phones, the kind that get two years of patches if they're lucky, in markets where the answer to "is your phone updated" is "what's that." Even if Unisoc shipped a fix tomorrow, a meaningful share of these devices would never see it. A vulnerability on a device that cannot be patched is not a vulnerability report, it's a hardware decision that expired.

There's precedent, and it rhymes. Kaspersky ICS CERT documented the same shared-memory condition on the UIS7862A, a Unisoc chip in vehicle head units, in November 2025, and described one lateral movement path through a hidden DMA peripheral as not fixable by software at all. Unisoc's last modem bug that got the full treatment, CVE-2022-20210, went through Check Point and landed in the Android bulletin. Nobody has committed to that process this time.

## My read

For anyone doing threat modeling on a fleet that includes budget Unisoc hardware: the modem is now a documented path from "answered a phone call" to "arbitrary kernel code," gated behind an attacker-controlled 4G network. Private LTE in enterprise and industrial settings is increasingly common, and the equipment to stand one up is open source and cheap. The chain is not something a random actor runs this quarter. It is absolutely something a capable actor runs on target-rich networks.

Practical bits: inventory which devices in your fleet are Unisoc-based (model-to-SoC tables are findable), treat them as unpatchable for this class, get them off privileged segments, and watch for video calls from unknown numbers on corporate devices. And the disclosure lesson is one I keep relearning: publish what you have. SSD sat on a working chain for months waiting for a reply that never came. The users of those 140 countries' phones never got a say.