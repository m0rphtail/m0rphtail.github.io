+++
title = "Tengu Botnet: The Malware Reboots Your Box When You Kill It"
date = "2026-07-28"
+++

# Tengu Botnet: The Malware Reboots Your Box When You Kill It

I read Nozomi's analysis of Tengu on a Tuesday and spent the rest of the week re-checking my assumptions about IoT malware. The headline is simple: kill the bot's main process and the device reboots itself, giving every persistence mechanism a second chance. The hardware watchdog, a safety feature meant to recover hung devices, becomes the malware's survival engine.

## How I got there

I started with the standard Mirai mental model. Telnet brute force, DDoS pool, kill the process, done. Nozomi's report breaks that at the first paragraph: Tengu's persistence and self-defense code is what makes it stand out among the Mirai-derived samples they track. Most Mirai variants implement few, if any, of these capabilities.

The watchdog trick works like this. A background worker masquerades as `[kworker/0:0]`, a kernel thread name every Linux defender has learned to skip past. It reopens the watchdog device, arms it with roughly a 30-second timeout, and sends keepalives only while the main bot process is alive. Kill the bot, the feeds stop, the watchdog fires, the box reboots, and the init scripts, fake systemd unit, shell startup modifications, and cron entry all get a fresh shot at relaunching the binary.

I wrote the logic out as pseudocode because it deserves a slow read:

```python
# watchdog keepalive loop (reconstructed from Nozomi's analysis)
while True:
    if main_process_alive():
        fd = open("/dev/watchdog", "w")   # reopens if closed
        fd.write("1")                      # feed / keepalive
    else:
        pass                               # stop feeding → 30s → hard reboot
    sleep(keepalive_interval)
```

## The rest of the self-defense stack

The watchdog is the headline but the sample reads like a checklist:

- A detached guardian process checks the main bot every 60 seconds and relaunches it
- Installed binary marked immutable, so `rm` and overwrite both fail
- A cron persistence routine is present but Nozomi flagged its `/proc/self/exe` reference as unfinished or broken. Even the malware ships bugs.
- The hardcoded list of reboot and shutdown utilities gets their ELF headers overwritten with the string `ELFOOD`. Defenders who try to power the box down cleanly find `shutdown` and `reboot` are no longer valid ELF files.

That last one is genuinely funny. The attacker corrupting your shutdown command so you cannot turn the device off gracefully, on a device class where the user manual solution to any problem is pull the power.

## C2: plaintext out, ChaCha20 in

The analyzed sample talked to `64.89.163.8` on TCP 9931. Registration, heartbeats, and command output go out in plaintext, which tells me the operators don't mind defenders reading the bot's telemetry. Server commands and updates, the traffic that matters for control, use a custom ChaCha20/Poly1305-like authenticated scheme. Payloads arrive through an IPFS gateway on the same server, validated as ELF or APK before execution, with the APK path aimed at Android TV boxes per Nozomi's assessment.

URLhaus recorded 17 malware URLs at that IP starting June 17, 2026, including a shell script, Mirai-tagged ELFs, and an APK. All 17 were offline as of July 28, though URLhaus's sample hashes don't match Nozomi's, so that's confirmation of Mirai-family hosting at the address, not proof of Tengu's C2 uptime. Worth keeping the two separate.

## What this changes for me

The response playbook for every Mirai variant since 2016 is kill and investigate. Tengu makes that actively harmful. The containment order matters: block the C2 egress first, then remove persistence (systemd units, init scripts, shell startup files, cron), then kill the process, then deal with the immutable flag and the broken reboot utilities before you try to power the device down.

The watchdog abuse also changes what I monitor. A device that reboots unexpectedly after a process kill is a detection signal, not a hardware fault. Watchdog device opens from non-kernel processes, `[kworker/0:0]` masquerades, and immutable flags on unexpected binaries are all huntable.

And the boring part still applies: Telnet exposed to the internet and default credentials are how this family gets in. Nozomi's honeypots caught the dropper exactly the way Mirai has always moved. If Telnet is still reachable on your estate, none of the clever analysis above will matter, because the question is when, not whether.

The report names no vendor, operator, or victim count, so treat it as a capability document. But the capability is the interesting part. The malware that gets in through a default password now defends itself better than the hardware it runs on.


---

*I'm Kshitij, a detection engineer looking for SOC/IR/CTI roles. If this was useful, [connect on LinkedIn](https://linkedin.com/in/kshitijchitnis) or [browse my GitHub](https://github.com/m0rphtail/).*
