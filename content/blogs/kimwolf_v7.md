+++
title = "Kimwolf v7: DDoS Traffic That Looks Exactly Like Chrome"
date = "2026-08-11"
+++

# Kimwolf v7: DDoS Traffic That Looks Exactly Like Chrome

Unit 42's February 2026 analysis of Kimwolf v7 describes an HTTP/2 flood built with nghttp2 that constructs complete Google Chrome fingerprints, protocol behavior, headers, the works. When your DDoS traffic is indistinguishable from a million legitimate browsing sessions, the detection question stops being "does this look like an attack" and becomes "is this volume of normal-looking traffic normal *right now*." That's a much harder, much more expensive question.

## The botnet

Kimwolf targets Android TV boxes since August 2025; AISURU, its Linux sibling, works IoT devices. Active since mid-2024 at least. Initial access is the same story as every IoT botnet: residential proxy services to reach TVs with ADB enabled on port 5555 on their local network, then malware that does DDoS and relay work while masquerading as system processes like `netd_service`.

## What v7 changed

The feature list is a study in a botnet maturing from "loud scanner" to "quiet operator":

```text
- HTTP/2 floods via nghttp2, full Chrome fingerprint construction
- C2 via ENS: legitimate public Ethereum RPC services resolve
  the C2 address from Ethereum Name Service records
- backup C2: hard-coded Tor hidden service
  (edctgwib2n5l34t525zkxqzk5bqb6e5il2yiq5r6zu7gtlxa4uosn3qd.onion)
- ALL C2 traffic routed through local proxy 127.0.0.1:23075,
  clearnet and Tor alike
- high-performance UDP flood specialized for ARM (TV-box CPUs)
- DDoS command surface: 15 numbered methods, down from 43
  text-named ones (smaller = fewer quirks to fingerprint)
```

And the most telling change: scanning, exploitation, and brute force are gone from the binary entirely. Propagation moved to an external loader. The core payload now handles only DDoS and proxy relay. Splitting delivery from payload is web architecture, versioned services, single responsibility, and it means the botnet core updates without touching the infection machinery. Malware teams running product management cycles.

## The APK side-channel

Unit 42 also found eight APKs distributed October through December 2025, masquerading as a system service named SystemService, probing for root, and executing a bundled ELF payload. The archaeology is in the filenames: the earliest dropped sample targeted x86 with Dirty COW, the 2016 kernel race, suggesting the family evolved from classic Linux exploitation into the current ADB model. The dropped library went from `libn[redacted]kernel.so` to the quieter `libdevice.so` in November, then back in December, active operational-security tuning. They're watching what defenders watch.

## The C2 resilience stack

The tiering is worth respecting: ENS resolution through public Ethereum RPC means no DNS queries for C2 domains, so no domain takedown, no sinkhole. The .onion fallback survives clearnet pressure. The uniform local proxy means the process's network namespace always talks to 127.0.0.1:23075 regardless of destination, so per-destination egress rules see nothing but localhost. Each layer is individually known technique. Stacking them in an Android TV botnet is the new part.

## What I'd hunt

```bash
# on an Android TV box, all of these are wrong:
adb devices                          # anything listening on 5555
netstat -tlnp | grep 23075           # the local proxy port
ps -A | grep netd_service            # name collision ≠ legitimacy; check ppid
# ENS lookups from a TV box:
tcpdump -i wlan0 'port 443 and host rpc.ankr.com'  # (or any ETH RPC provider)
# and the boring one that still works:
nmap -p 5555 <tv-subnet>             # ADB should never face anything
```

For network defenders facing the flood itself: the Chrome-fingerprint HTTP/2 means rate-limiting on UA or header shape is dead. What survives is behavior at session level, connection churn ratios, per-source request pacing that doesn't match Chrome's actual patterns, and upstream scrubbing that does statistical modeling instead of signature matching. Budget accordingly; your CDN's "bot detection" is probably UA-based.

Unit 42's closing advice is the right baseline: treat Android TV boxes as untrusted and segment them away from anything you care about. The IoT lesson never changes, only the malware gets more professional. This one ships product management. The next one will ship customer support. The defense stays the same boring thing that was true in 2016: exposed ADB is a botnet enrollment form, and your network is full of them.