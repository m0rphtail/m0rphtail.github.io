+++
title = "SPECTRE: The Cross-Platform Implant With a Rootkit and a Driver"
date = "2026-08-20"
+++

The centerpiece of the UAT-10147 toolkit analysis from August is SPECTRE, a C-based cross-platform backdoor that reads like a checklist of everything commodity malware has learned in the last five years. Windows version with BYOVD EDR killing, Linux version with a kernel rootkit, and both with anti-analysis that makes static detection mostly pointless. The actor behind it is Chinese-speaking, monetizing through SEO fraud, and there are signs that parts of the rootkit were written with AI assistance.

## The Windows side

SPECTRE's Windows variant is a Havoc-derived implant with the interesting parts compiled in. Two defenses stand out:

**Runtime API resolution via PEB hash walking** with a DJB2 variant. No imports to grep, no IAT to parse. Every API address is resolved at runtime by walking the process environment block and hashing module names.

**Per-string xorshift32 encryption.** Sensitive strings are encrypted at compile time with unique 32-bit seeds, decrypted into thread-local storage right before use, and never exist in plaintext in `.text` or `.rdata`. Static signatures on strings are dead against this.

The anti-sandbox routine is a weighted scoring system: process name blocklists, RAM capacity, CPU core count, disk space, sleep acceleration detection, known sandbox hostnames and usernames. Score 50 or more and the process self-terminates.

The C2 config can live in an NTFS Alternate Data Stream at `C:\Windows\System32\drivers\etc\hosts:cache`. The operator updates the C2 by editing the ADS, no recompile, and firewall blocklists on the old domain become useless.

The command set is 45 deep. 24 plaintext, 21 encrypted. The encrypted ones are the interesting ones: `inject`, `s-nject`, `getsystem`, `steal_token`, `make_token`, `earlybird`, `hollow`, `keylog_*`, `hashdump`, `chromedump`, `execute_assembly`, `vaultdump`, and the BYOVD family: `byovd_load`, `byovd_unload`, `edr_kill`, `callbacks`, `proc_hide`, `byovd_verify`, `auto_protect`. The BYOVD pair loads RTCore64 or DBUtil, the two most abused vulnerable drivers in existence, to kill EDR processes from kernel mode.

## The Linux side

The Linux variant pairs with a custom rootkit called Specter. Talos's analysis of recovered source suggests portions of the rootkit development incorporated AI-assisted code generation. That's the detail that matters for the next five years: the barrier to writing a kernel rootkit just dropped, and the code quality is good enough to ship in a real campaign.

## The operational context

UAT-10147 targets internet-facing IIS and Linux servers, and the monetization is SEO fraud: hijack sites, redirect traffic by browser language, serve fake pages. The BadIIS samples carry PDB paths with the developer's handle, "x神" (xshen), and the web shell authenticates via an `X-ID` HTTP header carrying a token, blending control traffic into routine HTTP.

The tooling spread is the story: custom SPECTRE, the Specter rootkit, BadIIS, QuasarRAT with a campaign ID containing a derogatory string about Vietnamese elderly, Gh0stCringe embedded as shellcode in a custom Go loader, plus open-source LPE tools like GodPotato and juicypotato. A full ecosystem, some custom, some borrowed, all orchestrated.

## What I'd flag

The BYOVD pattern is the part I'd flag for anyone running Windows servers. RTCore64 and DBUtil have been signed, abused, revoked, and abused again for years, and they're still the go-to for killing EDR. If your EDR doesn't monitor driver loads, it can be turned off by a driver that Microsoft already knows about. The detection is driver-load telemetry, not malware signatures.

The AI-assisted rootkit is the part I'd flag for everyone else. Talos's assessment is careful — portions of the code suggest AI assistance — but the direction is clear. The same LLM that helps me write detection queries is helping someone write kernel rootkits. The asymmetry isn't in the tools anymore, it's in who's using them and how fast they iterate. SPECTRE is what that looks like when it ships.
