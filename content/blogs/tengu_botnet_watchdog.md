+++
title = "Tengu Botnet: The Malware Reboots Your Box When You Kill It"
date = "2026-07-28"
+++

Nozomi Networks published an analysis of Tengu, an IoT botnet with an aggressive self-defense mechanism: terminating the main malware process triggers an immediate device reboot, allowing its persistence scripts to restart the payload automatically.

## Hardware watchdog manipulation

Embedded Linux devices frequently include hardware watchdogs (`/dev/watchdog`) to recover from kernel panics or application deadlocks. Software daemons must periodically write to the device node to "feed" the timer; if writes stop, the hardware resets the board.

Tengu abuses this watchdog. A background thread disguised as `[kworker/0:0]` opens `/dev/watchdog` with a 30-second timeout and feeds it only while the primary bot process remains active:

```python
# watchdog keepalive logic from the analysis
while True:
    if main_process_alive():
        fd = open("/dev/watchdog", "w")   # reopen if closed
        fd.write("1")                      # send heartbeat
    else:
        pass                               # stop feeding; trigger hardware reset
    sleep(keepalive_interval)
```

Terminating the bot halts the keepalives. When the watchdog timer expires, the hardware reboots, running init scripts, systemd units, and cron jobs that restart the malware.

## Additional self-defense mechanisms

Alongside the watchdog loop, Tengu deploys several defensive controls:

- A dedicated supervisor process checks the main daemon every 60 seconds and restarts it if stopped.
- The binary is flagged with the immutable file attribute (`chattr +i`), blocking `rm` and overwrites.
- The ELF headers of system shutdown tools (`/sbin/reboot`, `/sbin/shutdown`, `/sbin/poweroff`) are overwritten with the string `ELFOOD`, preventing operators from halting the system cleanly through the command line.

## Command and control communications

The analyzed sample connected to `64.89.163.8` over TCP port 9931. While initial registration and telemetry were sent in plaintext, tasking and updates used a custom authenticated cipher resembling ChaCha20/Poly1305. Payloads were delivered through an IPFS gateway hosted on the C2 server, targeting both Linux architectures and Android TV devices (via APK packages).

## Incident response and remediation

Standard IoT incident playbooks that terminate active processes before investigating will cause Tengu hosts to reboot immediately. An effective response sequence requires:

1. Isolating the device at the network switch or firewall to cut C2 egress without dropping power.
2. Inspecting and removing persistence entries across init scripts, systemd unit directories, shell startup files, and cron tables.
3. Removing the immutable attribute via `chattr -i` on the malware binary.
4. Terminating the guardian process and the watchdog worker.

On the network edge, initial access continues to rely on exposed Telnet ports and default administrative credentials. Enforcing strong credentials and blocking management ports from the public internet remains the primary preventative measure.