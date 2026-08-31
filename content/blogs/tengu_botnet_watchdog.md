+++
title = "Tengu Botnet: When the Malware Reboots the Box to Survive"
date = "2026-09-14"
+++

# Tengu Botnet: When the Malware Reboots the Box to Survive

Most Mirai variants are dumb. They brute force Telnet, join a DDoS pool, and die the moment someone kills the process. Nozomi Networks Labs published an analysis of a Mirai-derived botnet called Tengu in July 2026 that breaks that pattern in a way I have not seen before: it uses the device's own hardware watchdog to reboot the box when defenders kill its main process.

## The Watchdog Trick

The hardware watchdog is a timer that resets the system if software stops feeding it. It exists so a hung device recovers without a human. Tengu turns that safety mechanism into a persistence engine.

A background worker masquerades as `[kworker/0:0]`, the kernel thread name defenders learn to ignore. It reopens the watchdog device, arms it with roughly a 30-second timeout, and sends keepalive signals only while the main malware process is alive. Kill the bot and the keepalives stop. Thirty seconds later the watchdog fires and the device reboots. On boot, Tengu's other persistence mechanisms get another chance to relaunch the binary.

That is a genuinely nasty design. The standard response to a botnet process, kill it and investigate, actively triggers the recovery path. You are not just fighting a process, you are fighting the hardware.

## Everything Else It Does

The watchdog is the headline, but the rest of the sample is worth reading like a checklist of modern IoT malware:

- A detached guardian process checks the main bot every 60 seconds and relaunches it if it stops
- Fake systemd services, init and RC scripts, and shell startup file modifications for persistence
- The installed binary is marked immutable, so `rm` and overwrite attempts fail
- A cron persistence routine exists but its `/proc/self/exe` reference looks unfinished, which Nozomi flagged as broken
- A hardcoded list of reboot and shutdown utilities gets its ELF headers overwritten with the string `ELFOOD`, so defenders trying to safely power down the device find the commands broken

The C2 side is equally deliberate. The analyzed sample talked to `64[.]89.163.8` on TCP 9931. Registration, heartbeat, and command output go out in plaintext, but server commands and updates use a custom ChaCha20/Poly1305-like authenticated encryption scheme. Payloads come from an IPFS gateway on the same server, validated as ELF or APK before execution. The APK path is likely aimed at Android TV boxes, per Nozomi's assessment.

Tengu supports 25 DDoS methods, can run a SOCKS5 proxy, execute shell commands, and collect system and network data. Samples exist for i386, amd64, MIPS, ARM, PowerPC, and m68k. The dropper reached Nozomi's honeypots through Telnet credential brute force, the same old Mirai entry point.

## What This Means for Defenders

The report names no vendor, no operator, and no infection count. It is a capability document, not a victim list. But the capabilities point at the response playbook changes:

Kill-and-watch is not enough. If you find a Tengu-like process, killing it triggers a reboot that relaunches it. The containment order matters: block the C2 egress first, then remove persistence (systemd units, init scripts, shell startup files, cron), then kill the process, then deal with the immutable flag and the broken reboot utilities before you try to power the device down.

The watchdog abuse also changes what you monitor. A device that reboots unexpectedly after a process kill is a detection signal, not a hardware fault. Watchdog device opens from non-kernel processes, `[kworker/0:0]` masquerades, and immutable flags on unexpected binaries are all huntable.

And the boring part still applies: Telnet exposed to the internet and default credentials are how this family gets in. Nozomi's advice is the right baseline, remove internet exposure for Telnet and other admin services, replace default credentials, segment IoT networks, and audit systemd, init, shell startup, and cron paths before returning a suspected device to service.

The takeaway is uncomfortable: the malware that breaks into your network through a default password now has better self-defense than most of the devices it runs on.