+++
title = "SPECTRE: The Cross-Platform Implant With a Rootkit and a Driver"
date = "2026-08-20"
+++

Cisco Talos published an analysis of the UAT-10147 toolkit, centered on SPECTRE, a cross-platform backdoor written in C. The malware features Bring Your Own Vulnerable Driver (BYOVD) capabilities on Windows and pairs with a custom kernel rootkit on Linux. The operators, tracked as Chinese-speaking threat actors, monetize compromised infrastructure through search engine optimization (SEO) fraud.

## Windows variant

SPECTRE's Windows build derives from the Havoc post-exploitation framework and incorporates several defense evasion techniques:

### Dynamic API resolution via PEB walking

The binary avoids static imports in its Import Address Table (IAT). At runtime, it resolves functions by walking the Process Environment Block (PEB) and hashing module names using a variant of the DJB2 algorithm.

### String encryption with xorshift32

Sensitive strings are encrypted at compile time using individual 32-bit seeds. The binary decrypts strings into thread-local storage only when required, preventing static signature matching across `.text` or `.rdata` sections.

### Evasion scoring and ADS storage

An anti-analysis routine evaluates execution environments against a weighted scoring system, checking CPU core counts, available RAM, process blacklists, and sleep-acceleration artifacts. Exceeding a score threshold causes the process to exit immediately.

The C2 configuration can be stored in an NTFS Alternate Data Stream (ADS) at `C:\Windows\System32\drivers\etc\hosts:cache`. Modifying the stream updates the C2 target without altering the main executable.

The command set includes 45 routines (24 plaintext, 21 encrypted), covering token impersonation, memory injection (`earlybird`, `hollow`), and driver manipulation. The BYOVD module loads known vulnerable signed drivers (`RTCore64.sys` or `DBUtil_2_3.sys`) to disable endpoint detection and response (EDR) processes from kernel mode.

## Linux variant and the Specter rootkit

On Linux, SPECTRE pairs with a kernel rootkit called Specter. Code comments and structure analyzed by Talos indicate that components of the rootkit were drafted using LLM-assisted generation tools, producing functional kernel modules deployed in production campaigns.

## Infrastructure and operational context

UAT-10147 compromises internet-facing IIS and Linux web servers to execute SEO poisoning, redirecting site visitors based on browser language settings. The campaign uses several tools:

- BadIIS web shells compiled with PDB strings referencing developer alias "xshen", authenticated using an `X-ID` HTTP header.
- QuasarRAT and Gh0stCringe payloads delivered through Go loaders.
- Privilege escalation tools such as GodPotato and JuicyPotato.

## Defensive monitoring

Defenders managing Windows environments should monitor kernel driver load events. Because known vulnerable drivers like RTCore64 and DBUtil retain valid signatures, signature verification alone is insufficient. Enforcing Microsoft's Vulnerable Driver Blocklist or deploying explicit WDAC policies blocks these drivers before they load.

On Linux hosts, monitoring module insertions (`init_module` and `finit_module`) provides early warning against kernel rootkits like Specter attempting to hide processes and network connections.
