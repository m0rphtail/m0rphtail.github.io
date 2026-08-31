+++
title = "Kimwolf v7: An Android Botnet That Fakes Chrome to Hide Its DDoS"
date = "2026-09-26"
+++

# Kimwolf v7: An Android Botnet That Fakes Chrome to Hide Its DDoS

Palo Alto Networks Unit 42 found a new version of the Kimwolf/AISURU botnet in February 2026, and the headline feature is a DDoS flood that looks like a browser. Kimwolf v7 adds an HTTP/2-based flood that constructs complete Google Chrome fingerprints, making attack traffic difficult to distinguish from legitimate browsing.

## The Botnet

Kimwolf targets Android TV boxes since August 2025, while its Linux counterpart, AISURU, focuses on Linux IoT devices. The botnet has been active since at least mid-2024. It typically abuses residential proxy services to reach Android TVs that ship with Android Debug Bridge enabled on port 5555 on local networks, then installs malware capable of DDoS attacks and acting as a relay for malicious traffic.

Once launched, the malware masks itself as legitimate Android system processes like `netd_service` to fly under the radar.

## What's New in v7

The new version's features are a study in operational hardening:

- HTTP/2 flood attacks powered by the nghttp2 library, disguising traffic by constructing Google Chrome browser fingerprints that mirror legitimate browser behavior at the protocol and header level
- C2 resolution through Ethereum Name Service, using legitimate public Ethereum RPC services to query ENS domain records
- A backup C2 mechanism using a hardcoded Tor .onion hidden service
- A local proxy architecture routing all C2 traffic through `127.0.0[.]1:23075`, whether headed to clearnet or Tor
- A high-performance UDP flood function targeting ARM processors found in Android TV boxes
- All DDoS attack commands consolidated to 15 numbered methods, down from 43 text-named methods in prior versions

The removal of scanning, exploitation, and brute-force functionality is the most interesting change. The operators have split the propagation pipeline from the core payload, offloading initial access to an external loader while the Kimwolf binary handles DDoS and proxy relay. That is a modular architecture, and it means the botnet's core can be updated without touching the delivery mechanism.

## The Evolution

Unit 42 also identified eight Android APK artifacts distributed between October and December 2025, masquerading as a system service called SystemService, probing for root access, and executing a bundled ELF kernel payload inside.

The earliest dropped sample targeted x86 with a Dirty COW exploit, which suggests the family evolved from traditional Linux exploitation toward the current ADB-based Android propagation model. The transition from `libn[redacted]kernel.so` to the less conspicuous `libdevice.so` filename in November 2025, followed by a revert in December, shows the operators actively iterating on evasion.

## The Blue Team Read

The Chrome-fingerprint DDoS is the detail that matters most. Traditional DDoS detection relies on traffic that looks different from legitimate browsing: odd user agents, missing headers, unusual protocol behavior. Kimwolf v7 removes those signals. The attack traffic is HTTP/2 with complete browser fingerprints, which means the detection has to move from "does this look like a browser" to "is this volume of browser-like traffic normal for this network."

For defenders, the signals are:

- Android TV boxes with ADB exposed on port 5555, which should never be the case
- Devices running processes named `netd_service` or similar system masquerades
- Local proxy traffic on `127.0.0.1:23075` from unexpected processes
- ENS lookups from IoT devices, which have no business resolving blockchain domains
- HTTP/2 flood patterns from residential IPs

The deeper lesson is about the IoT attack surface. Android TV boxes ship with ADB enabled, sit on home networks, and never get updated. They are the new router botnet. The same story, default-exposed services and no patching, keeps producing the same outcome, and the botnets keep getting better at hiding.