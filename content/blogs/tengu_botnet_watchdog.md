+++
title = "Tengu Botnet: The Malware Reboots Your Box When You Kill It"
date = "2026-07-28"
+++

# Tengu Botnet: The Malware Reboots Your Box When You Kill It

Nozomi Networks Labs dropped their analysis of a new Mirai-derived botnet called Tengu on July 27, and it broke one of my assumptions about IoT malware: that killing the bot is progress. In Tengu's case, killing the main process is the trigger for a full device reboot, which gives every one of its persistence mechanisms another chance to run on a fresh boot.

## The watchdog trick

A hardware watchdog is a timer that resets the system if software stops feeding it. It exists so a hung device recovers without a human. Vendors ship it for reliability, and almost nobody audits who opens the device node.

Tengu does. A background worker masquerades as `[kworker/0:0]`, a kernel thread name every Linux defender has learned to skip past, reopens the watchdog device, arms it with roughly a 30-second timeout, and sends keepalives only while the main bot process is alive. I wrote the logic out as pseudocode because it deserves a slow read:

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

Kill the bot, the feeds stop, the watchdog fires, the box reboots, and the init scripts, fake systemd unit, shell startup modifications, and cron entry all get a fresh shot at relaunching the binary. The response playbook for every Mirai variant since 2016, kill and investigate, actively triggers the recovery path.

## The rest of the self-defense stack

The watchdog is the headline but the sample reads like a checklist:

- A detached guardian process checks the main bot every 60 seconds and relaunches it
- Installed binary marked immutable, so `rm` and overwrite both fail
- A cron persistence routine is present but Nozomi flagged its `/proc/self/exe` reference as unfinished or broken. Even the malware ships bugs.
- The hardcoded list of reboot and shutdown utilities gets their ELF headers overwritten with the string `ELFOOD`. Defenders who try to power the box down cleanly find `shutdown` and `reboot` are no longer valid ELF files.

I find that last one genuinely funny. The attacker corrupting your shutdown command so you cannot turn the device off gracefully, on a device class where the user manual solution to any problem is pull the power.

## C2: plaintext out, ChaCha20 in

The analyzed sample talked to `64.89.163.8` on TCP 9931. Registration, heartbeats, and command output go out in plaintext, which tells me the operators don't mind defenders reading the bot's telemetry. Server commands and updates, the traffic that matters for control, use a custom ChaCha20/Poly1305-like authenticated scheme. Payloads arrive through an IPFS gateway on the same server, validated as ELF or APK before execution, with the APK path aimed at Android TV boxes per Nozomi's assessment.

URLhaus recorded 17 malware URLs at that IP starting June 17, 2026, including a shell script, Mirai-tagged ELFs, and an APK. All 17 were offline as of July 28, though URLhaus's sample hashes don't match Nozomi's, so that's confirmation of Mirai-family hosting at the address, not proof of Tengu's C2 uptime. Worth keeping the two separate.

## What I'd actually hunt

The interesting detection surface here isn't a signature, it's behavior:

- `open("/dev/watchdog")` or equivalent watchdog ioctls from a process that isn't PID 1 or a hardware daemon
- Unexpected reboots following a process kill on an IoT host, which most people write off as hardware flakiness
- `[kworker/0:0]` appearing in a process name where the real kernel thread's parentage check fails
- Immutable-flagged binaries outside package manager paths (`lsattr` is your friend)
- Broken reboot utilities, the `ELFOOD` artifact is trivially greppable in a memory dump or on disk

And the boring entry point is unchanged: Telnet credential brute force. Nozomi's honeypots caught the dropper exactly the way Mirai has always moved. If Telnet is still reachable on your estate, none of the clever analysis above will matter, because the question is when, not whether.

The report names no vendor, operator, or victim count, so treat it as a capability document. But the capability is the interesting part. The malware that gets in through a default password now defends itself better than the hardware it runs on.