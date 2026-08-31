+++
title = "The Unisoc VoLTE Exploit Chain: From a Video Call to Kernel Memory"
date = "2026-09-17"
+++

# The Unisoc VoLTE Exploit Chain: From a Video Call to Kernel Memory

SSD Secure Disclosure published a two-stage exploit chain in August 2026 that achieves full Android kernel access on devices running Unisoc modem firmware. The entry point is a VoLTE video call. The chipset maker has not responded to disclosure attempts, and no fix exists.

## The Chain

Stage one was disclosed in March 2026: remote code execution in Unisoc modem firmware through a malformed SIP video call. Stage two, published in August, is the privilege escalation that turns that modem foothold into kernel access.

The full chain requires three things: an attacker who controls a private 4G cellular network, a victim who answers an incoming video call, and a modem-level foothold from the March RCE. The researchers built their proof-of-concept environment with an open-source 4G core network, a software-defined radio for the radio interface, and specialized SIM cards.

The privilege escalation is classified as CWE-1189, Improper Isolation of Shared Resources on System-on-a-Chip. The flaw lives in modem firmware shared by at least three Unisoc chipsets: the T606 in the Motorola E13, the T612 in the Realme C33, and the T7250 in the Xiaomi Redmi A5. Researchers confirmed the escalation on a Motorola E13 with a February 2025 security patch and a Xiaomi Redmi A5 with a January 2026 patch.

## The Technical Core

Once code is running on the modem, the escalation works by writing a full-access configuration to the modem's ARM Memory Protection Unit through coprocessor registers. That maps the entire 32-bit physical address space as readable, writable, and executable from modem context, including the pages where the Android kernel resides.

The condition that makes this possible is architectural: the modem processor and the application processor share physical memory within the Unisoc SoC, and there is no hardware-enforced boundary preventing modem-context code from modifying kernel memory. The MPU is the only thing standing between modem code and the kernel, and the exploit simply reconfigures it.

Researchers confirmed kernel-level code execution on a test device by observing kernel log output showing the injected payload had run.

## Why This One Is Different

Mobile exploit chains usually get patched fast because the vendor has a security team and a bulletin process. This one has neither. The August 2026 Android Security Bulletin, published before the disclosure, does not address the vulnerability. No Unisoc security bulletin covers it. The researchers tried email and LinkedIn and got no response.

The affected devices are budget phones sold across more than 140 countries. The Motorola E13, Realme C33, and Xiaomi Redmi A5 are exactly the kind of devices that do not get long security support windows. Even if a fix existed tomorrow, the installed base would take years to update, and most of it would never update at all.

There is also a separate Unisoc advisory from October 2025, CVE-2025-31718 with a CVSS score of 7.5, describing a modem input-validation flaw on the same chipset family. The pattern is consistent: the modem attack surface on these SoCs is not getting the attention it needs.

## The Red Team Read

From an attacker's perspective, this chain is a reminder that the modem is a legitimate entry point, not a theoretical one. VoLTE video calls are a feature users answer without thinking. The requirement to control a private 4G network raises the bar, but private LTE/5G deployments are becoming common in enterprise and industrial settings, and the equipment to build one is open source and cheap.

The chain also demonstrates the value of persistence in disclosure. The March RCE and the August escalation were published separately, and the second stage explicitly builds on the first. For defenders, the lesson is that a disclosed modem RCE is not the end of the story. The follow-up escalation research is already in progress somewhere.

## The Blue Team Read

There is no patch to deploy and no detection rule that stops a malformed SIP video call at the radio layer. What defenders can do:

- Track which devices in your environment use Unisoc chipsets and treat them as higher risk
- Watch for unexpected VoLTE video call activity on corporate devices, especially from unknown numbers
- Consider whether private 4G infrastructure in your environment is segmented from the rest of the network
- Plan for the reality that some devices cannot be fixed, which makes them candidates for replacement or isolation

The uncomfortable summary: a video call can now be a kernel compromise on a class of devices that will never receive a fix. That is not a vulnerability report, that is a hardware decision made years ago, and it is still shipping.